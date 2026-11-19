// ?lang= support for pages that keep their language in localStorage.
//
// Every client page reads the same key (otonami_locale) at mount, so a value
// written here carries to /curator, /curators, /studio, etc. on its own.
// ?lang=en is treated exactly like pressing the EN toggle: it wins over the
// saved value and the browser language, and it is saved.
//
// Read from window.location at mount (never useSearchParams): the landing page
// is ISR, and the server/first client render must stay 'ja' so hydration
// matches. See components/ReferralCapture.jsx for the same reasoning.

export const LOCALE_STORAGE_KEY = 'otonami_locale';

export function localeFromUrl() {
  if (typeof window === 'undefined') return null;
  try {
    const v = new URLSearchParams(window.location.search).get('lang');
    return v === 'ja' || v === 'en' ? v : null;
  } catch {
    return null;
  }
}

// Returns the ?lang= value (and saves it) or null when absent/invalid.
export function persistUrlLocale() {
  const lang = localeFromUrl();
  if (lang) {
    try { localStorage.setItem(LOCALE_STORAGE_KEY, lang); } catch {}
  }
  return lang;
}

// After a manual toggle, drop ?lang= so a reload keeps the visitor's choice.
// Other params and the hash are left alone.
export function dropUrlLocale() {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('lang')) return;
    url.searchParams.delete('lang');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  } catch {}
}

// The browser jumps to #hash on the Japanese first render; switching to English
// changes section heights, so jump again once the new copy is on screen (and
// once more after images finish loading). Stops as soon as the visitor scrolls.
export function rescrollToHash() {
  if (typeof window === 'undefined' || !window.location.hash) return;
  let id;
  try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
  if (!id) return;

  let cancelled = false;
  const cancelEvents = ['wheel', 'touchstart', 'keydown', 'mousedown'];
  const cancel = () => { cancelled = true; detach(); };
  const detach = () => {
    cancelEvents.forEach((e) => window.removeEventListener(e, cancel));
    window.removeEventListener('load', onLoad);
  };
  // offsetTop, not scrollIntoView: sections wrapped in AnimatedSection sit at
  // translateY(30px) until revealed, and scrollIntoView would overshoot by that.
  const go = () => {
    if (cancelled) return;
    const el = document.getElementById(id);
    if (!el) return;
    let y = 0;
    for (let n = el; n; n = n.offsetParent) y += n.offsetTop;
    const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    window.scrollTo(0, Math.max(0, y - margin));
  };
  const onLoad = () => { go(); detach(); };

  cancelEvents.forEach((e) => window.addEventListener(e, cancel, { passive: true }));
  requestAnimationFrame(() => requestAnimationFrame(go));
  if (document.readyState === 'complete') detach();
  else window.addEventListener('load', onLoad, { once: true });
}
