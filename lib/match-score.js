// ═══════════════════════════════════════════════
//  OTONAMI Match Score Engine
//  Curator-Artist compatibility scoring
//  Works in both client (browser) and server environments
// ═══════════════════════════════════════════════
//
// This module is the ONLY match-score implementation. /studio, the artist
// dashboard curator modal and any future surface must import it — three
// divergent formulas used to coexist and reported different numbers for the
// same pair (the dashboard one showed 0% for 15/42 curators that /studio
// scored 50-80%).
//
// Scoring shape:
//   Genre 65% + Mood 35%. An axis with no data on either side is DROPPED, not
//   scored 0 — "we don't know" is not "not a match". When only one axis is
//   usable the result is capped (SINGLE_AXIS_CAP) because one axis is weaker
//   evidence; when neither is usable the score is null and the UI must say
//   MATCH_INSUFFICIENT_LABEL instead of printing a number.
//   A curator's rejected genres are honoured last and override everything.

// ── Genre vocabulary ──────────────────────────────────────────────
// Spelling variants that mean the same genre.
const GENRE_ALIASES = {
  'jazzfusion': 'jazz fusion', 'jazz-fusion': 'jazz fusion', 'fusion': 'jazz fusion',
  'hiphop': 'hip-hop', 'hip hop': 'hip-hop',
  'rnb': 'r&b', 'r and b': 'r&b', 'r & b': 'r&b',
  'lofi': 'lo-fi', 'lo fi': 'lo-fi',
  'jpop': 'j-pop', 'j pop': 'j-pop', 'japanese pop': 'j-pop',
  'jrock': 'j-rock', 'j rock': 'j-rock', 'japanese rock': 'j-rock',
  'citypop': 'city pop',
  'edm': 'dance music', 'electronica': 'electronic',
  'singer songwriter': 'singer-songwriter',
  'world': 'world music', 'film': 'film music', 'soundtrack': 'film music',
};

// child genre → parent genre. Deliberately small: every entry is a claim that
// the child is a subgenre of the parent, and it drives BOTH affinity scoring
// and the exclusion rule below. Extend only with evidence — this table is the
// source of truth for the relationship, not the string spelling.
const GENRE_PARENTS = {
  'jazz fusion': 'jazz',
  'j-pop': 'pop',
  'city pop': 'pop',
  'j-rock': 'rock',
  'punk': 'rock',
  'metal': 'rock',
  'trap': 'hip-hop',
  'rap': 'hip-hop',
  'disco': 'dance music',
};

export { GENRE_ALIASES, GENRE_PARENTS };

// ── Normalisation ──
export function canonicalGenre(value) {
  const k = String(value || '').toLowerCase().trim().replace(/\s+/g, ' ');
  if (!k) return '';
  return GENRE_ALIASES[k] || GENRE_ALIASES[k.replace(/[-\s]/g, '')] || k;
}

const toArray = (v) =>
  Array.isArray(v) ? v.filter(Boolean) : String(v || '').split(/[,、/]/).map(s => s.trim()).filter(Boolean);

// ── Genre affinity between two single genres ──
// 1.0 same genre / 0.75 parent-child / 0.5 siblings / 0 unrelated.
// Substring matching is deliberately NOT used: it made "Trap" ≡ "Rap" and
// "City Pop" ≡ "Pop" by accident of spelling.
export function genrePairAffinity(a, b) {
  const x = canonicalGenre(a), y = canonicalGenre(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (GENRE_PARENTS[x] === y || GENRE_PARENTS[y] === x) return 0.75;
  if (GENRE_PARENTS[x] && GENRE_PARENTS[x] === GENRE_PARENTS[y]) return 0.5;
  return 0;
}

// ── Genre match: best single pairing wins ──
// Holding many genres on either side never dilutes one strong hit.
export function genreMatch(curatorGenres, artistGenres) {
  const cs = toArray(curatorGenres), as = toArray(artistGenres);
  if (!cs.length || !as.length) return 0;
  let best = 0;
  for (const a of as) {
    for (const c of cs) {
      const v = genrePairAffinity(a, c);
      if (v > best) best = v;
      if (best === 1) return 1;
    }
  }
  return best;
}

// ── Mood match: recall over the ARTIST's moods ──
// "How much of this track's mood does the curator cover?" A curator is no
// longer punished for declaring many moods (the old Jaccard divided by the
// union, so a broad curator who covered every mood still scored ~0.3).
export function moodMatch(curatorMoods, artistMoods) {
  const cs = toArray(curatorMoods).map(s => s.toLowerCase().trim());
  const as = toArray(artistMoods).map(s => s.toLowerCase().trim());
  if (!cs.length || !as.length) return 0;
  const set = new Set(cs);
  const shared = as.filter(m => set.has(m)).length;
  return shared / as.length;
}

// ── Rejected genres ──
// Rejecting a parent genre rejects its children (Jazz → Jazz Fusion is out).
// Rejecting a child does NOT reject the parent (J-Pop → Pop is still fine),
// otherwise "no J-Pop" would silently exclude every Pop artist.
export function excludedArtistGenres(rejectedGenres, artistGenres) {
  const rejected = toArray(rejectedGenres).map(canonicalGenre);
  if (!rejected.length) return [];
  return toArray(artistGenres).filter(g => {
    const x = canonicalGenre(g);
    return rejected.includes(x) || (GENRE_PARENTS[x] && rejected.includes(GENRE_PARENTS[x]));
  });
}

// ── Weights and ceilings ──
const WEIGHTS = { genre: 0.65, mood: 0.35 };
const SINGLE_AXIS_CAP = 0.75;   // only one axis had data on both sides
const TOP_CAP = 0.95;           // a match score is an estimate, never a promise
const EXCLUDE_CAP_FULL = 10;    // every genre of the track is on the reject list
const EXCLUDE_CAP_PARTIAL = 35; // some genres of the track are on the reject list

export const MATCH_INSUFFICIENT_LABEL = 'マッチデータ不足';

export function excludedGenresLabel(genres) {
  const list = toArray(genres);
  if (!list.length) return '';
  return `このキュレーターは${list.join('・')}を受け付けていません`;
}

// ── Full evaluation ──
// curator: { genres, accepts, preferredMoods, rejectedGenres, openToAllGenres }
// track:   { genres | genre, mood }
// Returns { score, insufficient, excludedGenres, excludeTier, genreScore,
//           moodScore, genreUsable, moodUsable }. score is null when neither
//           axis can be evaluated.
export function evaluateMatch(curator, track) {
  const curatorGenres = [...toArray(curator?.genres), ...toArray(curator?.accepts)];
  const artistGenres  = toArray(track?.genres?.length ? track.genres : track?.genre);
  const curatorMoods  = toArray(curator?.preferredMoods);
  const artistMoods   = toArray(track?.mood);

  const genreUsable = !!curator?.openToAllGenres || (curatorGenres.length > 0 && artistGenres.length > 0);
  const moodUsable  = curatorMoods.length > 0 && artistMoods.length > 0;

  const excluded = excludedArtistGenres(curator?.rejectedGenres, artistGenres);
  const excludeTier = excluded.length
    ? (excluded.length === artistGenres.length ? 'full' : 'partial')
    : null;

  if (!genreUsable && !moodUsable) {
    return {
      score: null, insufficient: true, excludedGenres: excluded, excludeTier,
      genreScore: 0, moodScore: 0, genreUsable, moodUsable,
    };
  }

  const genreScore = curator?.openToAllGenres
    ? Math.max(1, genreMatch(curatorGenres, artistGenres))
    : genreMatch(curatorGenres, artistGenres);
  const moodScore = moodMatch(curatorMoods, artistMoods);

  let raw;
  if (genreUsable && moodUsable) raw = genreScore * WEIGHTS.genre + moodScore * WEIGHTS.mood;
  else if (genreUsable) raw = Math.min(genreScore, SINGLE_AXIS_CAP);
  else raw = Math.min(moodScore, SINGLE_AXIS_CAP);

  let score = Math.round(Math.min(raw, TOP_CAP) * 100);
  if (excluded.length) {
    score = Math.min(score, excludeTier === 'full' ? EXCLUDE_CAP_FULL : EXCLUDE_CAP_PARTIAL);
  }

  return {
    score, insufficient: false, excludedGenres: excluded, excludeTier,
    genreScore, moodScore, genreUsable, moodUsable,
  };
}

// ── Score only (0-100, or null when there is nothing to judge on) ──
export function calculateMatchScore(curator, track) {
  return evaluateMatch(curator, track).score;
}

// ── Human-readable label ──
export function getMatchLabel(score) {
  if (score == null)  return { label: MATCH_INSUFFICIENT_LABEL, ja: MATCH_INSUFFICIENT_LABEL, color: '#9ca3af', insufficient: true };
  if (score >= 85) return { label: 'Perfect Match', ja: '最高の一致',   color: '#4ade80', emoji: '🎯' };
  if (score >= 70) return { label: 'Great Fit',     ja: '良い相性',     color: '#60a5fa', emoji: '⭐' };
  if (score >= 50) return { label: 'Worth Trying',  ja: '試す価値あり', color: '#facc15', emoji: '👍' };
  if (score >= 30) return { label: 'Low Match',     ja: 'マッチ低め',   color: '#f97316', emoji: '🤔' };
  return              { label: 'Not Recommended', ja: '非推奨',       color: '#f87171', emoji: '❌' };
}

// ── Detailed match reasons ──
// Returns an array of human-readable reason strings.
export function getMatchReasons(curator, track, score, evaluation) {
  const ev = evaluation || evaluateMatch(curator, track);
  const reasons = [];

  // The curator's own "don't send me this" comes first — it outranks any hit.
  if (ev.excludedGenres.length) reasons.push(excludedGenresLabel(ev.excludedGenres));

  if (ev.insufficient) {
    reasons.push('ジャンル・ムードが未登録のため判定できません');
    return reasons;
  }

  const curatorGenres = [...toArray(curator?.genres), ...toArray(curator?.accepts)];
  const artistGenres  = toArray(track?.genres?.length ? track.genres : track?.genre);
  const excludedSet   = new Set(ev.excludedGenres.map(canonicalGenre));

  // Surface the strongest overlap, ignoring genres the curator rejects.
  const scorable = artistGenres.filter(g => !excludedSet.has(canonicalGenre(g)));
  const exact = scorable.filter(g => curatorGenres.some(cg => genrePairAffinity(cg, g) === 1));
  const related = scorable.filter(g => {
    const best = Math.max(0, ...curatorGenres.map(cg => genrePairAffinity(cg, g)));
    return best > 0 && best < 1;
  });
  if (exact.length) reasons.push(`Strong genre match: ${exact.join(', ')}`);
  else if (related.length) reasons.push(`Related genre: ${related.join(', ')}`);

  if (curator?.openToAllGenres) reasons.push('Open to all genres');

  if (ev.moodUsable) {
    const curatorMoods = toArray(curator?.preferredMoods);
    const artistMoods  = toArray(track?.mood);
    const shared = curatorMoods.filter(m =>
      artistMoods.some(am => am.toLowerCase().trim() === m.toLowerCase().trim())
    );
    if (shared.length) reasons.push(`Mood alignment: ${shared.join(', ')}`);
  } else if (!ev.genreUsable) {
    reasons.push(MATCH_INSUFFICIENT_LABEL);
  }

  if (!reasons.length) {
    if (score >= 70) reasons.push('Good overall compatibility');
    else if (score >= 50) reasons.push('Partial genre/mood overlap');
    else reasons.push('Worth a try — limited overlap, but curators can surprise you');
  }

  return reasons;
}

// ── Rank a list of curators for a given track ──
// Returns curators sorted best-first, with score/label/reasons attached.
// Curators who reject the track's genre sort below everyone else regardless of
// their number, and curators we cannot judge (null score) sort last.
export function rankCurators(curators, track) {
  return (curators || [])
    .map(curator => {
      const ev = evaluateMatch(curator, track);
      return {
        ...curator,
        matchScore: ev.score,
        matchLabel: getMatchLabel(ev.score),
        matchReasons: getMatchReasons(curator, track, ev.score, ev),
        matchExcluded: ev.excludedGenres,
        matchExcludedLabel: ev.excludedGenres.length ? excludedGenresLabel(ev.excludedGenres) : null,
        matchInsufficient: ev.insufficient,
      };
    })
    .sort(compareByMatch);
}

// Shared ordering: excluded last, unknown just above them, then score desc.
export function compareByMatch(a, b) {
  const rank = (c) => (c.matchExcluded?.length ? 2 : c.matchScore == null ? 1 : 0);
  const ra = rank(a), rb = rank(b);
  if (ra !== rb) return ra - rb;
  return (b.matchScore ?? -1) - (a.matchScore ?? -1);
}
