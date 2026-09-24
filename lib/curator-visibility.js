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

// Test rows that were created without is_seed. Interim: once the row is
// flipped to is_seed = true in the DB (SQL in otonami-outputs, run by hand),
// isSeedCurator() already covers it and this entry is harmless. Match by id,
// never by name — curators.name is not unique.
const TEST_CURATOR_IDS = new Set([
  'qa-test-curator-1789898456725', // "QA Test Curator" / "Instinct QA Playlist", 2026-09-20
]);

export function isTestCurator(row) {
  return isSeedCurator(row) || TEST_CURATOR_IDS.has(row?.id);
}

// Columns isPublicCurator() reads. Every caller must select all of them —
// a missing column reads as undefined and changes the answer silently.
export const PUBLIC_CURATOR_COLUMNS = 'id, is_seed, is_paused, email_verified';

// The single definition of "a curator the public can see and count":
// not seed, not a test row, not paused, email verified. Every public figure
// (LP hero pill, trust bar, marquee, /api/curators/count) and the public
// /curators list go through this, so the headcount always matches the list.
export function isPublicCurator(row) {
  return !isTestCurator(row) && row?.is_paused !== true && row?.email_verified === true;
}
