import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { isSeedCurator } from '@/lib/curator-visibility';
import {
  pitchReminderHtml,
  pitchReminderText,
  pitchReminderSubject,
} from '@/emails/pitch-reminder';

// ── Pre-deadline pitch reminders (daily) ────────────────────────────────────
// 104 of 164 pitches expired unanswered while the curators who do respond
// answer in a median 1.74 days. The gap is attention, not willingness, so this
// nudges before the window closes rather than after.
//
// Two stages, both derived from pitches.deadline_at (so the 7-day and 14-day
// response windows need no special-casing):
//   reminder_t3   48h < remaining <= 72h
//   reminder_t24        remaining <= 24h
// Bands, not exact points: the job runs once a day and the trigger time drifts,
// so a "exactly 72h" test would silently skip pitches.
//
// One email per curator per stage — never one per pitch.

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY || 'placeholder');
const FROM = `OTONAMI <${process.env.EMAIL_FROM || 'info@otonami.io'}>`;
const EMAIL_TEST_MODE = process.env.EMAIL_TEST_MODE === 'true';
const EMAIL_TEST_REDIRECT = process.env.EMAIL_TEST_REDIRECT || 'satoshiy339@gmail.com';

const HOUR = 60 * 60 * 1000;
const KIND_T3 = 'reminder_t3';
const KIND_T24 = 'reminder_t24';

// email_log columns this route needs for de-duplication. app/api/email/route.js
// already writes these names, but they do not exist on the table yet — which is
// why email_log has 0 rows despite 164 pitches (that insert has been failing
// silently since it was written). Until the ALTER lands, this route refuses to
// send rather than risk duplicate reminders.
const DEDUPE_COLUMNS = ['pitch_id', 'type'];
const DEDUPE_SETUP_SQL =
  'ALTER TABLE email_log ADD COLUMN IF NOT EXISTS pitch_id text, ' +
  'ADD COLUMN IF NOT EXISTS type text, ' +
  'ADD COLUMN IF NOT EXISTS to_email text, ' +
  'ADD COLUMN IF NOT EXISTS resend_id text;';

function classify(hoursLeft) {
  if (hoursLeft <= 0) return null;              // already past due — the expiry cron owns it
  if (hoursLeft <= 24) return KIND_T24;
  if (hoursLeft > 48 && hoursLeft <= 72) return KIND_T3;
  return null;                                  // 24–48h: the quiet gap between stages
}

// Returns { ok: true } when email_log can hold the de-dupe key, otherwise
// { ok: false, reason } — never throws.
async function checkDedupeReady() {
  const { error } = await supabase
    .from('email_log')
    .select(DEDUPE_COLUMNS.join(','))
    .limit(1);
  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

async function alreadyReminded(pitchIds, kind) {
  const { data, error } = await supabase
    .from('email_log')
    .select('pitch_id')
    .eq('type', kind)
    .in('pitch_id', pitchIds);
  if (error) throw new Error(`email_log lookup failed: ${error.message}`);
  return new Set((data || []).map((r) => r.pitch_id));
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get('dry') === '1';

  try {
    const now = Date.now();
    const horizon = new Date(now + 72 * HOUR).toISOString();
    const nowIso = new Date(now).toISOString();

    // Same response-trace guard the expiry cron uses: a curator "Undo" leaves
    // status='sent' on a pitch that was actually answered. Reminding on those
    // would nag someone who already did the work.
    const { data: rows, error: fetchError } = await supabase
      .from('pitches')
      .select('id, artist_name, subject, deadline_at, curator_id, curator_name, curators(name, email, is_seed)')
      .eq('status', 'sent')
      .is('refunded_at', null)
      .is('responded_at', null)
      .is('placement_url', null)
      .is('feedback_message', null)
      .not('deadline_at', 'is', null)
      .gt('deadline_at', nowIso)
      .lte('deadline_at', horizon);

    if (fetchError) throw fetchError;

    // Bucket by curator + stage.
    const buckets = new Map();   // `${curatorId}|${kind}` -> { curator, kind, items[] }
    const skipped = { no_band: 0, seed_curator: 0, no_email: 0 };

    for (const p of rows || []) {
      const hoursLeft = (new Date(p.deadline_at).getTime() - now) / HOUR;
      const kind = classify(hoursLeft);
      if (!kind) { skipped.no_band += 1; continue; }
      if (isSeedCurator(p.curators)) { skipped.seed_curator += 1; continue; }
      const to = p.curators?.email;
      if (!to) { skipped.no_email += 1; continue; }

      const key = `${p.curator_id}|${kind}`;
      const bucket = buckets.get(key) || {
        curatorId: p.curator_id,
        curatorName: p.curators?.name || p.curator_name || null,
        to,
        kind,
        items: [],
      };
      bucket.items.push({
        pitchId: p.id,
        artistName: p.artist_name,
        subject: p.subject,
        hoursLeft,
      });
      buckets.set(key, bucket);
    }

    for (const b of buckets.values()) {
      b.items.sort((a, c) => a.hoursLeft - c.hoursLeft);
      b.hoursLeft = b.items[0].hoursLeft;         // nearest deadline drives the copy
    }

    const dedupe = await checkDedupeReady();

    // ── Dry run: report the targets, touch nothing ──────────────────────────
    if (dryRun) {
      return Response.json({
        dry_run: true,
        now: nowIso,
        candidates_in_72h: (rows || []).length,
        skipped,
        dedupe_ready: dedupe.ok,
        dedupe_blocker: dedupe.ok ? null : dedupe.reason,
        dedupe_setup_sql: dedupe.ok ? null : DEDUPE_SETUP_SQL,
        emails_that_would_send: buckets.size,
        targets: [...buckets.values()].map((b) => ({
          curator_id: b.curatorId,
          curator_name: b.curatorName,
          to: b.to,
          kind: b.kind,
          pitch_count: b.items.length,
          hours_left_nearest: Number(b.hoursLeft.toFixed(2)),
          subject: pitchReminderSubject({ count: b.items.length, hoursLeft: b.hoursLeft }),
          pitch_ids: b.items.map((i) => i.pitchId),
        })),
      });
    }

    // ── Fail closed ────────────────────────────────────────────────────────
    // Without the de-dupe key there is no way to know what was already sent,
    // and a duplicate reminder is worse than a missing one.
    if (!dedupe.ok) {
      return Response.json({
        error: 'email_log cannot store the reminder de-dupe key; refusing to send',
        missing_columns: DEDUPE_COLUMNS,
        detail: dedupe.reason,
        run_this_first: DEDUPE_SETUP_SQL,
      }, { status: 503 });
    }

    const results = [];

    for (const b of buckets.values()) {
      try {
        // 1. De-dupe check, then claim. Claiming before the send means a crash
        //    mid-flight costs a reminder rather than sending two.
        const seen = await alreadyReminded(b.items.map((i) => i.pitchId), b.kind);
        const fresh = b.items.filter((i) => !seen.has(i.pitchId));
        if (fresh.length === 0) {
          results.push({ curator_id: b.curatorId, kind: b.kind, skipped: 'already_reminded' });
          continue;
        }

        const count = fresh.length;
        const hoursLeft = fresh[0].hoursLeft;
        const subject = pitchReminderSubject({ count, hoursLeft });
        const recipient = EMAIL_TEST_MODE ? EMAIL_TEST_REDIRECT : b.to;
        const finalSubject = (EMAIL_TEST_MODE ? `[TEST] (→${b.to}) ` : '') + subject;

        const { error: claimError } = await supabase.from('email_log').insert(
          fresh.map((i) => ({
            pitch_id: i.pitchId,
            type: b.kind,
            to_email: recipient,
            curator_id: b.curatorId,
            curator_email: b.to,
            subject: finalSubject,
            status: 'sending',
          }))
        );
        if (claimError) throw new Error(`email_log claim failed: ${claimError.message}`);

        // 2. Send. Resend v4 resolves with { data, error } on 4xx instead of
        //    throwing, so the error field must be read explicitly.
        const { data: sent, error: sendError } = await resend.emails.send({
          from: FROM,
          to: recipient,
          reply_to: 'info@otonami.io',
          subject: finalSubject,
          html: pitchReminderHtml({
            curatorName: b.curatorName,
            count,
            hoursLeft,
            items: fresh,
          }),
          text: pitchReminderText({
            curatorName: b.curatorName,
            count,
            hoursLeft,
            items: fresh,
          }),
        });

        // 3. Settle the claim rows either way.
        const settle = sendError
          ? { status: 'error', error_message: String(sendError.message || sendError).slice(0, 500) }
          : { status: 'sent', resend_id: sent?.id || null };
        const { error: settleError } = await supabase
          .from('email_log')
          .update(settle)
          .eq('type', b.kind)
          .in('pitch_id', fresh.map((i) => i.pitchId));
        if (settleError) {
          console.warn('[cron] email_log settle failed (non-fatal):', settleError.message);
        }

        if (sendError) {
          console.error(`[cron] reminder send failed for ${b.curatorId}:`, sendError);
          results.push({ curator_id: b.curatorId, kind: b.kind, sent: false, error: String(sendError.message || sendError) });
        } else {
          results.push({ curator_id: b.curatorId, kind: b.kind, sent: true, pitch_count: count, resend_id: sent?.id || null });
        }
      } catch (e) {
        console.error(`[cron] reminder bucket ${b.curatorId}/${b.kind} failed:`, e?.message || e);
        results.push({ curator_id: b.curatorId, kind: b.kind, sent: false, error: e?.message || String(e) });
      }
    }

    return Response.json({
      message: results.length === 0 ? 'No reminders due' : 'Reminders processed',
      now: nowIso,
      candidates_in_72h: (rows || []).length,
      skipped,
      emails_sent: results.filter((r) => r.sent).length,
      results,
    });
  } catch (e) {
    console.error('[cron] pitch-reminders failed:', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
