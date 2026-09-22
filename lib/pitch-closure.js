// Response-window closure for pitches taken over by the 7-day expiry cron.
//
// The cron closes a pitch in two steps (app/api/cron/check-expired-pitches):
//   1. claim  — conditional UPDATE status 'sent' → 'expired'
//   2. refund — return the credits, then stamp refunded_at / refund_credits
// A pitch is closed from the claim onward, and closing is irreversible: the
// refund is never taken back.
//
// Curators may still respond to a closed pitch. The response is saved and the
// artist is notified, but it earns nothing and never re-charges the artist.
// Responding overwrites status (display/workflow only), so closure is keyed on
// the refund state — refunded_at — plus 'expired', which only the cron writes,
// to cover the gap between the claim and the stamp.

export const RESPONSE_STATUSES = ['accepted', 'declined', 'feedback'];

export const CLOSED_UNDO_ERROR =
  "This pitch has expired and the credits have been refunded. It can't be reopened.";
export const ACCEPTED_UNDO_ERROR =
  'An accepted pitch cannot be reverted. Contact info@otonami.io to make changes.';
export const REFUND_IN_FLIGHT_ERROR =
  'This pitch is being closed right now. Please try again in a minute.';

export function isResponseClosed(pitch) {
  return pitch?.refunded_at != null || pitch?.status === 'expired';
}

// Claimed by the cron but not yet stamped. Responses wait for the stamp (or the
// next cron run's recovery pass) so the refund and the response never race.
export function isRefundInFlight(pitch) {
  return pitch?.status === 'expired' && pitch?.refunded_at == null;
}

// Decide what a curator PATCH may do with the row as currently read.
// Returns { ok: false, httpStatus, error } or { ok: true, closed }.
export function planCuratorResponse(existing, requestedStatus) {
  if (requestedStatus === 'sent') {
    if (isResponseClosed(existing)) return { ok: false, httpStatus: 409, error: CLOSED_UNDO_ERROR };
    if (existing.status === 'accepted') return { ok: false, httpStatus: 409, error: ACCEPTED_UNDO_ERROR };
    return { ok: true, closed: false };
  }
  if (isRefundInFlight(existing)) return { ok: false, httpStatus: 409, error: REFUND_IN_FLIGHT_ERROR };
  return { ok: true, closed: isResponseClosed(existing) };
}

// Only an open pitch answered with feedback pays the curator.
export function shouldCreateEarning({ closed, status, feedbackMessage, updatedRow }) {
  return !closed
    && !isResponseClosed(updatedRow)
    && RESPONSE_STATUSES.includes(status)
    && !!feedbackMessage;
}

// Write a curator response. An open pitch is written only if it is still open
// (status as read, refunded_at NULL), so a cron claim landing between our read
// and our write sends us round again on the closed path instead of paying out
// on a refunded pitch. `existing` must carry id, status and refunded_at.
// Returns { data, closed } or { httpStatus, error }.
export async function writeCuratorResponse(db, pitchId, existing, status, updates) {
  let row = existing;
  for (let attempt = 0; attempt < 2; attempt++) {
    const plan = planCuratorResponse(row, status);
    if (!plan.ok) return { httpStatus: plan.httpStatus, error: plan.error };

    let query = db.from('pitches').update(updates).eq('id', pitchId);
    query = plan.closed
      ? query.not('refunded_at', 'is', null)
      : query.eq('status', row.status).is('refunded_at', null);
    const { data, error } = await query.select('*').maybeSingle();
    if (error) return { httpStatus: 500, error: error.message };
    if (data) return { data, closed: plan.closed };

    const { data: fresh } = await db
      .from('pitches')
      .select('id, status, refunded_at')
      .eq('id', pitchId)
      .maybeSingle();
    if (!fresh) return { httpStatus: 404, error: 'Pitch not found' };
    row = fresh;
  }
  return { httpStatus: 409, error: 'This pitch changed while you were responding. Please reload and try again.' };
}

// Line added to the artist's response notification when the pitch had already
// been refunded, so a late "accepted" is not read as a new charge.
export const CLOSED_RESPONSE_ARTIST_NOTE_TEXT =
  'クレジットは返還済みのままです（再課金はありません）。\n' +
  'Your credits for this pitch stay refunded — you will not be charged again.';
export const CLOSED_RESPONSE_ARTIST_NOTE_HTML =
  'クレジットは返還済みのままです（再課金はありません）。<br>' +
  'Your credits for this pitch stay refunded — you will not be charged again.';
