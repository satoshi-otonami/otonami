/**
 * Curator-facing payout threshold notices.
 *
 * Two stages, both keyed off the curator's approved balance:
 *   5000  — the request button is now live in the dashboard
 *   10000 — OTONAMI pays out without a request, notified in advance
 *
 * Each stage fires once per curator, ever (de-duplicated through email_log the
 * same way pitch reminders are). The send path is lib/payout-threshold.js; the
 * default export renders the exact HTML that path delivers so `npm run
 * email:dev` cannot drift from what is actually sent.
 *
 * English only, no emoji, plain-text login URL — matching the curator-facing
 * copy elsewhere in the product.
 */

import { escapeHtml } from '@/lib/html-escape';
import { PAYOUT_REQUEST_THRESHOLD, PAYOUT_AUTO_THRESHOLD } from '@/lib/payout';

const APP_URL = () => (process.env.NEXT_PUBLIC_APP_URL || 'https://otonami.io').trim();

const yen = (n) => `JPY ${Number(n || 0).toLocaleString('en-US')}`;

export function payoutThresholdSubject({ stage }) {
  return stage === 'auto'
    ? `Your OTONAMI balance reached ${yen(PAYOUT_AUTO_THRESHOLD)} — payout on the way`
    : `Your OTONAMI balance reached ${yen(PAYOUT_REQUEST_THRESHOLD)} — you can request a payout`;
}

// The paragraphs each stage says, in order. Shared by the HTML and text builders
// so the two can never say different things.
function bodyLines({ stage, balance, hasPaymentInfo }) {
  const infoMissing = hasPaymentInfo === false;
  const lines = [];
  if (stage === 'auto') {
    lines.push(`Your balance is now ${yen(balance)}.`);
    if (infoMissing) {
      // The auto stage pays without a request, but it cannot pay to nowhere.
      // Promising "the payment follows in 3 to 5 business days" to a curator
      // with no destination on file would announce money that cannot move.
      lines.push(`At ${yen(PAYOUT_AUTO_THRESHOLD)} we pay out without waiting for a request. Before we can send it we need somewhere to send it to, and we do not have your payment details on file yet. Open your dashboard profile and add your PayPal address, Wise account, or bank transfer details. Until they are registered your balance simply carries over, so nothing is lost.`);
    } else {
      lines.push(`At ${yen(PAYOUT_AUTO_THRESHOLD)} we pay out without waiting for a request, so there is nothing you need to do. This message is the advance notice; the payment typically follows within 3 to 5 business days.`);
    }
    return lines;
  }
  lines.push(`Your balance is now ${yen(balance)}.`);
  lines.push(`At ${yen(PAYOUT_REQUEST_THRESHOLD)} you can request a payout yourself. The button is in your dashboard under Earnings. Requested payouts are processed within 3 to 5 business days via your registered payment method.`);
  lines.push(`If you would rather wait, nothing is lost. Your balance keeps accumulating, and once it reaches ${yen(PAYOUT_AUTO_THRESHOLD)} we pay it out without a request.`);
  if (infoMissing) {
    lines.push('One thing first: we do not have your payment details on file yet. Open your dashboard profile and add your PayPal address, Wise account, or bank transfer details. Until they are registered your balance simply carries over.');
  }
  return lines;
}

// One definition for both builders, so the button and the plain-text line can
// never disagree about what the reader is being asked to do.
function ctaLabel({ stage, hasPaymentInfo }) {
  return stage === 'auto' || hasPaymentInfo === false ? 'Open your dashboard' : 'Request a payout';
}

export function payoutThresholdHtml({ curatorName, stage, balance, hasPaymentInfo }) {
  const name = escapeHtml(curatorName) || 'there';
  const loginUrl = `${APP_URL()}/curator/login`;
  const cta = ctaLabel({ stage, hasPaymentInfo });
  const paras = bodyLines({ stage, balance, hasPaymentInfo })
    .map((l) => `<p style="color:#6b6560;font-size:15px;line-height:1.7;margin:0 0 16px;">${escapeHtml(l)}</p>`)
    .join('');

  return `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
      <h1 style="font-size:28px;text-align:center;color:#1a1a1a;margin-bottom:8px;">OTONAMI</h1>
      <h2 style="font-size:20px;color:#1a1a1a;margin-top:32px;">Hi ${name},</h2>
      ${paras}
      <div style="background:#f8f7f4;border-radius:12px;padding:20px;margin:24px 0;">
        <p style="font-size:14px;color:#1a1a1a;margin:0;"><strong>Current balance:</strong> ${yen(balance)}</p>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="${loginUrl}" style="background:#c4956a;color:#fff;padding:14px 40px;border-radius:9999px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">${cta}</a>
      </div>
      <p style="color:#9b9590;font-size:13px;line-height:1.7;margin:0 0 4px;">If the button does not work, open this address:</p>
      <p style="color:#9b9590;font-size:13px;line-height:1.7;margin:0;word-break:break-all;">${escapeHtml(loginUrl)}</p>
      <hr style="border:none;border-top:1px solid #e5e2dc;margin:32px 0;" />
      <p style="color:#9b9590;font-size:12px;line-height:1.7;margin:0;">Questions? Reply to this email and it reaches the OTONAMI team.</p>
    </div>
  `;
}

export function payoutThresholdText({ curatorName, stage, balance, hasPaymentInfo }) {
  const name = curatorName || 'there';
  const loginUrl = `${APP_URL()}/curator/login`;
  const cta = ctaLabel({ stage, hasPaymentInfo });
  return `Hi ${name},

${bodyLines({ stage, balance, hasPaymentInfo }).join('\n\n')}

Current balance: ${yen(balance)}

${cta}: ${loginUrl}

Questions? Reply to this email and it reaches the OTONAMI team.`;
}

// ── Preview only (npm run email:dev) ──────────────────────────────────────
const SAMPLE = {
  curatorName: 'Claudio Todesco',
  stage: 'request',
  balance: 5120,
  hasPaymentInfo: true,
};

export function PayoutThreshold(props = SAMPLE) {
  // Renders the exact HTML the notifier sends, so the preview cannot drift.
  return <div dangerouslySetInnerHTML={{ __html: payoutThresholdHtml(props) }} />;
}

export default PayoutThreshold;
