export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { jwtVerify } from 'jose';
import { Resend } from 'resend';

const resend  = new Resend(process.env.RESEND_API_KEY || 'placeholder');
const FROM    = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://otonami.io';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-otonami-secret-change-me'
);

async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

async function getAuthCurator(request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const payload = await verifyToken(auth.slice(7));
  if (!payload) return null;
  return payload;
}

// GET /api/curator/dashboard — キュレーター宛のピッチ一覧
export async function GET(request) {
  try {
    const curator = await getAuthCurator(request);
    if (!curator) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getServiceSupabase();

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('status');

    // curator_id OR curator_name でマッチ（シードキュレーターIDずれ対策）
    const cId = String(curator.id || '').trim();
    const cName = String(curator.name || '').trim();
    const orFilter = `curator_id.eq.${cId},curator_name.eq.${cName}`;
    console.log(`[dashboard] orFilter="${orFilter}"`);

    let query = db
      .from('pitches')
      .select('*')
      .or(orFilter)
      .order('created_at', { ascending: false })
      .limit(100);

    if (filter && filter !== 'all') {
      query = query.eq('status', filter);
    } else {
      query = query.neq('status', 'draft');
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    console.log(`[dashboard] curatorId=${curator.id} name=${curator.name} pitchCount=${data?.length ?? 0}`);

    return NextResponse.json({ pitches: data || [] });
  } catch (error) {
    console.error('[dashboard] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/curator/dashboard — ピッチを承認 or 却下
export async function PATCH(request) {
  try {
    const curator = await getAuthCurator(request);
    if (!curator) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pitchId, status, feedback_message, placement_platform, placement_url, placement_date } = await request.json();

    if (!pitchId || !['accepted', 'rejected', 'feedback', 'sent'].includes(status)) {
      return NextResponse.json(
        { error: 'pitchId and valid status required' },
        { status: 400 }
      );
    }

    const db = getServiceSupabase();

    const updates = { status };
    if (feedback_message) updates.feedback_message = feedback_message;
    if (status === 'accepted' && placement_url) {
      updates.placement_url = placement_url;
      if (placement_platform) updates.placement_platform = placement_platform;
      if (placement_date) updates.placement_date = placement_date;
    }

    // まず curator_id で試みる
    let { data, error } = await db
      .from('pitches')
      .update(updates)
      .eq('id', pitchId)
      .eq('curator_id', curator.id)
      .select('*')
      .single();

    // curator_id でヒットしなかった場合は curator_name でフォールバック
    if (!data && curator.name) {
      const res2 = await db
        .from('pitches')
        .update(updates)
        .eq('id', pitchId)
        .eq('curator_name', curator.name)
        .select('*')
        .single();
      data  = res2.data;
      error = res2.error;
    }

    if (error) throw new Error(error.message);
    if (!data) {
      return NextResponse.json({ error: 'Pitch not found or not authorized' }, { status: 404 });
    }

    // アーティストへの通知メール（失敗してもレスポンスには影響しない）
    if (data.artist_email) {
      const sc = { accepted: '✅ Accepted', rejected: '❌ Declined', feedback: '💬 Feedback' };
      const statusLabel = sc[status] || status;
      resend.emails.send({
        from: `OTONAMI <${FROM}>`,
        to: [data.artist_email],
        subject: `OTONAMI — ${data.curator_name || 'A curator'} responded to your pitch`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0a0a18;color:#fff;padding:32px;border-radius:16px;">
            <div style="text-align:center;margin-bottom:24px;">
              <span style="font-size:24px;font-weight:900;color:#a78bfa;letter-spacing:2px;">OTONAMI</span>
            </div>
            <h2 style="font-size:18px;margin:0 0 8px;">${data.curator_name || 'A curator'} responded to your pitch!</h2>
            <p style="color:#888;font-size:13px;margin:0 0 20px;">${data.subject || ''}</p>
            <div style="background:#13132a;border-radius:10px;padding:14px 18px;margin-bottom:16px;text-align:center;">
              <span style="font-size:16px;font-weight:800;">${statusLabel}</span>
            </div>
            ${data.feedback_message ? `<div style="background:#13132a;border-radius:10px;padding:14px 18px;margin-bottom:16px;color:#ccc;font-size:14px;line-height:1.7;">${data.feedback_message}</div>` : ''}
            ${data.placement_url ? `<div style="background:rgba(14,165,233,0.08);border:1px solid rgba(14,165,233,0.25);border-radius:10px;padding:14px 18px;margin-bottom:16px;"><p style="color:#38bdf8;font-weight:700;margin:0 0 6px;">🎉 Your track was featured!</p><a href="${data.placement_url}" style="color:#0ea5e9;font-size:13px;">${data.placement_url}</a></div>` : ''}
            <div style="text-align:center;margin-top:24px;">
              <a href="${APP_URL}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#7c3aed,#2563eb);border-radius:20px;color:#fff;text-decoration:none;font-weight:700;">View Details →</a>
            </div>
          </div>
        `,
      }).catch(e => console.error('[dashboard] Notification email error:', e.message));
    }

    return NextResponse.json({ success: true, pitch: { id: data.id, status: data.status } });
  } catch (error) {
    console.error('[dashboard] PATCH error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
