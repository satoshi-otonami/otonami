export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { jwtVerify } from 'jose';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 'placeholder');
const FROM = `OTONAMI <${process.env.EMAIL_FROM || 'info@otonami.io'}>`;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://otonami.vercel.app';
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
    const { data: curatorData } = await db
      .from('curators')
      .select('id, name, email, paypal_email, payout_method, minimum_payout')
      .eq('id', curatorId)
      .single();

    if (!curatorData) return NextResponse.json({ error: 'Curator not found' }, { status: 404 });

    const paypalEmail = curatorData.paypal_email;
    if (!paypalEmail) {
      return NextResponse.json({ error: 'PayPalメールアドレスが設定されていません。プロフィールから設定してください。' }, { status: 400 });
    }

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
    const minimumPayout = curatorData.minimum_payout || 5000;

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
        method: curatorData.payout_method || 'paypal',
        status: 'requested',
        paypal_email: paypalEmail,
      })
      .select()
      .single();

    if (payoutError) throw new Error(payoutError.message);

    // Update earnings status to paid
    const earningIds = (approvedEarnings || []).map(e => e.id);
    if (earningIds.length > 0) {
      await db
        .from('curator_earnings')
        .update({ status: 'paid', payout_id: payout.id, paid_at: new Date().toISOString() })
        .in('id', earningIds);
    }

    // Send admin notification
    try {
      await resend.emails.send({
        from: FROM,
        to: testMode ? safeEmail : 'info@otonami.io',
        reply_to: 'info@otonami.io',
        subject: (testMode ? '[TEST] ' : '') + `【OTONAMI】支払いリクエスト: ${curatorData.name} ¥${availableBalance.toLocaleString()}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:#c4956a;">支払いリクエスト通知</h2>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:8px;color:#666;">キュレーター</td><td style="padding:8px;font-weight:bold;">${curatorData.name}</td></tr>
              <tr style="background:#f9f9f9;"><td style="padding:8px;color:#666;">金額</td><td style="padding:8px;font-weight:bold;">¥${availableBalance.toLocaleString()}</td></tr>
              <tr><td style="padding:8px;color:#666;">支払い方法</td><td style="padding:8px;">PayPal</td></tr>
              <tr style="background:#f9f9f9;"><td style="padding:8px;color:#666;">PayPalメール</td><td style="padding:8px;">${paypalEmail}</td></tr>
              <tr><td style="padding:8px;color:#666;">件数</td><td style="padding:8px;">${earningIds.length}件</td></tr>
            </table>
            <p style="margin-top:24px;color:#888;font-size:13px;">
              Supabaseで確認: <a href="https://supabase.com/dashboard/project/jygnerjbzjvdyyjucqbd/editor">テーブルを開く</a>
            </p>
          </div>
        `,
        text: `支払いリクエスト\n\nキュレーター: ${curatorData.name}\n金額: ¥${availableBalance.toLocaleString()}\nPayPal: ${paypalEmail}\n件数: ${earningIds.length}件`,
      });
    } catch (e) { console.error('Payout admin email failed:', e); }

    // Send confirmation to curator
    try {
      const curatorTo = testMode ? safeEmail : curatorData.email;
      await resend.emails.send({
        from: FROM,
        to: curatorTo,
        reply_to: 'info@otonami.io',
        subject: (testMode ? `[TEST] (→${curatorData.email}) ` : '') + 'OTONAMI — 支払いリクエストを受け付けました / Payout Request Received',
        html: `
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
            <h1 style="font-size:28px;text-align:center;color:#1a1a1a;margin-bottom:32px;">OTONAMI</h1>
            <h2 style="font-size:20px;color:#1a1a1a;">支払いリクエストを受け付けました</h2>
            <p style="color:#6b6560;font-size:15px;line-height:1.7;">
              ¥${availableBalance.toLocaleString()} の支払いリクエストを受け付けました。<br/>
              通常3〜5営業日以内にPayPalにお支払いします。
            </p>
            <div style="background:#f8f7f4;border-radius:12px;padding:20px;margin:24px 0;">
              <p style="font-size:14px;color:#1a1a1a;margin:0 0 8px;"><strong>金額:</strong> ¥${availableBalance.toLocaleString()}</p>
              <p style="font-size:14px;color:#1a1a1a;margin:0;"><strong>PayPal:</strong> ${paypalEmail}</p>
            </div>
            <hr style="border:none;border-top:1px solid #e5e2dc;margin:32px 0;" />
            <p style="color:#9b9590;font-size:14px;line-height:1.7;">Your payout request of ¥${availableBalance.toLocaleString()} has been received. Payment will be processed within 3-5 business days via PayPal.</p>
          </div>
        `,
        text: `支払いリクエストを受け付けました\n\n金額: ¥${availableBalance.toLocaleString()}\nPayPal: ${paypalEmail}\n\n通常3〜5営業日以内にお支払いします。`,
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
