/**
 * Build a safe external href for display-time links.
 *
 * Curator/artist-submitted URLs are often pasted without a scheme
 * (e.g. "www.example.com"). Passing those straight into <a href> makes the
 * browser treat them as a path relative to the current origin, so a link on
 * otonami.io resolves to https://otonami.io/www.example.com → 404.
 *
 * This prepends https:// when no http(s) scheme is present, and leaves
 * already-qualified URLs untouched (no double https://https://).
 *
 * Returns undefined for empty/invalid input so callers can choose not to
 * render the link.
 *
 * @param {unknown} url
 * @returns {string|undefined}
 */
export function externalHref(url) {
  if (!url || typeof url !== 'string') return undefined;
  const u = url.trim();
  if (!u) return undefined;
  return /^https?:\/\//i.test(u) ? u : 'https://' + u;
}
