// ═══════════════════════════════════════════════
//  OTONAMI Track Analysis Client
//  Frontend helper → /api/track/analyze
// ═══════════════════════════════════════════════

// ── Platform detection ──
export function detectPlatform(url) {
  if (!url) return null;
  if (/spotify\.com\/track\//.test(url))                    return { id: 'spotify',     label: 'Spotify',      icon: '🎧' };
  if (/spotify\.com\/album\//.test(url))                    return { id: 'spotify',     label: 'Spotify Album', icon: '🎧' };
  if (/youtube\.com\/|youtu\.be\//.test(url))               return { id: 'youtube',     label: 'YouTube',      icon: '▶️' };
  if (/soundcloud\.com\//.test(url))                        return { id: 'soundcloud',  label: 'SoundCloud',   icon: '☁️' };
  if (/music\.apple\.com\//.test(url))                      return { id: 'apple',       label: 'Apple Music',  icon: '🍎' };
  if (/bandcamp\.com\//.test(url))                          return { id: 'bandcamp',    label: 'Bandcamp',     icon: '🎸' };
  return null;
}

// ── Analyze a track and return audio features ──
// Options:
//   trackUrl   — Spotify track URL or YouTube video URL
//   songName   — manual song name (takes priority over URL parse)
//   artistName — manual artist name (takes priority over URL parse)
//
// Returns:
//   { songName, artistName, audioFeatures, source, metadata, soundnetError? }
export async function analyzeTrack({ trackUrl, songName, artistName } = {}) {
  if (!trackUrl && !songName) {
    throw new Error('Provide a trackUrl or songName');
  }

  const res = await fetch('/api/track/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trackUrl, songName, artistName }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Track analysis failed');
  return data;
}
