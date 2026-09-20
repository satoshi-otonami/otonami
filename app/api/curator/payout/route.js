export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { PAYOUT_REQUEST_THRESHOLD, hasPaymentInfo } from '@/lib/payout';
import { jwtVerify } from 'jose';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 'placeholder');
const FROM = `OTONAMI <${process.env.EMAIL_FROM || 'info@otonami.io'}>`;
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://otonami.io').trim();
const testMode = process.env.EMAIL_TEST_MODE === 'true';
const safeEmail = process.env.EMAIL_TEST_REDIRECT || 'satoshiy339@gmail.com';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-otonami-secret-change-me'
);

async function getAuthCurator(request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const { payload } = await jwtVerify(auth.slice(7), JWT_SECRET);
    return payload;
  } catch { return null; }
}

// POST: Create payout request
export async function POST(request) {
  try {
    const curator = await getAuthCurator(request);
    if (!curator) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getServiceSupabase();
    const curatorId = curator.id;

    // Get curator details
    const { data: curatorData, error: curatorError } = await db
      .from('curators')
      .select('id, name, email, payment_method, payment_info')
      .eq('id', curatorId)
      .single();

    if (curatorError) {
      console.error('[payout] curator lookup failed:', curatorError.message);
      return NextResponse.json({ error: curatorError.message }, { status: 500 });
    }
    if (!curatorData) return NextResponse.json({ error: 'Curator not found' }, { status: 404 });

    const paymentMethod = curatorData.payment_method || 'paypal';
    // Every method needs a destination on file — bank transfer included. It used
    // to be exempt, which would have handed the admin a payout row with nowhere
    // to send the money.
    if (!hasPaymentInfo(curatorData)) {
      return NextResponse.json({
        error: 'Your payment details are not registered yet. Add them in your dashboard profile before requesting a payout. / 支払い先情報が未登録です。ダッシュボードのプロフィールから登録してください。',
      }, { status: 400 });
    }
    const paymentInfo = curatorData.payment_info.trim();

    // Check for existing pending payout
    const { data: existingPayout } = await db
      .from('payouts')
      .select('id')
      .eq('curator_id', curatorId)
      .eq('status', 'requested')
      .limit(1)
      .single();

    if (existingPayout) {
      return NextResponse.json({ error: 'すでに支払いリクエストが処理中です。' }, { status: 400 });
    }

    // Calculate available balance
    const { data: approvedEarnings } = await db
      .from('curator_earnings')
      .select('id, amount')
      .eq('curator_id', curatorId)
      .eq('status', 'approved');

    const availableBalance = (approvedEarnings || []).reduce((sum, e) => sum + (e.amount || 0), 0);
    const minimumPayout = PAYOUT_REQUEST_THRESHOLD;

    if (availableBalance < minimumPayout) {
      return NextResponse.json({
        error: `最低支払い額（¥${minimumPayout.toLocaleString()}）に達していません。現在の残高: ¥${availableBalance.toLocaleString()}`,
      }, { status: 400 });
    }

    // Create payout record
    const { data: payout, error: payoutError } = await db
      .from('payouts')
      .insert({
        curator_id: curatorId,
        amount: availableBalance,
        currency: 'JPY',
        method: paymentMethod,
        status: 'requested',
        // Snapshot of where the money goes as of the request, so a later profile
        // edit cannot rewrite the destination of a payout already in flight.
        payment_info: paymentInfo,
      })
      .select()
      .single();

    if (payoutError) throw new Error(payoutError.message);

    // Update earnings status to paid.
    //
    // The payout row is already in. If these earnings do not actually flip to
    // paid, they stay in availableBalance, and once the payout is marked
    // completed the "already requested" guard above stops blocking — so the
    // same money can be requested a second time. A silent miss here is a
    // double-payment window, which is why the result is checked on both counts
    // (error, and row count / amount) and nothing is emailed until it holds.
    const earningIds = (approvedEarnings || []).map(e => e.id);
    if (earningIds.length > 0) {
      const { data: paidRows, error: paidError } = await db
        .from('curator_earnings')
        .update({ status: 'paid', payout_id: payout.id, paid_at: new Date().toISOString() })
        .in('id', earningIds)
        .select('id, amount');

      const paidCount = (paidRows || []).length;
      const paidTotal = (paidRows || []).reduce((sum, e) => sum + (e.amount || 0), 0);
      const mismatch = paidCount !== earningIds.length || paidTotal !== payout.amount;

      if (paidError || mismatch) {
        console.error('[payout] earnings paid-update failed — rolling back payout', {
          payout_id: payout.id,
          curator_id: curatorId,
          expected_count: earningIds.length,
          expected_amount: payout.amount,
          updated_count: paidCount,
          updated_amount: paidTotal,
          reason: paidError?.message || 'row count / amount mismatch',
        });

        // Put back any row that did flip, so a partial update cannot strand
        // earnings as paid against a payout that never happens. Scoped by
        // payout_id, which only this request's rows carry.
        if (paidCount > 0) {
          const { error: revertError } = await db
            .from('curator_earnings')
            .update({ status: 'approved', payout_id: null, paid_at: null })
            .eq('payout_id', payout.id);
          if (revertError) {
            console.error('[payout] earnings revert failed:', revertError.message, { payout_id: payout.id });
          }
        }

        // Drop the payout row so the curator can retry. Nothing references
        // payouts.id by FK (curator_earnings.payout_id is a bare UUID column).
        const { error: rollbackError } = await db.from('payouts').delete().eq('id', payout.id);
        if (rollbackError) {
          console.error('[payout] payout rollback failed:', rollbackError.message, { payout_id: payout.id });
        }

        return NextResponse.json({ error: 'payout_recording_failed' }, { status: 500 });
      }
    }

    // Send admin notification
    try {
      await resend.emails.send({
        from: FROM,
        to: testMode ? safeEmail : 'info@otonami.io',
        replyTo: 'info@otonami.io',
        subject: (testMode ? '[TEST] ' : '') + `【OTONAMI】支払いリクエスト: ${curatorData.name} ¥${availableBalance.toLocaleString()}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:#c4956a;">支払いリクエスト通知</h2>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:8px;color:#666;">キュレーター</td><td style="padding:8px;font-weight:bold;">${curatorData.name}</td></tr>
              <tr style="background:#f9f9f9;"><td style="padding:8px;color:#666;">金額</td><td style="padding:8px;font-weight:bold;">¥${availableBalance.toLocaleString()}</td></tr>
              <tr><td style="padding:8px;color:#666;">支払い方法</td><td style="padding:8px;">${paymentMethod.toUpperCase()}</td></tr>
              <tr style="background:#f9f9f9;"><td style="padding:8px;color:#666;">支払い情報</td><td style="padding:8px;">${paymentInfo}</td></tr>
              <tr><td style="padding:8px;color:#666;">件数</td><td style="padding:8px;">${earningIds.length}件</td></tr>
            </table>
            <p style="margin-top:24px;color:#888;font-size:13px;">
              Supabaseで確認: <a href="https://supabase.com/dashboard/project/jroudvjksouqnmlhzhzr/editor">テーブルを開く</a>
            </p>
          </div>
        `,
        text: `支払いリクエスト\n\nキュレーター: ${curatorData.name}\n金額: ¥${availableBalance.toLocaleString()}\n支払い方法: ${paymentMethod}\n支払い情報: ${paymentInfo}\n件数: ${earningIds.length}件`,
      });
    } catch (e) { console.error('Payout admin email failed:', e); }

    // Send confirmation to curator
    try {
      const curatorTo = testMode ? safeEmail : curatorData.email;
      await resend.emails.send({
        from: FROM,
        to: curatorTo,
        replyTo: 'info@otonami.io',
        subject: (testMode ? `[TEST] (→${curatorData.email}) ` : '') + 'OTONAMI — 支払いリクエストを受け付けました / Payout Request Received',
        html: `
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
            <h1 style="font-size:28px;text-align:center;color:#1a1a1a;margin-bottom:32px;">OTONAMI</h1>
            <h2 style="font-size:20px;color:#1a1a1a;">支払いリクエストを受け付けました</h2>
            <p style="color:#6b6560;font-size:15px;line-height:1.7;">
              ¥${availableBalance.toLocaleString()} の支払いリクエストを受け付けました。<br/>
              通常3〜5営業日以内にお支払いします。
            </p>
            <div style="background:#f8f7f4;border-radius:12px;padding:20px;margin:24px 0;">
              <p style="font-size:14px;color:#1a1a1a;margin:0 0 8px;"><strong>金額:</strong> ¥${availableBalance.toLocaleString()}</p>
              <p style="font-size:14px;color:#1a1a1a;margin:0;"><strong>支払い方法:</strong> ${paymentMethod.toUpperCase()} — ${paymentInfo}</p>
            </div>
            <hr style="border:none;border-top:1px solid #e5e2dc;margin:32px 0;" />
            <p style="color:#9b9590;font-size:14px;line-height:1.7;">Your payout request of ¥${availableBalance.toLocaleString()} has been received. Payment will be processed within 3-5 business days.</p>
          </div>
        `,
        text: `支払いリクエストを受け付けました\n\n金額: ¥${availableBalance.toLocaleString()}\n支払い方法: ${paymentMethod} — ${paymentInfo}\n\n通常3〜5営業日以内にお支払いします。`,
      });
    } catch (e) { console.error('Payout confirmation email failed:', e); }

    return NextResponse.json({ success: true, payout });
  } catch (e) {
    console.error('Payout API error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET: Payout history
export async function GET(request) {
  try {
    const curator = await getAuthCurator(request);
    if (!curator) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getServiceSupabase();

    const { data: payouts } = await db
      .from('payouts')
      .select('*')
      .eq('curator_id', curator.id)
      .order('requested_at', { ascending: false })
      .limit(20);

    return NextResponse.json({ payouts: payouts || [] });
  } catch (e) {
    console.error('Payout GET error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
