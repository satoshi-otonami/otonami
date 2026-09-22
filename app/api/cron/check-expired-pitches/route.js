import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { escapeHtml } from '@/lib/html-escape';
import { PITCH_FIELDS, claimPitch, finalizeRefund } from '@/lib/pitch-expiry';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY || 'placeholder');
const FROM = `OTONAMI <${process.env.EMAIL_FROM || 'info@otonami.io'}>`;
const EMAIL_TEST_MODE = process.env.EMAIL_TEST_MODE === 'true';
const EMAIL_TEST_REDIRECT = process.env.EMAIL_TEST_REDIRECT || 'satoshiy339@gmail.com';

// Bilingual (JA/EN), emoji-free refund notification. Sent only when credits
// were actually returned (credits_charged > 0). Layout mirrors the existing
// artist welcome email (light theme) for visual consistency.
function refundEmailHtml({ artistName, curatorName, credits, newBalance }) {
  const nameJa = escapeHtml(artistName) || 'アーティスト';
  const nameEn = escapeHtml(artistName) || 'there';
  const curatorJa = escapeHtml(curatorName) || 'キュレーター';
  const curatorEn = escapeHtml(curatorName) || 'the curator';
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://otonami.io').trim();
  const balanceJa = newBalance != null
    ? `<p style="color:#6b6560;font-size:15px;line-height:1.7;margin:0 0 4px;">現在の残高は <strong>${newBalance}</strong> クレジットです。</p>`
    : '';
  const balanceEn = newBalance != null
    ? `<p style="color:#9b9590;font-size:14px;line-height:1.7;margin:0 0 4px;">Your current balance is <strong>${newBalance}</strong> credits.</p>`
    : '';
  return `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
      <h1 style="font-size:28px;text-align:center;color:#1a1a1a;margin-bottom:8px;">OTONAMI</h1>
      <h2 style="font-size:20px;color:#1a1a1a;margin-top:32px;">${nameJa} 様</h2>
      <p style="color:#6b6560;font-size:15px;line-height:1.7;margin:0 0 16px;">OTONAMI事務局です。<br/>${curatorJa} さんへのピッチについて、7日間の回答期限内にご返答がありませんでした。</p>
      <p style="color:#6b6560;font-size:15px;line-height:1.7;margin:0 0 8px;">OTONAMIの7日間回答保証に基づき、<strong>${credits}</strong> クレジットを返還いたしました。ご確認・再ピッチはダッシュボードから行っていただけます。</p>
      ${balanceJa}
      <div style="text-align:center;margin:28px 0;">
        <a href="${appUrl}/artist/dashboard" style="background:#c4956a;color:#fff;padding:14px 40px;border-radius:9999px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">ダッシュボードへ →</a>
      </div>
      <p style="color:#6b6560;font-size:14px;line-height:1.7;margin:0;">今後ともよろしくお願いいたします。<br/>OTONAMI事務局</p>
      <hr style="border:none;border-top:1px solid #e5e2dc;margin:32px 0;" />
      <h2 style="font-size:17px;color:#9b9590;">Hi ${nameEn},</h2>
      <p style="color:#9b9590;font-size:14px;line-height:1.7;margin:0 0 14px;">This is the OTONAMI team. Your pitch to ${curatorEn} did not receive a response within the 7-day window.</p>
      <p style="color:#9b9590;font-size:14px;line-height:1.7;margin:0 0 8px;">Under OTONAMI's 7-day response guarantee, we have returned <strong>${credits}</strong> credit(s) to your account. You can review or re-pitch from your dashboard.</p>
      ${balanceEn}
      <p style="text-align:center;color:#9b9590;font-size:12px;margin-top:28px;">Questions? Reply to this email. ご質問はこのメールに返信してください。</p>
    </div>
  `;
}

function refundEmailText({ artistName, curatorName, credits, newBalance }) {
  const nameJa = artistName || 'アーティスト';
  const nameEn = artistName || 'there';
  const curatorJa = curatorName || 'キュレーター';
  const curatorEn = curatorName || 'the curator';
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://otonami.io').trim();
  const balJa = newBalance != null ? `現在の残高は ${newBalance} クレジットです。\n` : '';
  const balEn = newBalance != null ? `Your current balance is ${newBalance} credits.\n` : '';
  return `${nameJa} 様\n\nOTONAMI事務局です。${curatorJa} さんへのピッチについて、7日間の回答期限内にご返答がありませんでした。\nOTONAMIの7日間回答保証に基づき、${credits} クレジットを返還いたしました。\n${balJa}ダッシュボード: ${appUrl}/artist/dashboard\n\n---\n\nHi ${nameEn},\n\nYour pitch to ${curatorEn} did not receive a response within the 7-day window. Under OTONAMI's 7-day response guarantee, we have returned ${credits} credit(s) to your account.\n${balEn}Dashboard: ${appUrl}/artist/dashboard`;
}

async function sendRefundEmail({ to, artistName, curatorName, credits, newBalance }) {
  const baseSubject = '回答期限切れにつきクレジットを返還しました / Your OTONAMI pitch expired — credits returned';
  const subject = (EMAIL_TEST_MODE ? `[TEST] (→${to}) ` : '') + baseSubject;
  const recipient = EMAIL_TEST_MODE ? EMAIL_TEST_REDIRECT : to;
  await resend.emails.send({
    from: FROM,
    to: recipient,
    replyTo: 'info@otonami.io',
    subject,
    html: refundEmailHtml({ artistName, curatorName, credits, newBalance }),
    text: refundEmailText({ artistName, curatorName, credits, newBalance }),
  });
}

// Admin alert: pitches that are status='sent' + past deadline yet carry a
// response trace (responded_at / placement_url / feedback_message). These were
// skipped by the refund query's guard and need manual review. One email per run,
// only when ≥1 such row exists. Reuses the existing Resend client — no new deps.
async function sendInconsistencyAlert(rows) {
  const admin = 'satoshiy339@gmail.com';
  const lines = rows.map((r) => {
    const traces = [
      r.responded_at ? 'responded_at' : null,
      r.placement_url ? 'placement_url' : null,
      r.feedback_message ? 'feedback_message' : null,
    ].filter(Boolean).join(', ');
    return `- pitch ${r.id} | artist=${r.artist_email || 'unknown'} | curator=${r.curator_name || 'unknown'} | traces: ${traces}`;
  });
  const body =
    `Detected ${rows.length} pitch(es) with status='sent' past deadline that still carry a response trace ` +
    `(accepted/feedback likely reverted via Undo). These were NOT refunded by the cron guard and need manual review:\n\n` +
    lines.join('\n') +
    `\n\nReview in the DB / curator dashboard before any credit action.`;
  const htmlBody =
    `<p>Detected <strong>${rows.length}</strong> pitch(es) with status='sent' past deadline that still carry a response trace ` +
    `(accepted/feedback likely reverted via Undo). These were <strong>NOT</strong> refunded by the cron guard and need manual review:</p>` +
    `<ul>${rows
      .map((r) => {
        const traces = [
          r.responded_at ? 'responded_at' : null,
          r.placement_url ? 'placement_url' : null,
          r.feedback_message ? 'feedback_message' : null,
        ].filter(Boolean).join(', ');
        return `<li>pitch ${escapeHtml(r.id)} | artist=${escapeHtml(r.artist_email) || 'unknown'} | curator=${escapeHtml(r.curator_name) || 'unknown'} | traces: ${escapeHtml(traces)}</li>`;
      })
      .join('')}</ul>` +
    `<p>Review in the DB / curator dashboard before any credit action.</p>`;
  await resend.emails.send({
    from: FROM,
    to: admin,
    replyTo: 'info@otonami.io',
    subject: '[OTONAMI] Pitch status inconsistency detected',
    html: htmlBody,
    text: body,
  });
}

async function notifyRefund({ pitch, artistId, refundCredits }) {
  if (!pitch.artist_email) return;
  const { data: a } = await supabase
    .from('artists')
    .select('credits')
    .eq('id', artistId)
    .maybeSingle();
  await sendRefundEmail({
    to: pitch.artist_email,
    artistName: pitch.artist_name || null,
    curatorName: pitch.curator_name || null,
    credits: refundCredits,
    newBalance: a?.credits ?? null,
  });
}

export async function GET(request) {
  // Vercel Cron authentication
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const nowIso = new Date().toISOString();

    // Fetch pitches due to expire (sent, past deadline, not yet refunded).
    // GUARD: never expire/refund a pitch that carries any response trace —
    // responded_at / placement_url / feedback_message. A curator "Undo" that
    // reverts status to 'sent' leaves those fields intact, which previously
    // caused an already-accepted pitch to be wrongly expired + refunded
    // (chihiro × Tinnitist, 6/30). Rows matching that shape are surfaced as an
    // admin alert below instead of being processed.
    const { data: expiredPitches, error: fetchError } = await supabase
      .from('pitches')
      .select(PITCH_FIELDS)
      .eq('status', 'sent')
      .is('refunded_at', null)
      .is('responded_at', null)
      .is('placement_url', null)
      .is('feedback_message', null)
      .not('deadline_at', 'is', null)
      .lt('deadline_at', nowIso);

    if (fetchError) throw fetchError;

    // ── Inconsistency detection + admin alert ──────────────────────────────
    // status='sent', past deadline, but has a response trace → should never be
    // refunded. Alert once (only when ≥1 such row exists); never blocks the run.
    try {
      const { data: inconsistent } = await supabase
        .from('pitches')
        .select('id, artist_email, curator_name, responded_at, placement_url, feedback_message')
        .eq('status', 'sent')
        .is('refunded_at', null)
        .not('deadline_at', 'is', null)
        .lt('deadline_at', nowIso)
        .or('responded_at.not.is.null,placement_url.not.is.null,feedback_message.not.is.null');

      if (inconsistent && inconsistent.length > 0) {
        await sendInconsistencyAlert(inconsistent);
      }
    } catch (alertErr) {
      // Non-fatal: alerting must never break refund processing.
      console.error('[cron] inconsistency alert failed:', alertErr?.message || alertErr);
    }

    const results = [];
    const skipped = [];

    // ── Recovery: claimed on an earlier run but never stamped ──────────────
    // status='expired' with refunded_at NULL means a run claimed the pitch and
    // then died before stamping it. The pitch is already closed to curators,
    // so finish the refund now. finalizeRefund's conditional stamp makes this
    // safe to repeat and safe against an overlapping run.
    const { data: stranded, error: strandedError } = await supabase
      .from('pitches')
      .select(PITCH_FIELDS)
      .eq('status', 'expired')
      .is('refunded_at', null);
    if (strandedError) throw strandedError;

    for (const pitch of stranded || []) {
      try {
        const r = await finalizeRefund(supabase, pitch, { onRefunded: notifyRefund });
        if (r) results.push({ ...r, recovered: true });
      } catch (pitchErr) {
        console.error(`[cron] Unexpected error recovering pitch ${pitch.id}:`, pitchErr?.message || pitchErr);
      }
    }

    for (const pitch of expiredPitches || []) {
      try {
        // Claim first: close the pitch to curators before any credit moves.
        if (!(await claimPitch(supabase, pitch.id))) {
          skipped.push(pitch.id);
          continue;
        }
        const r = await finalizeRefund(supabase, pitch, { onRefunded: notifyRefund });
        if (r) results.push(r);
      } catch (pitchErr) {
        console.error(`[cron] Unexpected error processing pitch ${pitch.id}:`, pitchErr?.message || pitchErr);
      }
    }

    if (skipped.length > 0) {
      console.log(`[cron] ${skipped.length} pitch(es) answered before claim — not expired`, skipped);
    }

    console.log(`[cron] Processed ${results.length} expired pitches`, results);

    return Response.json({
      message: `Processed ${results.length} expired pitches`,
      processed: results.length,
      skipped: skipped.length,
      results,
    });
  } catch (error) {
    console.error('[cron] Error processing expired pitches:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
