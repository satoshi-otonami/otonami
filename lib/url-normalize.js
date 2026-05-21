/**
 * Normalize a curator-submitted placement URL before persisting.
 * - Extracts the src when a full <iframe> embed snippet is pasted.
 * - Canonicalizes Spotify /embed/{type}/ links to their shareable form.
 * - Rejects anything that is not an http(s) URL (throws 'INVALID_URL').
 *
 * Returns null for empty input. Query params (e.g. ?utm_source=generator)
 * are intentionally preserved — they do not break the link.
 *
 * @param {unknown} raw
 * @returns {string|null}
 */
export function normalizePlacementUrl(raw) {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (trimmed === '') return null;

  let candidate = trimmed;

  // 1. Full iframe embed code → pull out the src attribute
  if (candidate.toLowerCase().startsWith('<iframe')) {
    const match = candidate.match(/src=["']([^"']+)["']/i);
    if (!match) throw new Error('INVALID_URL');
    candidate = match[1];
  }

  // 2. Only http(s) URLs are allowed (blocks javascript:, data:, etc.)
  if (!/^https?:\/\//i.test(candidate)) {
    throw new Error('INVALID_URL');
  }

  // 3. Spotify embed → canonical share URL
  candidate = candidate.replace(
    /^(https?:\/\/open\.spotify\.com)\/embed\/(playlist|track|album|episode|show)\//i,
    '$1/$2/'
  );

  return candidate;
}
