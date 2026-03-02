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
    throw new Error('Channel not found for ID: ' + channelMatch[1]);
  }
  throw new Error('Could not parse YouTube URL');
}

// ── Spotify: API ──
async function fetchSpotifyData(url) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('SPOTIFY_CLIENT_ID/SECRET not set');

  // Support both /artist/ID and /intl-XX/artist/ID formats
  const artistMatch = url.match(/artist\/([a-zA-Z0-9]+)/);
  if (!artistMatch) throw new Error('Artist ID not found in URL: ' + url.substring(0, 80));

  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error('Spotify token failed: ' + JSON.stringify(tokenData).substring(0, 100));

  const artistRes = await fetch(
    `https://api.spotify.com/v1/artists/${artistMatch[1]}`,
    { headers: { 'Authorization': `Bearer ${tokenData.access_token}` } }
  );
  const artistData = await artistRes.json();
  if (artistData.error) throw new Error('Spotify artist error: ' + (artistData.error.message || artistData.error.status));

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
  throw new Error('Could not find follower count on page');
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
