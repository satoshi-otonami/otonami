// Payout threshold notifications.
//
// Fires when a curator's approved balance crosses JPY 5,000 (they may request a
// payout) or JPY 10,000 (OTONAMI pays out without a request). Called from the
// two places that create curator_earnings rows — app/api/curator/pitch/[id] and
// app/api/curator/dashboard — right after a successful insert.
//
// De-duplication reuses the pitch-reminder pattern: one email_log row per
// (curator, threshold), claimed before the send so a crash mid-flight costs a
// notice rather than sending two. Each threshold fires once per curator, ever.
//
// Nothing here is allowed to break a curator's review response: every path
// returns a result object and the caller ignores it.

import { Resend } from 'resend';
import {
  payoutThresholdSubject,
  payoutThresholdHtml,
  payoutThresholdText,
} from '@/emails/payout-threshold';
import { PAYOUT_REQUEST_THRESHOLD, PAYOUT_AUTO_THRESHOLD, hasPaymentInfo } from '@/lib/payout';
import { isSeedCurator } from '@/lib/curator-visibility';

const resend = new Resend(process.env.RESEND_API_KEY || 'placeholder');
const FROM = `OTONAMI <${process.env.EMAIL_FROM || 'info@otonami.io'}>`;
const ADMIN_TO = 'info@otonami.io';
const EMAIL_TEST_MODE = process.env.EMAIL_TEST_MODE === 'true';
const EMAIL_TEST_REDIRECT = process.env.EMAIL_TEST_REDIRECT || 'satoshiy339@gmail.com';

// email_log.type values. Same shape as reminder_t3 / reminder_t24.
const KIND_REQUEST = `payout_threshold_${PAYOUT_REQUEST_THRESHOLD}`;
const KIND_AUTO = `payout_threshold_${PAYOUT_AUTO_THRESHOLD}`;
const KIND_AUTO_ADMIN = `payout_threshold_${PAYOUT_AUTO_THRESHOLD}_admin`;

// Returns true when this (curator, kind) pair has already been claimed. Errors
// count as "already sent" — without a working de-dupe key a duplicate notice is
// worse than a missing one, so this fails closed.
async function alreadyNotified(db, curatorId, kind) {
  const { data, error } = await db
    .from('email_log')
    .select('id')
    .eq('type', kind)
    .eq('curator_id', curatorId)
    .limit(1);
  if (error) {
    console.warn(`[payout-threshold] email_log lookup failed for ${kind}, skipping send:`, error.message);
    return true;
  }
  return (data || []).length > 0;
}

async function claimAndSend(db, { curatorId, curatorEmail, kind, to, subject, html, text }) {
  const recipient = EMAIL_TEST_MODE ? EMAIL_TEST_REDIRECT : to;

  const { error: claimError } = await db.from('email_log').insert({
    type: kind,
    curator_id: curatorId,
    curator_email: curatorEmail,
    to_email: recipient,
    subject,
    status: 'sending',
  });
  if (claimError) {
    console.warn(`[payout-threshold] email_log claim failed for ${kind}:`, claimError.message);
    return { kind, sent: false, reason: 'claim_failed' };
  }

  // Resend v4 resolves with { data, error } on 4xx instead of throwing.
  const { data: sent, error: sendError } = await resend.emails.send({
    from: FROM,
    to: recipient,
    replyTo: ADMIN_TO,
    subject: EMAIL_TEST_MODE ? `[TEST] (→${to}) ${subject}` : subject,
    html,
    text,
  });

  const settle = sendError
    ? { status: 'failed', error_message: String(sendError.message || sendError) }
    : { status: 'sent', resend_id: sent?.id || null };
  const { error: settleError } = await db
    .from('email_log')
    .update(settle)
    .eq('type', kind)
    .eq('curator_id', curatorId);
  if (settleError) {
    console.warn(`[payout-threshold] email_log settle failed for ${kind} (non-fatal):`, settleError.message);
  }

  if (sendError) {
    console.error(`[payout-threshold] send failed for ${kind}:`, sendError.message || sendError);
    return { kind, sent: false, reason: 'send_failed' };
  }
  return { kind, sent: true };
}

function adminHtml({ curator, balance, infoOnFile }) {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#c4956a;">支払い実行トリガー（¥${PAYOUT_AUTO_THRESHOLD.toLocaleString()}到達）</h2>
      <p style="color:#666;font-size:14px;">リクエストを待たずに当社から支払う対象です。本人には事前通知済み。</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px;color:#666;">キュレーター</td><td style="padding:8px;font-weight:bold;">${curator.name || curator.id}</td></tr>
        <tr style="background:#f9f9f9;"><td style="padding:8px;color:#666;">curator_id</td><td style="padding:8px;">${curator.id}</td></tr>
        <tr><td style="padding:8px;color:#666;">残高</td><td style="padding:8px;font-weight:bold;">¥${balance.toLocaleString()}</td></tr>
        <tr style="background:#f9f9f9;"><td style="padding:8px;color:#666;">支払い方法</td><td style="padding:8px;">${curator.payment_method || '（未設定）'}</td></tr>
        <tr><td style="padding:8px;color:#666;">支払い先</td><td style="padding:8px;">${infoOnFile ? '登録あり' : '<strong style="color:#b91c1c;">未登録 — 登録されるまで繰り越し</strong>'}</td></tr>
      </table>
      <p style="margin-top:24px;color:#888;font-size:13px;">
        送金実行の前に、pitch_id が NULL の curator_earnings（幽霊レコード疑い）が残高に含まれていないか確認すること。
      </p>
    </div>
  `;
}

function adminText({ curator, balance, infoOnFile }) {
  return `支払い実行トリガー（¥${PAYOUT_AUTO_THRESHOLD.toLocaleString()}到達）

キュレーター: ${curator.name || curator.id}
curator_id: ${curator.id}
残高: ¥${balance.toLocaleString()}
支払い方法: ${curator.payment_method || '（未設定）'}
支払い先: ${infoOnFile ? '登録あり' : '未登録 — 登録されるまで繰り越し'}

送金実行の前に、pitch_id が NULL の curator_earnings（幽霊レコード疑い）が残高に含まれていないか確認すること。`;
}

export async function notifyPayoutThresholds(db, curatorId) {
  const results = [];
  try {
    const cId = String(curatorId || '').trim();
    if (!cId) return results;

    const { data: curator, error: curatorError } = await db
      .from('curators')
      .select('id, name, email, payment_method, payment_info, is_seed')
      .eq('id', cId)
      .maybeSingle();
    if (curatorError || !curator) {
      console.warn('[payout-threshold] curator lookup failed:', curatorError?.message || 'not found');
      return results;
    }
    // Seed/staff/test rows are not payees.
    if (isSeedCurator(curator)) return results;
    if (!curator.email) return results;

    const { data: earnings, error: earningsError } = await db
      .from('curator_earnings')
      .select('amount')
      .eq('curator_id', cId)
      .eq('status', 'approved');
    if (earningsError) {
      console.warn('[payout-threshold] balance recompute failed:', earningsError.message);
      return results;
    }
    const balance = (earnings || []).reduce((sum, e) => sum + (e.amount || 0), 0);
    if (balance < PAYOUT_REQUEST_THRESHOLD) return results;

    const infoOnFile = hasPaymentInfo(curator);

    const stages = [
      { kind: KIND_REQUEST, stage: 'request', at: PAYOUT_REQUEST_THRESHOLD },
      { kind: KIND_AUTO, stage: 'auto', at: PAYOUT_AUTO_THRESHOLD },
    ];

    for (const s of stages) {
      if (balance < s.at) continue;
      // A balance that clears both thresholds at once gets the 10,000 notice
      // only — "you can request a payout" contradicts "we are paying you
      // without a request". Nothing is claimed for the skipped stage, so if the
      // balance later resets through a payout and climbs back to 5,000, the
      // request notice fires then.
      if (s.stage === 'request' && balance >= PAYOUT_AUTO_THRESHOLD) continue;
      if (await alreadyNotified(db, cId, s.kind)) {
        results.push({ kind: s.kind, sent: false, reason: 'already_notified' });
        continue;
      }
      const payload = {
        curatorName: curator.name,
        stage: s.stage,
        balance,
        hasPaymentInfo: infoOnFile,
      };
      results.push(await claimAndSend(db, {
        curatorId: cId,
        curatorEmail: curator.email,
        kind: s.kind,
        to: curator.email,
        subject: payoutThresholdSubject(payload),
        html: payoutThresholdHtml(payload),
        text: payoutThresholdText(payload),
      }));
    }

    // Admin execution trigger, keyed separately so a failure on either side does
    // not suppress the other.
    if (balance >= PAYOUT_AUTO_THRESHOLD) {
      if (await alreadyNotified(db, cId, KIND_AUTO_ADMIN)) {
        results.push({ kind: KIND_AUTO_ADMIN, sent: false, reason: 'already_notified' });
      } else {
        const ctx = { curator, balance, infoOnFile };
        results.push(await claimAndSend(db, {
          curatorId: cId,
          curatorEmail: curator.email,
          kind: KIND_AUTO_ADMIN,
          to: ADMIN_TO,
          subject: `【OTONAMI】支払い実行トリガー: ${curator.name || cId} ¥${balance.toLocaleString()}`,
          html: adminHtml(ctx),
          text: adminText(ctx),
        }));
      }
    }
  } catch (e) {
    console.warn('[payout-threshold] notification failed (non-fatal):', e.message);
  }
  return results;
}
