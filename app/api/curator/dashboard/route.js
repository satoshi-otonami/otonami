export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { jwtVerify } from 'jose';
import { Resend } from 'resend';
import { escapeHtml } from '@/lib/html-escape';
import { normalizePlacementUrl } from '@/lib/url-normalize';

const resend  = new Resend(process.env.RESEND_API_KEY || 'placeholder');
const FROM    = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://otonami.io').trim();

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

    const cId = String(curator.id || '').trim();
    if (!cId) {
      return NextResponse.json({ pitches: [] });
    }

    let query = db
      .from('pitches')
      .select('*')
      .eq('curator_id', cId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (filter && filter !== 'all') {
      query = query.eq('status', filter);
    } else {
      query = query.neq('status', 'draft');
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    console.log(`[dashboard] curatorId=${cId} pitchCount=${data?.length ?? 0}`);

    // Merge linked track ai_status (so curator UI can show human-made / AI-assisted badge)
    let pitchesWithAi = data || [];
    const trackIds = pitchesWithAi.map(p => p.track_id).filter(Boolean);
    if (trackIds.length > 0) {
      const { data: tracks } = await db
        .from('artist_tracks')
        .select('id, ai_status')
        .in('id', trackIds);
      const aiMap = new Map((tracks || []).map(t => [t.id, t.ai_status]));
      pitchesWithAi = pitchesWithAi.map(p => ({
        ...p,
        track_ai_status: p.track_id ? (aiMap.get(p.track_id) || null) : null,
      }));
    }

    return NextResponse.json({ pitches: pitchesWithAi });
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

    if (!pitchId || !['accepted', 'declined', 'feedback', 'sent'].includes(status)) {
      return NextResponse.json(
        { error: 'pitchId and valid status required' },
        { status: 400 }
      );
    }

    // Normalize curator-supplied placement URL (handles iframe embed paste,
    // rejects non-http(s) values, canonicalizes Spotify /embed/* links)
    let normalizedPlacementUrl;
    try {
      normalizedPlacementUrl = normalizePlacementUrl(placement_url);
    } catch {
      return NextResponse.json(
        { error: 'placement_url must be a valid http(s) URL or Spotify embed code' },
        { status: 400 }
      );
    }

    const db = getServiceSupabase();
    const now = new Date().toISOString();

    // 1. ピッチを取得
    const { data: existingPitch } = await db
      .from('pitches')
      .select('id, curator_id')
      .eq('id', pitchId)
      .single();

    if (!existingPitch) {
      return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });
    }

    // 2. 認可チェック: JWTのcurator IDで照合
    const cId = String(curator.id || '').trim();
    const pCuratorId = String(existingPitch.curator_id || '').trim();

    if (!cId || cId !== pCuratorId) {
      console.error(`[dashboard] PATCH auth failed: curator id=${cId} vs pitch curator_id=${pCuratorId}`);
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // 3. 認可済み — 更新
    const updates = { status };
    if (feedback_message) updates.feedback_message = feedback_message;
    if (status === 'accepted' && normalizedPlacementUrl) {
      updates.placement_url = normalizedPlacementUrl;
      if (placement_platform) updates.placement_platform = placement_platform;
      if (placement_date) updates.placement_date = placement_date;
    }
    let { data, error } = await db
      .from('pitches')
      .update(updates)
      .eq('id', pitchId)
      .select('*')
      .single();

    if (error) {
      console.error(`[dashboard] PATCH update error for pitch ${pitchId}:`, error.message);
      throw new Error(error.message);
    }
    if (!data) {
      return NextResponse.json({ error: 'Pitch not found or not authorized' }, { status: 404 });
    }

    // responded_at を別途更新
    if (['accepted', 'declined', 'feedback'].includes(status)) {
      const { error: respError } = await db
        .from('pitches')
        .update({ responded_at: now })
        .eq('id', data.id);
      if (respError) {
        console.error(`[dashboard] responded_at update failed:`, respError.message);
      } else {
        data.responded_at = now;
      }
    }

    // ── 報酬レコード作成（フィードバック提供時）──
    if (['accepted', 'declined', 'feedback'].includes(status) && feedback_message) {
      try {
        // Check if earnings already exist for this pitch+curator to prevent duplicates
        const { data: existingEarning } = await db
          .from('curator_earnings')
          .select('id')
          .eq('pitch_id', pitchId)
          .eq('curator_id', cId)
          .maybeSingle();

        if (!existingEarning) {
          // Get curator tier (the single source of truth for credits)
          const { data: curatorInfo } = await db
            .from('curators')
            .select('tier')
            .eq('id', cId)
            .maybeSingle();

          const credits = curatorInfo?.tier || 2;
          // Revenue: tier × ¥160 × 0.5 — flat rate across all review outcomes
          // (accepted / declined / feedback). Curators are paid for reviewing,
          // not for the decision.
          const creditPrice = 160;
          const rate = 0.5;
          const totalAmount = Math.round(credits * creditPrice * rate);

          const { error: earningError } = await db.from('curator_earnings').insert({
            curator_id: cId,
            pitch_id: pitchId,
            credits_earned: credits,
            amount: totalAmount,
            currency: 'JPY',
            status: 'approved',
          });

          if (earningError) {
            console.error('[dashboard] Earning insert error:', earningError);
          }
        }
      } catch (earningsErr) {
        console.warn('[dashboard] Earnings insert failed (non-fatal):', earningsErr.message);
      }
    }

    // アーティストへの通知メール（失敗してもレスポンスには影響しない）
    if (data.artist_email) {
      const sc = { accepted: '✓ Accepted', declined: 'Declined', feedback: 'Feedback' };
      const statusLabel = sc[status] || status;

      // Look up the curator's contact details so the artist can reply directly —
      // mirror of the pitch-send email, which routes replies straight to the artist.
      let curatorEmail = null;
      let curatorContactUrl = null;
      try {
        const { data: curatorRow } = await db
          .from('curators')
          .select('email, url')
          .eq('id', pCuratorId)
          .maybeSingle();
        curatorEmail = curatorRow?.email?.trim() || null;
        if (curatorRow?.url && /^https?:\/\//i.test(curatorRow.url)) {
          curatorContactUrl = curatorRow.url.trim();
        }
      } catch (e) {
        console.warn('[dashboard] Curator contact lookup failed (non-fatal):', e?.message);
      }

      // Escape DB-stored / curator-supplied values before HTML interpolation
      const safeCuratorName = escapeHtml(data.curator_name || 'A curator');
      const safeSubject = escapeHtml(data.subject || '');
      const safeFeedback = escapeHtml(data.feedback_message);
      const safeUrl = escapeHtml(data.placement_url);
      const safeCuratorEmail = escapeHtml(curatorEmail);
      const safeCuratorContactUrl = escapeHtml(curatorContactUrl);
      try {
        const { data: emailResult, error: emailError } = await resend.emails.send({
        from: `OTONAMI <${FROM}>`,
        to: [data.artist_email],
        reply_to: curatorEmail || 'info@otonami.io',
        subject: `OTONAMI — ${data.curator_name || 'A curator'} responded to your pitch`,
        text: `${data.curator_name || 'A curator'} responded to your pitch "${data.subject || ''}".\n\nStatus: ${statusLabel}${data.feedback_message ? `\n\nFeedback: ${data.feedback_message}` : ''}${data.placement_url ? `\n\nPlacement: ${data.placement_url}` : ''}${curatorEmail ? `\n\nReply directly to ${data.curator_name || 'the curator'}: ${curatorEmail}` : ''}${curatorContactUrl ? `\nContact: ${curatorContactUrl}` : ''}\n\nView details: ${APP_URL}\n\nOTONAMI — Connecting Japanese Artists with the World`,
        headers: {
          'List-Unsubscribe': '<mailto:info@otonami.io?subject=unsubscribe>',
        },
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0a0a18;color:#fff;padding:32px;border-radius:16px;">
            <div style="text-align:center;margin-bottom:24px;">
              <span style="font-size:24px;font-weight:900;color:#a78bfa;letter-spacing:2px;">OTONAMI</span>
            </div>
            <h2 style="font-size:18px;margin:0 0 8px;">${safeCuratorName} responded to your pitch!</h2>
            <p style="color:#888;font-size:13px;margin:0 0 20px;">${safeSubject}</p>
            <div style="background:#13132a;border-radius:10px;padding:14px 18px;margin-bottom:16px;text-align:center;">
              <span style="font-size:16px;font-weight:800;">${statusLabel}</span>
            </div>
            ${safeFeedback ? `<div style="background:#13132a;border-radius:10px;padding:14px 18px;margin-bottom:16px;color:#ccc;font-size:14px;line-height:1.7;">${safeFeedback}</div>` : ''}
            ${safeUrl ? `<div style="background:rgba(14,165,233,0.08);border:1px solid rgba(14,165,233,0.25);border-radius:10px;padding:14px 18px;margin-bottom:16px;"><p style="color:#38bdf8;font-weight:700;margin:0 0 6px;">Your pitch was accepted! / ピッチが承認されました！</p><p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0 0 8px;">The curator plans to add your track to this playlist:<br>キュレーターがプレイリストへの追加を予定しています:</p><a href="${safeUrl}" style="color:#0ea5e9;font-size:13px;">${safeUrl}</a><p style="color:#64748b;font-size:12px;line-height:1.6;margin:10px 0 0;">It may take some time to appear on the playlist. / 反映までに時間がかかることがあります。</p></div>` : ''}
            ${(safeCuratorEmail || safeCuratorContactUrl) ? `<div style="background:#13132a;border:1px solid #1e1e3a;border-radius:10px;padding:14px 18px;margin-bottom:16px;"><div style="color:#a78bfa;font-size:11px;font-weight:700;letter-spacing:1px;margin-bottom:8px;">REPLY DIRECTLY / 直接返信</div>${safeCuratorEmail ? `<div style="color:#ccc;font-size:14px;line-height:1.7;">Reply directly to ${safeCuratorName}: <a href="mailto:${safeCuratorEmail}" style="color:#FF6B4A;text-decoration:underline;">${safeCuratorEmail}</a></div>` : ''}${safeCuratorContactUrl ? `<div style="color:#ccc;font-size:13px;line-height:1.7;margin-top:6px;">Contact: <a href="${safeCuratorContactUrl}" style="color:#FF6B4A;text-decoration:underline;word-break:break-all;">${safeCuratorContactUrl}</a></div>` : ''}</div>` : ''}
            <div style="text-align:center;margin-top:24px;">
              <a href="${APP_URL}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#7c3aed,#2563eb);border-radius:20px;color:#fff;text-decoration:none;font-weight:700;">View Details →</a>
            </div>
          </div>
        `,
        });
        if (emailError) {
          console.error('[dashboard] Notification email error:', emailError);
        } else {
          console.log(`[dashboard] Notification sent to ${data.artist_email} resend_id=${emailResult?.id}`);
        }
      } catch (e) {
        console.error('[dashboard] Notification email exception:', e.message);
      }
    }

    return NextResponse.json({ success: true, pitch: { id: data.id, status: data.status } });
  } catch (error) {
    console.error('[dashboard] PATCH error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
