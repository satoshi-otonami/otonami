// Carry "the curator this artist came to submit to" across signup.
//
// The /submit/<curatorId> page sends a visitor through signup, the email
// verification link and the OTP login. Those steps often happen in different
// browsers (sign up in Instagram's in-app browser, open the verification mail
// in Safari), so nothing client-side survives. Instead the curator id is stored
// on the account at signup (accounts.pending_curator_id / _set_at) and handed
// back once, as a /studio URL, by the first successful OTP login.
//
// Only a curator id is stored, never a URL: the destination is always built
// here, so this cannot become an open redirect.

import { isPublicCurator, PUBLIC_CURATOR_COLUMNS } from './curator-visibility.js';

export const PENDING_CURATOR_TTL_MS = 14 * 24 * 60 * 60 * 1000;

// Every curator id in the DB is a lowercase slug (app/api/curator/route.js).
const CURATOR_ID_RE = /^[a-z0-9][a-z0-9-]{0,127}$/;

export function isCuratorIdShape(id) {
  return typeof id === 'string' && CURATOR_ID_RE.test(id);
}

export function studioUrlForCurator(id) {
  return `/studio?curator_id=${encodeURIComponent(id)}`;
}

// Live check: the curator exists and is public (not seed/test, not paused,
// email verified). Returns the id to store, or null. Never throws — a bad or
// stale id must not block signup or login.
export async function acceptableCuratorId(db, id) {
  if (!isCuratorIdShape(id)) return null;
  try {
    const { data, error } = await db
      .from('curators')
      .select(PUBLIC_CURATOR_COLUMNS)
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return isPublicCurator(data) ? data.id : null;
  } catch {
    return null;
  }
}

// Columns to add to a new accounts row, or {} when there is nothing valid to
// carry (keeps the insert identical to before for ordinary signups).
export async function pendingCuratorColumns(db, rawId, now = new Date()) {
  const id = await acceptableCuratorId(db, rawId);
  return id ? { pending_curator_id: id, pending_curator_set_at: now.toISOString() } : {};
}

// Pure: is the stored pending curator still within its window?
export function isPendingFresh(account, now = new Date()) {
  if (!account?.pending_curator_id || !account?.pending_curator_set_at) return false;
  const setAt = Date.parse(account.pending_curator_set_at);
  if (Number.isNaN(setAt)) return false;
  const age = now.getTime() - setAt;
  return age >= 0 && age <= PENDING_CURATOR_TTL_MS;
}

// Called on a successful artist OTP login. Clears the pending curator in every
// case (used, expired or no longer public) so it is acted on at most once, and
// returns the /studio URL only when this call is the one that cleared it and
// the curator is still public. Never throws.
export async function consumePendingCurator(db, account, now = new Date()) {
  if (!account?.id || !account?.pending_curator_id) return null;
  try {
    const { data: cleared, error } = await db
      .from('accounts')
      .update({ pending_curator_id: null, pending_curator_set_at: null })
      .eq('id', account.id)
      .eq('pending_curator_id', account.pending_curator_id)
      .select('id')
      .maybeSingle();
    if (error || !cleared) return null; // another login got it first
    if (!isPendingFresh(account, now)) return null;
    const id = await acceptableCuratorId(db, account.pending_curator_id);
    return id ? studioUrlForCurator(id) : null;
  } catch {
    return null;
  }
}
