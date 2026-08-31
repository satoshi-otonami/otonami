// curators.response_time — the curator's self-declared turnaround, and the
// single source of truth for how long a pitch stays open (pitches.deadline_at).
//
// The stored value is a bare slug, not free text. Legacy rows carry variants
// like '7 days' (a space that never came from the form), so every read goes
// through normalizeResponseTime() before it is compared.

export const RESPONSE_TIME_OPTIONS = [
  { value: '24h',    en: 'Within 24 hours', ja: '24時間以内' },
  { value: '3days',  en: '1–3 days',        ja: '1〜3日' },
  { value: '7days',  en: '3–7 days',        ja: '3〜7日' },
  { value: '2weeks', en: '1–2 weeks',       ja: '1〜2週間' },
];

export const VALID_RESPONSE_TIMES = RESPONSE_TIME_OPTIONS.map(o => o.value);

export const DEFAULT_RESPONSE_TIME = '7days';

// Pitch window in days. Floor 7, ceiling 14 — a curator who promises a fast
// turnaround does NOT get a shorter window; only '2weeks' extends it. Anything
// unknown (bad slug, NULL, deleted curator) falls back to the 7-day floor.
export const DEFAULT_DEADLINE_DAYS = 7;
export const EXTENDED_DEADLINE_DAYS = 14;

export function normalizeResponseTime(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, '');
}

// Coerce to a storable slug: unknown or missing → '7days'.
export function sanitizeResponseTime(value) {
  const normalized = normalizeResponseTime(value);
  return VALID_RESPONSE_TIMES.includes(normalized) ? normalized : DEFAULT_RESPONSE_TIME;
}

export function deadlineDaysFor(responseTime) {
  return normalizeResponseTime(responseTime) === '2weeks'
    ? EXTENDED_DEADLINE_DAYS
    : DEFAULT_DEADLINE_DAYS;
}

export function deadlineFromNow(responseTime, from = Date.now()) {
  return new Date(from + deadlineDaysFor(responseTime) * 24 * 60 * 60 * 1000).toISOString();
}
