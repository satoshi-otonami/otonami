import { NextResponse } from 'next/server';

// ── Spotify Token Cache (reuse for 1 hour) ──
let spotifyTokenCache = { token: null, expiresAt: 0 };

async function getSpotifyToken() {
  const now = Date.now();
  if (spotifyTokenCache.token && spotifyTokenCache.expiresAt > now) {
    return spotifyTokenCache.token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('SPOTIFY credentials not set');

  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Token error (${tokenRes.status}): ${errText.substring(0, 120)}`);
  }

  const data = await tokenRes.json();
  if (!data.access_token) throw new Error('No access_token in response');

  // Cache for 50 minutes (token lasts 60 min)
  spotifyTokenCache = { token: data.access_token, expiresAt: now + 50 * 60 * 1000 };
  return data.access_token;
}

// ── YouTube ──
async function fetchYouTubeFollowers(url) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY not set');

  const handleMatch = url.match(/youtube\.com\/@([^/?]+)/);
  const channelMatch = url.match(/youtube\.com\/channel\/([^/?]+)/);

  let apiUrl = '';
  if (handleMatch) {
    apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics&forHandle=${encodeURIComponent(handleMatch[1])}&key=${apiKey}`;
  } else if (channelMatch) {
    apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelMatch[1]}&key=${apiKey}`;
  } else {
    throw new Error('Could not parse YouTube URL');
  }

  const res = await fetch(apiUrl);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const count = data.items?.[0]?.statistics?.subscriberCount;
  if (count) return parseInt(count);
  throw new Error('Channel not found');
}

// ── Spotify: single token, retry only artist call ──
async function fetchSpotifyData(url) {
  const artistMatch = url.match(/artist\/([a-zA-Z0-9]+)/);
  if (!artistMatch) throw new Error('No artist ID in URL');

  const token = await getSpotifyToken();

  // Retry only the artist endpoint (not token)
  for (let attempt = 0; attempt < 3; attempt++) {
    const artistRes = await fetch(
      `https://api.spotify.com/v1/artists/${artistMatch[1]}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (artistRes.ok) {
      const artistData = await artistRes.json();
      return {
        followers: artistData.followers?.total || 0,
        genres: artistData.genres || [],
        popularity: artistData.popularity || null,
        name: artistData.name || null,
      };
    }

    // If 429 (rate limited), wait and retry
    if (artistRes.status === 429) {
      const retryAfter = parseInt(artistRes.headers.get('retry-after') || '3');
      await new Promise(r => setTimeout(r, retryAfter * 1000));
      continue;
    }

    // If 403, wait longer and retry (Spotify dev mode throttle)
    if (artistRes.status === 403) {
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
        continue;
      }
      // Final attempt failed - clear token cache and throw
      spotifyTokenCache = { token: null, expiresAt: 0 };
      const errText = await artistRes.text();
      throw new Error(`Spotify 403 after ${attempt + 1} attempts: ${errText.substring(0, 100)}`);
    }

    // Other errors
    const errText = await artistRes.text();
    throw new Error(`Spotify error (${artistRes.status}): ${errText.substring(0, 100)}`);
  }
}

// ── SoundCloud ──
async function fetchSoundCloudFollowers(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
  });
  const html = await res.text();
  const m = html.match(/"followers_count"\s*:\s*(\d+)/);
  if (m) return parseInt(m[1]);
  throw new Error('Could not find follower count');
}

export async function POST(request) {
  try {
    const { links } = await request.json();
    if (!links) return NextResponse.json({ error: 'links required' }, { status: 400 });

    const results = {};
    const errors = {};

    // Run YouTube and SoundCloud in parallel, Spotify separately to reduce rate limit pressure
    const parallelTasks = [];
    if (links.youtube) {
      parallelTasks.push(fetchYouTubeFollowers(links.youtube).then(v => { results.youtube = v; }).catch(e => { errors.youtube = e.message; }));
    }
    if (links.soundcloud) {
      parallelTasks.push(fetchSoundCloudFollowers(links.soundcloud).then(v => { results.soundcloud = v; }).catch(e => { errors.soundcloud = e.message; }));
    }
    await Promise.all(parallelTasks);

    // Spotify after others to give it breathing room
    if (links.spotify) {
      try {
        const v = await fetchSpotifyData(links.spotify);
        if (v) {
          results.spotify = v.followers;
          if (v.genres?.length) results.spotifyGenres = v.genres;
          if (v.popularity) results.spotifyPopularity = v.popularity;
          if (v.name) results.spotifyName = v.name;
        }
      } catch (e) {
        errors.spotify = e.message;
      }
    }

    return NextResponse.json({ followers: results, errors });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Diagnostics
export async function GET() {
  const sid = process.env.SPOTIFY_CLIENT_ID || '';
  const ss = process.env.SPOTIFY_CLIENT_SECRET || '';
  const yk = process.env.YOUTUBE_API_KEY || '';

  // Test Spotify token
  let tokenTest = 'not tested';
  let artistTest = 'not tested';
  try {
    const token = await getSpotifyToken();
    tokenTest = 'OK (token obtained)';
    // Test with a known artist (Spotify itself)
    const testRes = await fetch('https://api.spotify.com/v1/artists/0LyfQWJT6nXafLPZqxe9Of', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    artistTest = `${testRes.status} ${testRes.statusText}`;
    if (testRes.ok) {
      const d = await testRes.json();
      artistTest = `OK - ${d.name} (${d.followers?.total} followers)`;
    }
  } catch (e) {
    tokenTest = 'ERROR: ' + e.message;
  }

  return NextResponse.json({
    spotify_id_set: !!sid, spotify_id_len: sid.length, spotify_id_preview: sid.substring(0,6)+'...',
    spotify_secret_set: !!ss, spotify_secret_len: ss.length,
    youtube_key_set: !!yk, youtube_key_len: yk.length,
    spotify_token_test: tokenTest,
    spotify_artist_test: artistTest,
  });
}
