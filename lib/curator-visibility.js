// Single definition of the hidden-curator predicate.
//
// A curator row with is_seed = true is a seed/staff/test row: it must never
// appear on public or artist-facing surfaces (LP marquee, /curators, /studio,
// SNS auto-intro) and must never be counted in public stats derived from
// pitches (the EPK badge). The DB rows themselves stay — past pitches and
// curator_earnings reference them — so exclusion is display/aggregation-side.
//
// This used to match on name === 'test', which only ever caught one row and
// left staff seed rows to the SQL-level is_seed filter. The DB is now the
// single source of truth (2026-09-04: the Test row was flipped to is_seed=true,
// making the seed rows Yamaou / Yamao / Polychroma / Test).
//
// IMPORTANT: every caller must include is_seed in its select — without the
// column each row reads as `undefined` and the predicate silently passes
// everything through.
export function isSeedCurator(row) {
  return row?.is_seed === true;
}
