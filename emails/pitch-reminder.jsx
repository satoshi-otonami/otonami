/**
 * Curator-facing pre-deadline reminder.
 *
 * One email per curator per stage — never one per pitch. A curator sitting on
 * three pitches gets a single message that says three, because three separate
 * emails is what makes people stop opening them.
 *
 * Two stages, both keyed off pitches.deadline_at so the 7-day and 14-day
 * response windows are handled by the same code:
 *   t3   — 48–72h remaining
 *   t24  — 24h or less remaining
 *
 * The send path (app/api/cron/pitch-reminders/route.js) uses the string
 * builders below; the default export renders that exact HTML so
 * `npm run email:dev` can never drift from what is actually delivered.
 *
 * English only, no emoji, plain-text login URL — matching the curator-facing
 * copy elsewhere in the product.
 */

import { escapeHtml } from '@/lib/html-escape';

const APP_URL = () => (process.env.NEXT_PUBLIC_APP_URL || 'https://otonami.io').trim();

// "less than 24 hours" / "about 2 days" / "about 3 days" — deliberately coarse.
// An exact countdown in an email is stale by the time it is read.
export function timeLeftLabel(hoursLeft) {
  if (!(hoursLeft > 0)) return 'less than 24 hours';
  if (hoursLeft <= 24) return 'less than 24 hours';
  const days = Math.ceil(hoursLeft / 24);
  return days === 1 ? 'about 1 day' : `about ${days} days`;
}

export function pitchReminderSubject({ count, hoursLeft }) {
  const what = count === 1 ? 'A pitch is' : `${count} pitches are`;
  return `${what} waiting for your review — ${timeLeftLabel(hoursLeft)} left`;
}

function itemLines(items) {
  return items.map((it) => {
    const artist = it.artistName || 'An artist';
    const title = it.subject ? ` — ${it.subject}` : '';
    return `${artist}${title} (${timeLeftLabel(it.hoursLeft)} left)`;
  });
}

export function pitchReminderHtml({ curatorName, count, hoursLeft, items = [] }) {
  const name = escapeHtml(curatorName) || 'there';
  const appUrl = APP_URL();
  const loginUrl = `${appUrl}/curator/login`;
  const nearest = timeLeftLabel(hoursLeft);
  const subjectLine = count === 1
    ? 'One pitch is waiting for your review.'
    : `${count} pitches are waiting for your review.`;
  const list = items.length
    ? `<ul style="color:#6b6560;font-size:14px;line-height:1.8;margin:0 0 20px;padding-left:20px;">${
        itemLines(items).map((l) => `<li>${escapeHtml(l)}</li>`).join('')
      }</ul>`
    : '';

  return `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
      <h1 style="font-size:28px;text-align:center;color:#1a1a1a;margin-bottom:8px;">OTONAMI</h1>
      <h2 style="font-size:20px;color:#1a1a1a;margin-top:32px;">Hi ${name},</h2>
      <p style="color:#6b6560;font-size:15px;line-height:1.7;margin:0 0 16px;">${subjectLine} The closest one is due in <strong>${nearest}</strong>.</p>
      ${list}
      <p style="color:#6b6560;font-size:15px;line-height:1.7;margin:0 0 16px;">You are paid the same for <strong>any</strong> response — accept, decline, or feedback — as long as you leave a short message with it. A decline with a line about why is a real review, and it is genuinely useful to the artist. There is no reward for the decision itself, only for the reviewing.</p>
      <p style="color:#6b6560;font-size:15px;line-height:1.7;margin:0 0 20px;">Once the deadline passes, the pitch is returned to the artist automatically and the reward for it is gone.</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${loginUrl}" style="background:#c4956a;color:#fff;padding:14px 40px;border-radius:9999px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">Review your pitches</a>
      </div>
      <p style="color:#9b9590;font-size:13px;line-height:1.7;margin:0 0 4px;">If the button does not work, open this address:</p>
      <p style="color:#9b9590;font-size:13px;line-height:1.7;margin:0;word-break:break-all;">${escapeHtml(loginUrl)}</p>
      <hr style="border:none;border-top:1px solid #e5e2dc;margin:32px 0;" />
      <p style="color:#9b9590;font-size:12px;line-height:1.7;margin:0;">Questions? Reply to this email and it reaches the OTONAMI team.</p>
    </div>
  `;
}

export function pitchReminderText({ curatorName, count, hoursLeft, items = [] }) {
  const name = curatorName || 'there';
  const loginUrl = `${APP_URL()}/curator/login`;
  const head = count === 1
    ? 'One pitch is waiting for your review.'
    : `${count} pitches are waiting for your review.`;
  const list = items.length ? `\n${itemLines(items).map((l) => `- ${l}`).join('\n')}\n` : '';
  return `Hi ${name},

${head} The closest one is due in ${timeLeftLabel(hoursLeft)}.
${list}
You are paid the same for any response — accept, decline, or feedback — as long as you leave a short message with it. A decline with a line about why is a real review, and it is genuinely useful to the artist. There is no reward for the decision itself, only for the reviewing.

Once the deadline passes, the pitch is returned to the artist automatically and the reward for it is gone.

Review your pitches: ${loginUrl}

Questions? Reply to this email and it reaches the OTONAMI team.`;
}

// ── Preview only (npm run email:dev) ──────────────────────────────────────
const SAMPLE = {
  curatorName: 'Claudio Todesco',
  count: 2,
  hoursLeft: 20,
  items: [
    { artistName: 'Happy Days', subject: 'Pitch: Moonlight', hoursLeft: 20 },
    { artistName: 'ROUTE14band', subject: 'Pitch: Route 14', hoursLeft: 23 },
  ],
};

export function PitchReminder(props = SAMPLE) {
  // Renders the exact HTML the cron sends, so the preview cannot drift.
  return <div dangerouslySetInnerHTML={{ __html: pitchReminderHtml(props) }} />;
}

export default PitchReminder;
