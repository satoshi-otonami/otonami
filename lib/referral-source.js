// Referral source (?ref=) capture — outreach-channel attribution.
//
// The value used to be read only on /curator at mount, so a visitor who landed
// on the LP with ?ref=groover and then clicked through to the form registered
// with referral_source = NULL. Between 2026-07-04 (capture shipped) and
// 2026-09-04, exactly one registration ever carried a value for that reason.
//
// Now: any page captures ?ref= into localStorage (see components/
// ReferralCapture.jsx, mounted in the root layout), and the registration forms
// read it back. First touch wins — a later ?ref= never overwrites the channel
// that actually brought the visitor in.
//
// The shape here must stay in sync with the server-side sanitizer in
// app/api/curator/route.js.

export const REFERRAL_STORAGE_KEY = 'otonami_ref';

const VALID_REF = /^[A-Za-z0-9_-]{1,32}$/;

function sanitize(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  return VALID_REF.test(raw) ? raw : null;
}

// Read ?ref= from the current URL. Returns null when absent or malformed.
export function refFromUrl() {
  if (typeof window === 'undefined') return null;
  try {
    return sanitize(new URLSearchParams(window.location.search).get('ref'));
  } catch {
    return null;
  }
}

// Persist the current page's ?ref= if one is present and nothing is stored yet.
// Safe to call on every page; a no-op when there is no param or a value already
// exists. Never throws (private mode / disabled storage).
export function captureReferralSource() {
  if (typeof window === 'undefined') return null;
  const ref = refFromUrl();
  if (!ref) return readStoredReferralSource();
  try {
    const existing = sanitize(localStorage.getItem(REFERRAL_STORAGE_KEY));
    if (existing) return existing; // first touch wins
    localStorage.setItem(REFERRAL_STORAGE_KEY, ref);
  } catch { /* storage unavailable: fall through to the URL value */ }
  return ref;
}

export function readStoredReferralSource() {
  if (typeof window === 'undefined') return null;
  try {
    return sanitize(localStorage.getItem(REFERRAL_STORAGE_KEY));
  } catch {
    return null;
  }
}

// What a registration form should send: URL param first (the visitor is on a
// ?ref= link right now), then the stored first touch, then null.
export function resolveReferralSource() {
  return refFromUrl() || readStoredReferralSource() || null;
}
