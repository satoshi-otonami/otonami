// Where a curator lands after logging in.
//
// Curators reach a pitch through three entry points: the pitch email (links the
// respond page), the reminder email and the dashboard. Every one of them used to
// funnel through a login that always ended on /curator/dashboard, whose Listen
// button was a bare Spotify link — so a curator who had already been given a
// full-length YouTube player on the respond page never saw it
// (2026-10-16 Radio Free Marseille). `next` carries the page they asked for
// through the login.
//
// Only same-site curator paths are accepted. Anything else (absolute URLs,
// protocol-relative `//host`, backslashes) falls back to the dashboard, so the
// parameter cannot be used as an open redirect.

export const CURATOR_HOME = '/curator/dashboard';

export function safeCuratorNext(raw) {
  if (typeof raw !== 'string' || raw.length > 300) return null;
  if (!raw.startsWith('/curator/')) return null;
  if (raw.startsWith('//') || raw.includes('\\')) return null;
  return raw;
}

export function curatorLoginUrl(next) {
  const safe = safeCuratorNext(next);
  return safe ? `/curator/login?next=${encodeURIComponent(safe)}` : '/curator/login';
}
