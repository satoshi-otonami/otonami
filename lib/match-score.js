// ═══════════════════════════════════════════════
//  OTONAMI Match Score Engine
//  Curator-Artist compatibility scoring
//  Works in both client (browser) and server environments
// ═══════════════════════════════════════════════

// ── Cosine similarity on 5-dim audio feature vector ──
// Dimensions: energy, danceability, acousticness, instrumentalness, valence
// All values expected to be 0-1
export function cosineSimilarity(a, b) {
  const keys = ['energy', 'danceability', 'acousticness', 'instrumentalness', 'valence'];

  let dot = 0, normA = 0, normB = 0;
  for (const k of keys) {
    const va = a[k] ?? 0;
    const vb = b[k] ?? 0;
    dot   += va * vb;
    normA += va * va;
    normB += vb * vb;
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ── Jaccard similarity between two string arrays ──
export function jaccardSimilarity(arrA, arrB) {
  if (!arrA?.length || !arrB?.length) return 0;
  const setA = new Set(arrA.map(s => s.toLowerCase().trim()));
  const setB = new Set(arrB.map(s => s.toLowerCase().trim()));
  let intersection = 0;
  for (const v of setA) { if (setB.has(v)) intersection++; }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ── Genre match: best-match (max) with partial matching ──
// curator.genres = ["Jazz", "Fusion", "City Pop"]
// artist.genres  = ["Jazz", "Funk", "Latin"]
// Best-match: the single strongest overlap drives the score, so holding many
// genres on either side never dilutes a strong hit (recall→max redesign).
// Supports exact match (1.0) + partial match ("japanese jazz" ↔ "jazz", 0.5).
export function genreMatch(curatorGenres, artistGenres) {
  if (!curatorGenres?.length || !artistGenres?.length) return 0;
  const normC = curatorGenres.map(s => s.toLowerCase().trim());
  const normA = artistGenres.map(s => s.toLowerCase().trim());

  let best = 0;
  for (const ag of normA) {
    if (normC.includes(ag)) {
      best = Math.max(best, 1.0); // exact match — strongest, can stop early
      break;
    } else if (normC.some(cg => ag.includes(cg) || cg.includes(ag))) {
      best = Math.max(best, 0.5); // partial match
    }
  }
  return best;
}

// ── Mood match: Jaccard on mood keyword arrays ──
// Accepts string "Energetic, Groovy" or array ["Energetic", "Groovy"]
export function moodMatch(curatorMoods, artistMoods) {
  const toArr = (v) =>
    Array.isArray(v) ? v : (v || '').split(/[,/]/).map(s => s.trim()).filter(Boolean);
  return jaccardSimilarity(toArr(curatorMoods), toArr(artistMoods));
}

// ── Tempo similarity based on BPM difference ──
// Perfect match at 0 BPM diff, 0 at 60+ BPM diff
export function tempoSimilarity(bpmA, bpmB) {
  if (bpmA == null || bpmB == null || bpmA <= 0 || bpmB <= 0) return 0.5; // neutral if unknown
  const diff = Math.abs(bpmA - bpmB);
  return Math.max(0, 1 - diff / 60);
}

// ── Main score calculator ──
// Weights: Genre 65% + Mood 35% + Audio 0%
// Audio is retired (no audio columns exist on curators — it was a dead 0.5×20%
// flat +10). Its weight is redistributed to Genre/Mood. The audioProfile /
// preferredMoods columns are kept for future use; only the weight changed.
//
// Mood-absent fallback: Mood only carries signal when BOTH sides declare moods
// (existing rule). For pairs that cannot use mood, Mood's 0.35 folds back into
// Genre — but the effective genre contribution is capped at FALLBACK_GENRE_CAP
// so a single exact genre hit lands in "Great Fit" (70-84), not "Perfect Match"
// (85+). This prevents over-inflation of mood-absent pairs (case b suppression).
//
// curator: { genres, preferredMoods, audioProfile: { energy, danceability, ... } }
// track:   { genres, genre, mood, audioFeatures: { energy, danceability, ..., tempo } }
//
// Returns 0-100 score
const FALLBACK_GENRE_CAP = 0.80;

export function calculateMatchScore(curator, track) {
  const weights = { genre: 0.65, mood: 0.35, audio: 0 };

  // Genre score — best-match (see genreMatch): one strong hit scores high.
  const trackGenres = Array.isArray(track.genres)
    ? track.genres
    : (track.genre || '').split(/[,、/]/).map(s => s.trim()).filter(Boolean);

  const genreScore = curator.openToAllGenres
    ? 1.0
    : genreMatch(curator.genres || [], trackGenres);

  // Audio cosine — weight is 0, so this no longer affects the result (kept for future).
  const audioScore = curator.audioProfile && track.audioFeatures
    ? cosineSimilarity(curator.audioProfile, track.audioFeatures)
    : 0.5;

  // Mood is only meaningful when BOTH sides declare moods (rule preserved).
  const curatorMoods = curator.preferredMoods || [];
  const trackMoodArr = Array.isArray(track.mood)
    ? track.mood
    : (track.mood || '').split(/[,/]/).map(s => s.trim()).filter(Boolean);
  const moodUsable = curatorMoods.length > 0 && trackMoodArr.length > 0;

  let raw;
  if (moodUsable) {
    const moodScore = moodMatch(curatorMoods, trackMoodArr);
    raw = genreScore * weights.genre + moodScore * weights.mood + audioScore * weights.audio;
  } else {
    // Fold Mood's weight into Genre, but cap the genre contribution (case b) so a
    // perfect genre hit tops out at "Great Fit", not "Perfect Match".
    const cappedGenre = Math.min(genreScore, FALLBACK_GENRE_CAP);
    raw = cappedGenre * (weights.genre + weights.mood) + audioScore * weights.audio;
  }

  return Math.round(raw * 100);
}

// ── Human-readable label ──
export function getMatchLabel(score) {
  if (score >= 85) return { label: 'Perfect Match', ja: '最高の一致',   color: '#4ade80', emoji: '🎯' };
  if (score >= 70) return { label: 'Great Fit',     ja: '良い相性',     color: '#60a5fa', emoji: '⭐' };
  if (score >= 50) return { label: 'Worth Trying',  ja: '試す価値あり', color: '#facc15', emoji: '👍' };
  if (score >= 30) return { label: 'Low Match',     ja: 'マッチ低め',   color: '#f97316', emoji: '🤔' };
  return              { label: 'Not Recommended', ja: '非推奨',       color: '#f87171', emoji: '❌' };
}

// ── Detailed match reasons ──
// Returns an array of human-readable reason strings
export function getMatchReasons(curator, track, score) {
  const reasons = [];

  const curatorGenres = curator.genres || [];
  const trackGenres   = Array.isArray(track.genres)
    ? track.genres
    : (track.genre || '').split(/[,/]/).map(s => s.trim()).filter(Boolean);

  // Genre best-match: surface the strongest overlap (exact preferred over partial)
  const exact = curatorGenres.filter(g =>
    trackGenres.some(tg => tg.toLowerCase().trim() === g.toLowerCase().trim())
  );
  if (exact.length) {
    reasons.push(`Strong genre match: ${exact.join(', ')}`);
  } else {
    const normC = curatorGenres.map(g => g.toLowerCase().trim());
    const partial = trackGenres.filter(tg => {
      const t = tg.toLowerCase().trim();
      return normC.some(cg => t.includes(cg) || cg.includes(t));
    });
    if (partial.length) reasons.push(`Related genre: ${partial.join(', ')}`);
  }

  if (curator.openToAllGenres) reasons.push('Open to all genres');

  // Mood alignment — only when both sides declared moods (mirrors scoring rule)
  const curatorMoods = curator.preferredMoods || [];
  const trackMoods = Array.isArray(track.mood)
    ? track.mood
    : (track.mood || '').split(/[,/]/).map(s => s.trim()).filter(Boolean);
  if (curatorMoods.length && trackMoods.length) {
    const sharedMoods = curatorMoods.filter(m =>
      trackMoods.some(tm => tm.toLowerCase().trim() === m.toLowerCase().trim())
    );
    if (sharedMoods.length) reasons.push(`Mood alignment: ${sharedMoods.join(', ')}`);
  }

  // Score-based fallback — encourage trying even on low overlap (no hard cutoff)
  if (!reasons.length) {
    if (score >= 70) reasons.push('Good overall compatibility');
    else if (score >= 50) reasons.push('Partial genre/mood overlap');
    else reasons.push('Worth a try — limited overlap, but curators can surprise you');
  }

  return reasons;
}

// ── Rank a list of curators for a given track ──
// curators: array of curator objects (each may have audioProfile, preferredMoods, preferredTempo)
// track:    { genres, genre, mood, audioFeatures }
// Returns curators sorted by score descending, with score/label/reasons attached
export function rankCurators(curators, track) {
  return curators
    .map(curator => {
      const score   = calculateMatchScore(curator, track);
      const match   = getMatchLabel(score);
      const reasons = getMatchReasons(curator, track, score);
      return { ...curator, matchScore: score, matchLabel: match, matchReasons: reasons };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}
