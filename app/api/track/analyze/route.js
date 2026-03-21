export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

// ── Spotify client credentials token ──
async function getSpotifyToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Spotify credentials not set');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error('Spotify token fetch failed: ' + res.status);
  const data = await res.json();
  return data.access_token;
}

// ── Spotify track metadata ──
// Accepts track URL: https://open.spotify.com/track/{id}
async function fetchSpotifyTrack(url) {
  const match = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/);
  if (!match) throw new Error('Could not parse Spotify track ID from URL');
  const trackId = match[1];

  const token = await getSpotifyToken();

  const [trackRes, featuresRes] = await Promise.all([
    fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
    fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  ]);

  if (!trackRes.ok) throw new Error('Spotify track not found: ' + trackRes.status);
  const track = await trackRes.json();
  const features = featuresRes.ok ? await featuresRes.json() : null;

  return {
    songName: track.name,
    artistName: track.artists?.[0]?.name || '',
    albumName: track.album?.name || '',
    // Spotify audio features are already 0-1 (except tempo)
    audioFeatures: features ? {
      energy:           features.energy          ?? null,
      danceability:     features.danceability     ?? null,
      acousticness:     features.acousticness     ?? null,
      instrumentalness: features.instrumentalness ?? null,
      valence:          features.valence          ?? null,
      tempo:            features.tempo            ?? null,
      loudness:         features.loudness         ?? null,
    } : null,
    source: 'spotify',
  };
}

// ── YouTube: extract video title and parse artist/song ──
// Handles patterns like:
//   "ROUTE14band "Mahal""
//   "Mahal - ROUTE14band (Official Video)"
//   "ChihiroYamazaki +ROUTE14band "Mahal""
async function fetchYouTubeTrack(url) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY not set');

  const videoMatch = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (!videoMatch) throw new Error('Could not parse YouTube video ID from URL');
  const videoId = videoMatch[1];

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`
  );
  if (!res.ok) throw new Error('YouTube API error: ' + res.status);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  const snippet = data.items?.[0]?.snippet;
  if (!snippet) throw new Error('Video not found');

  const rawTitle = snippet.title;
  const channelTitle = snippet.channelTitle || '';

  const { songName, artistName } = parseYouTubeTitle(rawTitle, channelTitle);

  return {
    songName,
    artistName,
    rawTitle,
    channelTitle,
    audioFeatures: null, // YouTube has no audio features — will be fetched via SoundNet
    source: 'youtube',
  };
}

// ── YouTube title parser ──
// Covers common patterns used by Japanese indie artists
function parseYouTubeTitle(title, channelTitle) {
  // Pattern 1: quoted song title — pick last quoted string as song
  //   "ChihiroYamazaki +ROUTE14band "Mahal""
  //   'ROUTE14band "Crossroad" (Official)'
  const quotedMatches = [...title.matchAll(/"([^"]+)"/g)];
  if (quotedMatches.length) {
    const songName = quotedMatches[quotedMatches.length - 1][1].trim();
    // Artist = everything before the last quoted block
    const beforeQuote = title.slice(0, title.lastIndexOf(`"${songName}"`)).trim();
    const artistName = beforeQuote
      .replace(/[+&,]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || channelTitle;
    return { songName, artistName };
  }

  // Pattern 2: "Song - Artist" or "Artist - Song"
  const dashMatch = title.match(/^(.+?)\s+[-–—]\s+(.+?)(?:\s*[\[(|].*)?$/);
  if (dashMatch) {
    // Heuristic: if first part looks like an artist (shorter, no "Official" etc.) → Artist - Song
    const [, a, b] = dashMatch;
    const looksLikeArtistFirst = a.length < b.length && !/official|video|mv|live|lyric/i.test(a);
    return looksLikeArtistFirst
      ? { songName: b.trim(), artistName: a.trim() }
      : { songName: a.trim(), artistName: b.trim() };
  }

  // Fallback: use channel title as artist, full title as song
  return { songName: title.replace(/\s*[\[(|].*$/, '').trim(), artistName: channelTitle };
}

// ── SoundNet Track Analysis API (RapidAPI) ──
// Returns audio features normalized to 0-1 (except tempo in BPM)
async function fetchSoundNetFeatures(songName, artistName) {
  const rapidApiKey = process.env.RAPIDAPI_KEY;
  if (!rapidApiKey) throw new Error('RAPIDAPI_KEY not set');

  const params = new URLSearchParams({ song: songName, artist: artistName });

  // Try endpoints in order: key-bpm (confirmed) → query (Track Analysis by Query)
  const endpoints = ['/pktx/query', '/pktx/key-bpm'];
  let raw = null;
  let lastError = '';

  for (const endpoint of endpoints) {
    const res = await fetch(
      `https://track-analysis.p.rapidapi.com${endpoint}?${params}`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'track-analysis.p.rapidapi.com',
          'x-rapidapi-key': rapidApiKey,
        },
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      lastError = err.message || `SoundNet API error: ${res.status}`;
      continue;
    }

    raw = await res.json();
    console.log('[SoundNet] raw response from', endpoint, ':', JSON.stringify(raw).slice(0, 300));
    break;
  }

  if (!raw) throw new Error(lastError || 'All SoundNet endpoints failed');

  // Handle array response — some endpoints return [{...}] instead of {...}
  if (Array.isArray(raw)) {
    raw = raw[0] ?? null;
    if (!raw) throw new Error('SoundNet returned empty array');
  }

  // Normalize 0-100 → 0-1 (SoundNet returns 0-100 scale for most features)
  const normalize = (v) => (v != null ? Math.min(1, Math.max(0, v / 100)) : null);

  const features = {
    energy:           normalize(raw.energy),
    danceability:     normalize(raw.danceability),
    acousticness:     normalize(raw.acousticness),
    instrumentalness: normalize(raw.instrumentalness),
    valence:          normalize(raw.valence ?? raw.happiness),
    tempo:            raw.tempo ?? raw.bpm ?? null,   // BPM — keep as-is
    key:              raw.key ?? null,
    loudness:         raw.loudness ?? null,
  };
  console.log('[SoundNet] parsed features:', JSON.stringify(features));
  return features;
}

// ── POST /api/track/analyze ──
// Body: { trackUrl?, songName?, artistName? }
export async function POST(request) {
  try {
    const { trackUrl, songName: inputSong, artistName: inputArtist } = await request.json();

    let songName = inputSong?.trim() || '';
    let artistName = inputArtist?.trim() || '';
    let metadata = {};

    // 1. URL解析でメタデータ取得（ユーザー入力がない場合）
    if (trackUrl) {
      try {
        if (/spotify\.com\/track\//.test(trackUrl)) {
          const spotify = await fetchSpotifyTrack(trackUrl);
          metadata = spotify;
          // Spotify audio featuresが取れた場合はSoundNetをスキップ
          if (!songName) songName = spotify.songName;
          if (!artistName) artistName = spotify.artistName;

          // Spotifyで既にaudio featuresが取れていればそのまま返す
          if (spotify.audioFeatures) {
            return NextResponse.json({
              songName,
              artistName,
              audioFeatures: spotify.audioFeatures,
              source: 'spotify',
              metadata,
            });
          }
        } else if (/youtube\.com\/|youtu\.be\//.test(trackUrl)) {
          const youtube = await fetchYouTubeTrack(trackUrl);
          metadata = youtube;
          if (!songName) songName = youtube.songName;
          if (!artistName) artistName = youtube.artistName;
        }
      } catch (e) {
        console.warn('URL parse warning:', e.message);
        // URL解析失敗でもsongName/artistNameがあれば続行
      }
    }

    if (!songName) {
      // If a URL was provided but song name couldn't be determined, return gracefully
      // (don't 400 — let the UI show "no analysis data" without blocking pitch creation)
      const hint = trackUrl ? 'Could not extract song name from URL. Enter song title manually.' : 'Please provide songName.';
      console.warn('[analyze] no songName:', hint);
      return NextResponse.json({ songName: '', artistName, audioFeatures: null, source: 'url', metadata, soundnetError: hint });
    }

    // 2. SoundNet APIでaudio features取得
    let audioFeatures = null;
    let soundnetError = null;
    try {
      audioFeatures = await fetchSoundNetFeatures(songName, artistName);
    } catch (e) {
      soundnetError = e.message;
      console.warn('SoundNet warning:', e.message);
    }

    return NextResponse.json({
      songName,
      artistName,
      audioFeatures,
      source: trackUrl ? (metadata.source || 'url') : 'manual',
      metadata,
      ...(soundnetError ? { soundnetError } : {}),
    });
  } catch (error) {
    console.error('Track analyze error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
