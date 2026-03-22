export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { jwtVerify } from 'jose';
import { Resend } from 'resend';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-otonami-secret-change-me'
);
const resend = new Resend(process.env.RESEND_API_KEY || 'placeholder');
const FROM   = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://otonami.io';

async function getAuthCurator(request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const { payload } = await jwtVerify(auth.slice(7), JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

// ── アーティストへのフィードバック通知メール ──
async function sendFeedbackNotification(pitch) {
  const artistEmail = pitch.artist_email;
  if (!artistEmail) {
    console.log('[pitch-detail] No artist_email — skipping notification');
    return;
  }

  const curatorName  = pitch.curator_name || 'A curator';
  const subject      = pitch.subject || 'your pitch';
  const status       = pitch.status;

  const statusConfig = {
    accepted: { label: '✅ Accepted / 承認されました', color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: '#10b981' },
    declined: { label: '❌ Declined / 見送りとなりました', color: '#ef4444', bg: 'rgba(239,68,68,0.10)', border: '#ef4444' },
    feedback: { label: '💬 Feedback / フィードバック受信', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: '#a78bfa' },
  };
  const sc = statusConfig[status] || statusConfig.feedback;

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;color:#334155;background:#0a0a18;border-radius:16px;overflow:hidden;">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#7c3aed,#2563eb);padding:28px 32px;text-align:center;">
        <span style="font-size:26px;font-weight:900;color:#fff;letter-spacing:3px;">OTONAMI</span>
      </div>

      <!-- Body -->
      <div style="padding:32px;">
        <h2 style="color:#fff;font-size:20px;font-weight:800;margin:0 0 8px;">
          ${curatorName} responded to your pitch!
        </h2>
        <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">
          ${curatorName}があなたのピッチに返信しました
        </p>

        <!-- Subject -->
        <div style="background:#13132a;border:1px solid #1e1e3a;border-radius:10px;padding:12px 16px;margin-bottom:20px;">
          <div style="color:#555;font-size:11px;font-weight:700;letter-spacing:1px;margin-bottom:4px;">PITCH</div>
          <div style="color:#ccc;font-size:14px;">${subject}</div>
        </div>

        <!-- Status badge -->
        <div style="background:${sc.bg};border:1px solid ${sc.border}44;border-radius:10px;padding:14px 18px;margin-bottom:20px;text-align:center;">
          <span style="color:${sc.color};font-size:16px;font-weight:800;">${sc.label}</span>
        </div>

        ${pitch.feedback_message ? `
        <!-- Feedback message -->
        <div style="background:#13132a;border:1px solid #1e1e3a;border-radius:10px;padding:16px 18px;margin-bottom:20px;">
          <div style="color:#555;font-size:11px;font-weight:700;letter-spacing:1px;margin-bottom:8px;">FEEDBACK / フィードバック</div>
          <div style="color:#ccc;font-size:14px;line-height:1.7;">${pitch.feedback_message}</div>
        </div>
        ` : ''}

        ${pitch.placement_url ? `
        <!-- Placement info -->
        <div style="background:rgba(14,165,233,0.08);border:1px solid rgba(14,165,233,0.25);border-radius:10px;padding:16px 18px;margin-bottom:20px;">
          <div style="color:#38bdf8;font-size:13px;font-weight:800;margin-bottom:8px;">
            🎉 Your track was featured! / あなたの楽曲が紹介されました！
          </div>
          ${pitch.placement_platform ? `<div style="color:#94a3b8;font-size:12px;margin-bottom:6px;">Platform: <strong style="color:#38bdf8;">${pitch.placement_platform}</strong></div>` : ''}
          <a href="${pitch.placement_url}" style="color:#0ea5e9;font-size:13px;word-break:break-all;">${pitch.placement_url}</a>
        </div>
        ` : ''}

        <!-- CTA -->
        <div style="text-align:center;margin-top:28px;">
          <a href="${APP_URL}" style="display:inline-block;padding:13px 32px;background:linear-gradient(135deg,#7c3aed,#2563eb);border-radius:24px;color:#fff;text-decoration:none;font-weight:700;font-size:15px;">
            View Details / 詳細を見る →
          </a>
        </div>

        <!-- Footer -->
        <p style="color:#334155;font-size:12px;text-align:center;margin-top:28px;line-height:1.6;">
          Sent via <a href="${APP_URL}" style="color:#7c3aed;text-decoration:none;">OTONAMI</a> — Connecting Japanese Artists with the World
        </p>
      </div>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: `OTONAMI <${FROM}>`,
      to: [artistEmail],
      reply_to: 'info@otonami.io',
      subject: `OTONAMI — ${curatorName} responded to your pitch "${subject}"`,
      html,
      text: `${curatorName} responded to your pitch "${subject}".\n\nStatus: ${sc.label}\n${pitch.feedback_message ? `\nFeedback: ${pitch.feedback_message}\n` : ''}${pitch.placement_url ? `\nPlacement: ${pitch.placement_url}\n` : ''}\nView details: ${APP_URL}\n\nOTONAMI — Connecting Japanese Artists with the World`,
      headers: {
        'List-Unsubscribe': '<mailto:info@otonami.io?subject=unsubscribe>',
      },
    });
    if (error) {
      console.error('[pitch-detail] Notification email error:', error);
    } else {
      console.log(`[pitch-detail] Notification sent to ${artistEmail} resend_id=${data?.id}`);
    }
  } catch (e) {
    console.error('[pitch-detail] Notification email exception:', e.message);
  }
}

// GET /api/curator/pitch/[id] — 単一ピッチ取得（自分宛のもののみ）
export async function GET(request, { params }) {
  const curator = await getAuthCurator(request);
  if (!curator) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getServiceSupabase();
  const pitchId = params.id;

  // curator_id OR curator_name でマッチ
  const cId = String(curator.id || '').trim();
  const cName = String(curator.name || '').trim();
  const orFilter = `curator_id.eq.${cId},curator_name.eq.${cName}`;
  console.log(`[pitch-detail] GET pitchId=${pitchId} orFilter="${orFilter}"`);

  const { data, error } = await db
    .from('pitches')
    .select('*')
    .eq('id', pitchId)
    .or(orFilter)
    .single();

  console.log(`[pitch-detail] result: found=${!!data} error=${error?.message ?? 'none'}`);

  if (error || !data) {
    return NextResponse.json({ error: 'Pitch not found or not authorized' }, { status: 404 });
  }

  return NextResponse.json({ pitch: data });
}

// PATCH /api/curator/pitch/[id] — フィードバック送信
export async function PATCH(request, { params }) {
  const curator = await getAuthCurator(request);
  if (!curator) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { status, feedback_message, placement_platform, placement_url, placement_date } = body;

  const db = getServiceSupabase();
  const pitchId = params.id;
  const now = new Date().toISOString();

  if (!['accepted', 'declined', 'feedback', 'sent'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const updates = { status };
  if (feedback_message) updates.feedback_message = feedback_message;
  if (status === 'accepted' && placement_url) {
    updates.placement_url = placement_url;
    if (placement_platform) updates.placement_platform = placement_platform;
    if (placement_date) updates.placement_date = placement_date;
  }
  // feedback_at は別途更新（column が存在しない場合でもメイン更新を妨げないように分離）

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

  if (error) {
    console.error(`[pitch-detail] PATCH update error for pitch ${pitchId}:`, error.message, 'curator_id:', curator.id, 'curator_name:', curator.name);
    return NextResponse.json({ error: 'Pitch not found or not authorized' }, { status: 404 });
  }
  if (!data) {
    console.error(`[pitch-detail] PATCH no data returned for pitch ${pitchId} — curator_id: ${curator.id} curator_name: ${curator.name}`);
    return NextResponse.json({ error: 'Pitch not found or not authorized' }, { status: 404 });
  }

  // feedback_at を別途更新（column が存在しない場合もメイン更新は成功済み）
  if (['accepted', 'declined', 'feedback'].includes(status)) {
    const { error: fatError } = await db
      .from('pitches')
      .update({ feedback_at: now })
      .eq('id', data.id);
    if (fatError) {
      console.warn(`[pitch-detail] feedback_at update failed (column may not exist):`, fatError.message);
    } else {
      data.feedback_at = now;
    }
  }

  // アーティストへの通知メール（失敗してもレスポンスには影響しない）
  await sendFeedbackNotification(data);

  return NextResponse.json({ success: true, pitch: { id: data.id, status: data.status } });
}
