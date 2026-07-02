// Single definition of the Test/dummy-curator predicate (moved from lib/db.js).
// Test curators must never appear on public/artist-facing curator lists
// (LP marquee, /curators, /studio). The DB row itself is kept — past pitches
// reference it — so exclusion is display-side only.
export function isTestCurator(row) {
  return (row?.name || '').trim().toLowerCase() === 'test';
}
