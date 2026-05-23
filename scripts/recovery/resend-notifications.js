// EMERGENCY RECOVERY TOOL — re-send OTONAMI curator-review notification emails
// for the given pitch IDs. SEND-ONLY: this script performs NO database writes.
//
// ⚠️ BEFORE USE:
//   - SENDS REAL EMAIL via Resend. Double-check the pitch IDs and that the
//     pitches' artist_email recipients are correct before running.
//   - The HTML/text template below is a COPY of the dashboard-route
//     notification (app/api/curator/dashboard/route.js, as of commit 5eced46).
//     Verify it still matches before relying on the rendered output.
//   - This tool intentionally does NOT touch the DB. If you ever extend it to
//     write, add an id-based + "IS NULL"/state guard (see the responded_at
//     backfill pattern) so a bad filter cannot clobber rows.
//
// Usage (env from .env.production.local):
//   RESEND_API_KEY=... NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   EMAIL_FROM=... NEXT_PUBLIC_APP_URL=... \
//   node scripts/recovery/resend-notifications.js <pitchId> [pitchId ...]

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://otonami.io').trim();

const PITCH_IDS = process.argv.slice(2);

function escapeHtml(input) {
  if (input == null) return '';
  return String(input)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function buildHtml(d) {
  const sc = { accepted: '✓ Accepted', declined: 'Declined', feedback: 'Feedback' };
  const statusLabel = sc[d.status] || d.status;
  const safeCuratorName = escapeHtml(d.curator_name || 'A curator');
  const safeSubject = escapeHtml(d.subject || '');
  const safeFeedback = escapeHtml(d.feedback_message);
  const safeUrl = escapeHtml(d.placement_url);
  return `
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
      ${safeUrl ? `<div style="background:rgba(14,165,233,0.08);border:1px solid rgba(14,165,233,0.25);border-radius:10px;padding:14px 18px;margin-bottom:16px;"><p style="color:#38bdf8;font-weight:700;margin:0 0 6px;">Your track was featured!</p><a href="${safeUrl}" style="color:#0ea5e9;font-size:13px;">${safeUrl}</a></div>` : ''}
      <div style="text-align:center;margin-top:24px;">
        <a href="${APP_URL}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#7c3aed,#2563eb);border-radius:20px;color:#fff;text-decoration:none;font-weight:700;">View Details →</a>
      </div>
    </div>
  `;
}

function buildText(d) {
  const sc = { accepted: '✓ Accepted', declined: 'Declined', feedback: 'Feedback' };
  const statusLabel = sc[d.status] || d.status;
  return `${d.curator_name || 'A curator'} responded to your pitch "${d.subject || ''}".\n\nStatus: ${statusLabel}${d.feedback_message ? `\n\nFeedback: ${d.feedback_message}` : ''}${d.placement_url ? `\n\nPlacement: ${d.placement_url}` : ''}\n\nView details: ${APP_URL}\n\nOTONAMI — Connecting Japanese Artists with the World`;
}

(async () => {
  if (!SUPABASE_URL || !SERVICE_KEY || !RESEND_API_KEY) {
    console.error('Missing env (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / RESEND_API_KEY)');
    process.exit(1);
  }
  if (PITCH_IDS.length === 0) {
    console.error('Usage: node scripts/recovery/resend-notifications.js <pitchId> [pitchId ...]');
    process.exit(1);
  }
  for (const id of PITCH_IDS) {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/pitches?id=eq.${id}&select=id,curator_name,subject,artist_email,status,feedback_message,placement_url,placement_platform`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
    );
    const rows = await r.json();
    const d = Array.isArray(rows) ? rows[0] : null;
    if (!d) { console.error(`pitch ${id}: NOT FOUND`); continue; }
    if (!d.artist_email) { console.error(`pitch ${id}: no artist_email — skip`); continue; }

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `OTONAMI <${FROM}>`,
        to: [d.artist_email],
        reply_to: 'info@otonami.io',
        subject: `OTONAMI — ${d.curator_name || 'A curator'} responded to your pitch`,
        html: buildHtml(d),
        text: buildText(d),
        headers: { 'List-Unsubscribe': '<mailto:info@otonami.io?subject=unsubscribe>' },
      }),
    });
    const body = await resp.json();
    if (!resp.ok || body.error) {
      console.error(`pitch ${id} -> ${d.artist_email}: ERROR http=${resp.status} ${JSON.stringify(body)}`);
    } else {
      console.log(`pitch ${id} -> ${d.artist_email}: SENT resend_id=${body.id} (status=${d.status})`);
    }
  }
})();
