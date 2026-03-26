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

// ── Genre match: recall-based with partial matching ──
// curator.genres = ["Jazz", "Fusion", "City Pop"]
// artist.genres  = ["Jazz", "Funk", "Latin"]
// Supports exact match + partial match ("japanese jazz" ↔ "jazz")
export function genreMatch(curatorGenres, artistGenres) {
  if (!curatorGenres?.length || !artistGenres?.length) return 0;
  const normC = curatorGenres.map(s => s.toLowerCase().trim());
  const normA = artistGenres.map(s => s.toLowerCase().trim());

  let score = 0;
  for (const ag of normA) {
    if (normC.includes(ag)) {
      score += 1; // exact match
    } else if (normC.some(cg => ag.includes(cg) || cg.includes(ag))) {
      score += 0.5; // partial match
    }
  }
  return Math.min(score / normA.length, 1.0);
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
// Weights: Genre 55% + Mood 25% + Audio 20%
// When audio data available on both sides, it contributes real signal.
// When either side has no audio data → neutral 0.5 (does not penalize).
//
// curator: { genres, preferredMoods, audioProfile: { energy, danceability, ... } }
// track:   { genres, genre, mood, audioFeatures: { energy, danceability, ..., tempo } }
//
// Returns 0-100 score
export function calculateMatchScore(curator, track) {
  const weights = { genre: 0.55, mood: 0.25, audio: 0.20 };

  // Genre score — recall-based: how many of the track's genres does the curator cover
  const trackGenres = Array.isArray(track.genres)
    ? track.genres
    : (track.genre || '').split(/[,、/]/).map(s => s.trim()).filter(Boolean);

  const genreScore = genreMatch(curator.genres || [], trackGenres);

  // Audio cosine similarity — neutral 0.5 when either side is missing (no penalty)
  const audioScore = curator.audioProfile && track.audioFeatures
    ? cosineSimilarity(curator.audioProfile, track.audioFeatures)
    : 0.5;

  // Mood score
  const moodScore = moodMatch(
    curator.preferredMoods || [],
    track.mood || ''
  );

  const raw =
    genreScore  * weights.genre +
    moodScore   * weights.mood  +
    audioScore  * weights.audio;

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
    : (track.genre || '').split(/[,/]/).map(s => s.trim());

  // Shared genres
  const shared = curatorGenres.filter(g =>
    trackGenres.some(tg => tg.toLowerCase() === g.toLowerCase())
  );
  if (shared.length) {
    reasons.push(`Shared genres: ${shared.join(', ')}`);
  }

  // Audio features
  if (curator.audioProfile && track.audioFeatures) {
    const af = track.audioFeatures;
    const ap = curator.audioProfile;

    if (ap.energy != null && af.energy != null) {
      const diff = Math.abs(ap.energy - af.energy);
      if (diff < 0.15) reasons.push('Energy level aligns well');
      else if (diff > 0.4) reasons.push('Energy level mismatch');
    }
    if (ap.danceability != null && af.danceability != null) {
      const diff = Math.abs(ap.danceability - af.danceability);
      if (diff < 0.15) reasons.push('Danceability matches curator preference');
    }
    if (ap.acousticness != null && af.acousticness != null) {
      const curHigh = ap.acousticness > 0.6;
      const trHigh  = af.acousticness > 0.6;
      if (curHigh === trHigh) {
        reasons.push(curHigh ? 'Both prefer acoustic sounds' : 'Both skew electronic/produced');
      }
    }
    if (af.instrumentalness != null && af.instrumentalness > 0.8) {
      reasons.push('Instrumental track — good for playlist/radio');
    }
  }

  // Tempo
  if (curator.preferredTempo && track.audioFeatures?.tempo) {
    const diff = Math.abs(curator.preferredTempo - track.audioFeatures.tempo);
    if (diff < 10)  reasons.push(`Tempo match (${Math.round(track.audioFeatures.tempo)} BPM)`);
    if (diff > 40)  reasons.push(`Tempo gap (curator prefers ~${curator.preferredTempo} BPM)`);
  }

  // Score-based fallback
  if (!reasons.length) {
    if (score >= 70) reasons.push('Good overall compatibility');
    else if (score >= 50) reasons.push('Partial genre/mood overlap');
    else reasons.push('Limited overlap with curator preferences');
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
