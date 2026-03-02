import { NextResponse } from 'next/server';

// ── YouTube: Use forHandle for accurate lookup ──
async function fetchYouTubeFollowers(url) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error('YOUTUBE_API_KEY not set');

  const handleMatch = url.match(/youtube\.com\/@([^/?]+)/);
  const channelMatch = url.match(/youtube\.com\/channel\/([^/?]+)/);

  if (handleMatch) {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics&forHandle=${encodeURIComponent(handleMatch[1])}&key=${apiKey}`
    );
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || 'YouTube API error');
    const count = data.items?.[0]?.statistics?.subscriberCount;
    if (count) return parseInt(count);
    throw new Error('Channel not found for handle: ' + handleMatch[1]);
  } else if (channelMatch) {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelMatch[1]}&key=${apiKey}`
    );
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || 'YouTube API error');
    const count = data.items?.[0]?.statistics?.subscriberCount;
    if (count) return parseInt(count);
    throw new Error('Channel not found');
  }
  throw new Error('Could not parse YouTube URL');
}

// ── Spotify: API with proper error handling ──
async function fetchSpotifyData(url) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('SPOTIFY credentials not set');

  const artistMatch = url.match(/artist\/([a-zA-Z0-9]+)/);
  if (!artistMatch) throw new Error('No artist ID in URL');

  // Step 1: Get token
  const authString = `${clientId}:${clientSecret}`;
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(authString).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });

  // Check if response is OK before parsing
  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Spotify token error (${tokenRes.status}): ${errText.substring(0, 150)}`);
  }

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error('No access_token in response: ' + JSON.stringify(tokenData).substring(0, 150));
  }

  // Step 2: Get artist
  const artistRes = await fetch(
    `https://api.spotify.com/v1/artists/${artistMatch[1]}`,
    { headers: { 'Authorization': `Bearer ${tokenData.access_token}` } }
  );

  if (!artistRes.ok) {
    const errText = await artistRes.text();
    throw new Error(`Spotify artist error (${artistRes.status}): ${errText.substring(0, 150)}`);
  }

  const artistData = await artistRes.json();
  return {
    followers: artistData.followers?.total || 0,
    genres: artistData.genres || [],
    popularity: artistData.popularity || null,
    name: artistData.name || null,
  };
}

// ── SoundCloud: scrape ──
async function fetchSoundCloudFollowers(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
  });
  const html = await res.text();
  const followerMatch = html.match(/"followers_count"\s*:\s*(\d+)/);
  if (followerMatch) return parseInt(followerMatch[1]);
  throw new Error('Could not find follower count');
}

export async function POST(request) {
  try {
    const { links } = await request.json();
    if (!links) return NextResponse.json({ error: 'links required' }, { status: 400 });

    const results = {};
    const errors = {};
    const tasks = [];

    if (links.youtube) {
      tasks.push(
        fetchYouTubeFollowers(links.youtube)
          .then(v => { results.youtube = v; })
          .catch(e => { errors.youtube = e.message; })
      );
    }
    if (links.spotify) {
      tasks.push(
        fetchSpotifyData(links.spotify)
          .then(v => {
            if (v) {
              results.spotify = v.followers;
              if (v.genres?.length) results.spotifyGenres = v.genres;
              if (v.popularity) results.spotifyPopularity = v.popularity;
              if (v.name) results.spotifyName = v.name;
            }
          })
          .catch(e => { errors.spotify = e.message; })
      );
    }
    if (links.soundcloud) {
      tasks.push(
        fetchSoundCloudFollowers(links.soundcloud)
          .then(v => { results.soundcloud = v; })
          .catch(e => { errors.soundcloud = e.message; })
      );
    }

    await Promise.all(tasks);
    return NextResponse.json({ followers: results, errors });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET endpoint for diagnostics
export async function GET() {
  const spotifyId = process.env.SPOTIFY_CLIENT_ID || '';
  const spotifySecret = process.env.SPOTIFY_CLIENT_SECRET || '';
  const youtubeKey = process.env.YOUTUBE_API_KEY || '';
  return NextResponse.json({
    spotify_id_set: !!spotifyId,
    spotify_id_length: spotifyId.length,
    spotify_id_preview: spotifyId.substring(0, 6) + '...',
    spotify_secret_set: !!spotifySecret,
    spotify_secret_length: spotifySecret.length,
    youtube_key_set: !!youtubeKey,
    youtube_key_length: youtubeKey.length,
  });
}
