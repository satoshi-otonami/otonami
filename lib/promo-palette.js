/**
 * track_features のデータから最適なカラーパレットを自動選択
 *
 * @param {Object} features - { energy, danceability, acousticness, valence, moods, genres }
 * @returns {Object} パレット定義 { name, bg, accent, text, overlay, gradient }
 */
export function selectPalette(features = {}) {
  const {
    energy = 0.5,
    danceability = 0.5,
    acousticness = 0.5,
    valence = 0.5,
    moods = [],
    genres = []
  } = features;

  const genreSet = new Set((genres || []).map(g => g.toLowerCase()));

  // 判定ロジック（優先度順）
  // 1. Electronic / Neon
  const isElectronic = genreSet.has('electronic') || genreSet.has('edm') ||
    genreSet.has('house') || genreSet.has('techno') || genreSet.has('synth-pop');
  if (isElectronic && danceability > 0.6) {
    return PALETTES.neon;
  }

  // 2. High Energy / Vivid
  if (energy > 0.7 && valence > 0.5) {
    return PALETTES.vivid;
  }

  // 3. Moody / Dark
  if (energy < 0.4 && valence < 0.4) {
    return PALETTES.moody;
  }

  // 4. Acoustic / Earth
  if (acousticness > 0.6) {
    return PALETTES.earth;
  }

  // 5. デフォルト: OTONAMI Warm
  return PALETTES.warm;
}

export const PALETTES = {
  vivid: {
    name: 'vivid',
    bg: '#1a0a0a',
    accent: '#e85d3a',
    text: '#ffffff',
    overlay: 'rgba(232,93,58,0.15)',
    gradient: 'linear-gradient(135deg, #e85d3a 0%, #ff8a5c 50%, #c4956a 100%)',
    tagBg: 'rgba(232,93,58,0.2)',
    tagText: '#ff8a5c',
    label: '🔥 Vivid'
  },
  earth: {
    name: 'earth',
    bg: '#1a1a14',
    accent: '#7a8c5e',
    text: '#f0ede6',
    overlay: 'rgba(122,140,94,0.15)',
    gradient: 'linear-gradient(135deg, #4a5c3a 0%, #7a8c5e 50%, #c4956a 100%)',
    tagBg: 'rgba(122,140,94,0.2)',
    tagText: '#a8b88e',
    label: '🌿 Earth'
  },
  neon: {
    name: 'neon',
    bg: '#0a0a1a',
    accent: '#a78bfa',
    text: '#ffffff',
    overlay: 'rgba(167,139,250,0.15)',
    gradient: 'linear-gradient(135deg, #a78bfa 0%, #4ecdc4 50%, #06b6d4 100%)',
    tagBg: 'rgba(167,139,250,0.2)',
    tagText: '#c4b5fd',
    label: '⚡ Neon'
  },
  moody: {
    name: 'moody',
    bg: '#0a0a14',
    accent: '#6366f1',
    text: '#e0e0e8',
    overlay: 'rgba(99,102,241,0.12)',
    gradient: 'linear-gradient(135deg, #312e81 0%, #6366f1 50%, #818cf8 100%)',
    tagBg: 'rgba(99,102,241,0.2)',
    tagText: '#a5b4fc',
    label: '🌙 Moody'
  },
  warm: {
    name: 'warm',
    bg: '#1a1a1a',
    accent: '#c4956a',
    text: '#f0ede6',
    overlay: 'rgba(196,149,106,0.15)',
    gradient: 'linear-gradient(135deg, #c4956a 0%, #e85d3a 50%, #c4956a 100%)',
    tagBg: 'rgba(196,149,106,0.2)',
    tagText: '#d4a97a',
    label: '✨ Warm'
  }
};

/**
 * パレット名からパレット定義を取得
 */
export function getPaletteByName(name) {
  return PALETTES[name] || PALETTES.warm;
}
