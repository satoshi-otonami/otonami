export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

let _supabase;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return _supabase;
}

function getRapidApiKey() {
  return process.env.RAPIDAPI_KEY;
}

// ============================================================
// Spotify URLからトラックIDを抽出（intl-xx対応）
// ============================================================
function extractSpotifyId(url) {
  if (!url) return null;
  const match = url.match(/spotify\.com\/(?:intl-[a-z]+\/)?track\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

// ============================================================
// YouTube: extract video title and parse artist/song
// ============================================================
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

  return { songName, artistName, rawTitle, channelTitle };
}

// ============================================================
// YouTube title parser (existing logic preserved)
// ============================================================
function parseYouTubeTitle(title, channelTitle) {
  const quotedMatches = [...title.matchAll(/"([^"]+)"/g)];
  if (quotedMatches.length) {
    const songName = quotedMatches[quotedMatches.length - 1][1].trim();
    const beforeQuote = title.slice(0, title.lastIndexOf(`"${songName}"`)).trim();
    const artistName = beforeQuote
      .replace(/[+&,]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || channelTitle;
    return { songName, artistName };
  }

  const dashMatch = title.match(/^(.+?)\s+[-–—]\s+(.+?)(?:\s*[\[(|].*)?$/);
  if (dashMatch) {
    const [, a, b] = dashMatch;
    const looksLikeArtistFirst = a.length < b.length && !/official|video|mv|live|lyric/i.test(a);
    return looksLikeArtistFirst
      ? { songName: b.trim(), artistName: a.trim() }
      : { songName: a.trim(), artistName: b.trim() };
  }

  return { songName: title.replace(/\s*[\[(|].*$/, '').trim(), artistName: channelTitle };
}

// ============================================================
// Strategy 1: DJ Track Audio Analysis API（メイン — 最高精度）
// Spotify IDから audio features + genres + mood scores を1回で取得
// ============================================================
async function fetchDJTrackAnalysis(spotifyId) {
  try {
    const url = `https://dj-track-audio-analysis-api.p.rapidapi.com/v2/audio-analysis/${spotifyId}`;
    console.log(`[DJ Track] Calling: ${url}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': getRapidApiKey(),
        'x-rapidapi-host': 'dj-track-audio-analysis-api.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      console.error(`[DJ Track] Error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    console.log('[DJ Track] raw response:', JSON.stringify(data).slice(0, 500));

    return {
      energy: data.score?.energy,
      danceability: data.score?.danceability,
      acousticness: data.score?.acousticness,
      instrumentalness: data.score?.instrumentalness,
      valence: data.score?.valence,
      speechiness: data.score?.speechiness,
      liveness: data.score?.liveness,
      tempo: data.rhythm?.bpm ? Math.round(data.rhythm.bpm) : null,
      time_signature: data.rhythm?.beats_per_bar,
      key: data.harmony?.key,
      mode: data.harmony?.mode,
      camelot: data.harmony?.camelot,
      note: data.harmony?.note,
      dance_floor: data.score?.dance_floor,
      chill: data.score?.chill,
      aggressive: data.score?.aggressive,
      hype: data.score?.hype,
      groove: data.score?.groove,
      warmup: data.score?.warmup,
      peak_time: data.score?.peak_time,
      genres: data.genres || [],
      trackName: data.track?.name,
      popularity: data.track?.popularity,
      duration_ms: data.track?.duration_ms,
      loudness: data.track?.loudness_db,
      isVocalHeavy: data.track?.is_vocal_heavy,
      isAcoustic: data.track?.is_acoustic,
      spotify_id: spotifyId,
      source: 'dj_track_analysis',
      _raw: data,
    };
  } catch (error) {
    console.error('[DJ Track] Fetch error:', error.message);
    return null;
  }
}

// ============================================================
// Strategy 2: Spotify Extended API — /search でSpotify IDを取得
// YouTube URL等、Spotify IDがない場合に使用
// ============================================================
async function searchSpotifyExtended(songName, artistName) {
  try {
    const query = encodeURIComponent(
      artistName ? `track:${songName} artist:${artistName}` : songName
    );
    const url = `https://spotify-extended-audio-features-api.p.rapidapi.com/v1/search?q=${query}&type=track&limit=1`;
    console.log(`[Spotify Extended] Searching: ${url}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': getRapidApiKey(),
        'x-rapidapi-host': 'spotify-extended-audio-features-api.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      console.error(`[Spotify Extended Search] Error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log('[Spotify Extended] search result:', JSON.stringify(data).slice(0, 300));
    const tracks = data?.tracks?.items;
    if (tracks && tracks.length > 0) {
      return {
        spotifyId: tracks[0].id,
        name: tracks[0].name,
        artist: tracks[0].artists?.[0]?.name,
        albumImageUrl: tracks[0].album?.images?.[0]?.url || null,
        popularity: tracks[0].popularity,
        spotifyUrl: tracks[0].external_urls?.spotify,
      };
    }
    return null;
  } catch (error) {
    console.error('[Spotify Extended Search] Error:', error.message);
    return null;
  }
}

// ============================================================
// Strategy 3: SoundNet API（フォールバック、既存ロジック）
// ============================================================
async function fetchSoundNetFeatures(songName, artistName) {
  const params = new URLSearchParams({ song: songName, artist: artistName || '' });
  const endpoints = ['/pktx/query', '/pktx/key-bpm'];
  let raw = null;
  let lastError = '';

  for (const endpoint of endpoints) {
    let res;
    for (let attempt = 0; attempt <= 2; attempt++) {
      if (attempt > 0) {
        const waitMs = attempt * 2000;
        console.log(`[SoundNet] 429 rate limited on ${endpoint}, retrying in ${waitMs}ms...`);
        await new Promise(r => setTimeout(r, waitMs));
      }
      res = await fetch(
        `https://track-analysis.p.rapidapi.com${endpoint}?${params}`,
        {
          method: 'GET',
          headers: {
            'x-rapidapi-host': 'track-analysis.p.rapidapi.com',
            'x-rapidapi-key': getRapidApiKey(),
          },
        }
      );
      if (res.status !== 429) break;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      lastError = err.message || `SoundNet API error: ${res.status}`;
      continue;
    }

    raw = await res.json();
    console.log('[SoundNet] raw response from', endpoint, ':', JSON.stringify(raw).slice(0, 300));
    break;
  }

  if (!raw) return null;

  if (Array.isArray(raw)) {
    raw = raw[0] ?? null;
    if (!raw) return null;
  }

  const normalize = (v) => (v != null ? Math.min(1, Math.max(0, v / 100)) : null);

  const energy = normalize(raw.energy);
  const danceability = normalize(raw.danceability);
  const valence = normalize(raw.valence ?? raw.happiness);

  // If all key values are zero or null, treat as no data
  if (!energy && !danceability && !valence) {
    console.log('[SoundNet] All values are 0/null, treating as no data');
    return null;
  }

  return {
    energy,
    danceability,
    acousticness: normalize(raw.acousticness),
    instrumentalness: normalize(raw.instrumentalness),
    valence,
    speechiness: normalize(raw.speechiness),
    liveness: normalize(raw.liveness),
    tempo: raw.tempo ?? raw.bpm ?? null,
    key: raw.key ?? null,
    loudness: raw.loudness ?? null,
    genres: [],
    source: 'soundnet_fallback',
  };
}

// ============================================================
// POST /api/track/analyze
// Body: { trackUrl?, songName?, artistName? }
//
// Response (unified):
//   { songName, artistName, audioFeatures, source, analysisSource,
//     trackInfo, matchData, metadata }
// ============================================================
export async function POST(request) {
  try {
    const { trackUrl, songName: inputSong, artistName: inputArtist } = await request.json();

    let songName = inputSong?.trim() || '';
    let artistName = inputArtist?.trim() || '';
    let metadata = {};

    // --- YouTube URL → メタデータ取得 ---
    if (trackUrl && /youtube\.com\/|youtu\.be\//.test(trackUrl)) {
      try {
        const yt = await fetchYouTubeTrack(trackUrl);
        metadata = { rawTitle: yt.rawTitle, channelTitle: yt.channelTitle, source: 'youtube' };
        if (!songName) songName = yt.songName;
        if (!artistName) artistName = yt.artistName;
      } catch (e) {
        console.warn('[YouTube] Parse warning:', e.message);
      }
    }

    // --- キャッシュチェック: track_features テーブル ---
    if (trackUrl) {
      try {
        const { data: cached } = await getSupabase()
          .from('track_features')
          .select('*')
          .eq('track_url', trackUrl)
          .maybeSingle();

        const hasRealData = cached && (cached.energy > 0 || cached.danceability > 0 || cached.valence > 0);
        if (cached && cached.source && cached.source !== 'manual' && hasRealData) {
          console.log(`[Cache Hit] ${trackUrl} — source: ${cached.source}`);
          const af = {
            energy: cached.energy,
            danceability: cached.danceability,
            acousticness: cached.acousticness,
            instrumentalness: cached.instrumentalness,
            valence: cached.valence,
            speechiness: cached.speechiness,
            liveness: cached.liveness,
            tempo: cached.tempo,
            genres: cached.genres || [],
            moods: cached.moods || [],
          };
          return NextResponse.json({
            songName: cached.song_name || songName,
            artistName: cached.artist_name || artistName,
            audioFeatures: af,
            source: cached.source,
            analysisSource: cached.source + '_cached',
            metadata,
            matchData: {
              energy: cached.energy,
              danceability: cached.danceability,
              acousticness: cached.acousticness,
              instrumentalness: cached.instrumentalness,
              valence: cached.valence,
              tempo: cached.tempo,
            },
          });
        }
      } catch (e) {
        // track_features テーブルが存在しない場合はスキップ
        console.warn('[Cache] Skipped:', e.message);
      }
    }

    // === Strategy 1: Spotify URL → DJ Track Audio Analysis（1コール） ===
    let audioFeatures = null;
    let analysisSource = 'none';
    let trackInfo = {};

    const spotifyId = extractSpotifyId(trackUrl);

    if (spotifyId) {
      console.log(`[DJ Track] Spotify ID detected: ${spotifyId}`);
      audioFeatures = await fetchDJTrackAnalysis(spotifyId);

      if (audioFeatures) {
        analysisSource = 'dj_track_direct';
        songName = audioFeatures.trackName || songName;
        trackInfo = {
          name: songName,
          artist: artistName,
          popularity: audioFeatures.popularity,
          genres: audioFeatures.genres,
          spotifyId,
        };
        console.log(`[DJ Track] Success: ${songName}, genres: ${audioFeatures.genres?.join(', ')}`);
      }
    }

    // === Strategy 2: YouTube等 → Spotify Extended検索 → DJ Track Analysis ===
    if (!audioFeatures && songName) {
      console.log(`[Spotify Extended] Searching: "${songName}" by "${artistName}"`);
      const searchResult = await searchSpotifyExtended(songName, artistName || '');

      if (searchResult?.spotifyId) {
        console.log(`[Spotify Extended] Found: ${searchResult.name} (${searchResult.spotifyId})`);
        audioFeatures = await fetchDJTrackAnalysis(searchResult.spotifyId);

        if (audioFeatures) {
          analysisSource = 'dj_track_via_search';
          trackInfo = {
            name: searchResult.name || songName,
            artist: searchResult.artist || artistName,
            albumImageUrl: searchResult.albumImageUrl,
            popularity: searchResult.popularity,
            spotifyUrl: searchResult.spotifyUrl,
            genres: audioFeatures.genres,
          };
        }
      }
    }

    // === Strategy 3: SoundNet フォールバック ===
    if (!audioFeatures && songName) {
      console.log(`[SoundNet] Fallback: "${songName}" by "${artistName}"`);
      try {
        audioFeatures = await fetchSoundNetFeatures(songName, artistName || '');
        if (audioFeatures) {
          analysisSource = 'soundnet_fallback';
          trackInfo = { name: songName, artist: artistName };
        }
      } catch (e) {
        console.warn('[SoundNet] Error:', e.message);
      }
    }

    // === songName が取れない場合 ===
    if (!songName) {
      const hint = trackUrl
        ? 'Could not extract song name from URL. Enter song title manually.'
        : 'Please provide songName.';
      return NextResponse.json({
        songName: '',
        artistName,
        audioFeatures: null,
        source: 'url',
        analysisSource: 'none',
        metadata,
        soundnetError: hint,
      });
    }

    // === 全て失敗した場合 ===
    if (!audioFeatures) {
      return NextResponse.json({
        songName,
        artistName,
        audioFeatures: null,
        source: 'manual',
        analysisSource: 'none',
        metadata,
        soundnetError: 'Could not analyze track via any API.',
      });
    }

    // === track_features テーブルに保存（upsert） ===
    const moods = [
      audioFeatures.chill > 0.6 && 'chill',
      audioFeatures.aggressive > 0.6 && 'aggressive',
      audioFeatures.hype > 0.6 && 'hype',
      audioFeatures.groove > 0.6 && 'groovy',
      audioFeatures.dance_floor > 0.6 && 'dance',
    ].filter(Boolean);

    if (trackUrl) {
      try {
        const featureRecord = {
          track_url: trackUrl,
          song_name: trackInfo?.name || songName,
          artist_name: trackInfo?.artist || artistName,
          energy: audioFeatures.energy,
          danceability: audioFeatures.danceability,
          acousticness: audioFeatures.acousticness,
          instrumentalness: audioFeatures.instrumentalness,
          valence: audioFeatures.valence,
          speechiness: audioFeatures.speechiness,
          liveness: audioFeatures.liveness,
          tempo: audioFeatures.tempo,
          key: audioFeatures.key != null ? String(audioFeatures.key) : null,
          mode: audioFeatures.mode || null,
          loudness: audioFeatures.loudness != null ? String(audioFeatures.loudness) : null,
          popularity: trackInfo?.popularity || audioFeatures.popularity,
          genres: audioFeatures.genres || [],
          moods,
          source: analysisSource,
          confidence: analysisSource.startsWith('dj_track') ? 0.95 : 0.5,
          raw_response: analysisSource.startsWith('dj_track') ? audioFeatures._raw : null,
        };

        const { data: existing } = await getSupabase()
          .from('track_features')
          .select('id')
          .eq('track_url', trackUrl)
          .maybeSingle();

        if (existing) {
          await getSupabase().from('track_features').update(featureRecord).eq('id', existing.id);
        } else {
          await getSupabase().from('track_features').insert(featureRecord);
        }
      } catch (e) {
        console.warn('[DB Save] Skipped:', e.message);
      }
    }

    // === レスポンス（既存フロントエンド互換性を維持） ===
    return NextResponse.json({
      songName: trackInfo?.name || songName,
      artistName: trackInfo?.artist || artistName,
      audioFeatures: {
        energy: audioFeatures.energy,
        danceability: audioFeatures.danceability,
        acousticness: audioFeatures.acousticness,
        instrumentalness: audioFeatures.instrumentalness,
        valence: audioFeatures.valence,
        speechiness: audioFeatures.speechiness,
        liveness: audioFeatures.liveness,
        tempo: audioFeatures.tempo,
        key: audioFeatures.key,
        mode: audioFeatures.mode,
        // DJ/Mood スコア（DJ Track APIの場合のみ）
        chill: audioFeatures.chill,
        aggressive: audioFeatures.aggressive,
        hype: audioFeatures.hype,
        groove: audioFeatures.groove,
        dance_floor: audioFeatures.dance_floor,
        // ジャンル
        genres: audioFeatures.genres || [],
        moods,
      },
      source: analysisSource.startsWith('dj_track') ? 'spotify' : (metadata.source || 'manual'),
      analysisSource,
      metadata,
      matchData: {
        energy: audioFeatures.energy,
        danceability: audioFeatures.danceability,
        acousticness: audioFeatures.acousticness,
        instrumentalness: audioFeatures.instrumentalness,
        valence: audioFeatures.valence,
        tempo: audioFeatures.tempo,
      },
    });

  } catch (error) {
    console.error('[Track Analyze] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
