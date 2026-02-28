import { NextResponse } from 'next/server';

// ── YouTube Data API v3 ──
async function fetchYouTubeFollowers(url) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;

  // Extract channel ID or handle
  let channelParam = '';
  const handleMatch = url.match(/youtube\.com\/@([^/?]+)/);
  const channelMatch = url.match(/youtube\.com\/channel\/([^/?]+)/);
  
  if (handleMatch) {
    // Search by handle
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(handleMatch[1])}&key=${apiKey}`
    );
    const searchData = await searchRes.json();
    if (searchData.items?.[0]) channelParam = `id=${searchData.items[0].snippet.channelId}`;
  } else if (channelMatch) {
    channelParam = `id=${channelMatch[1]}`;
  }

  if (!channelParam) return null;

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=statistics&${channelParam}&key=${apiKey}`
  );
  const data = await res.json();
  return data.items?.[0]?.statistics?.subscriberCount
    ? parseInt(data.items[0].statistics.subscriberCount)
    : null;
}

// ── Spotify Web API ──
async function fetchSpotifyFollowers(url) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  // Extract artist ID
  const artistMatch = url.match(/artist\/([a-zA-Z0-9]+)/);
  if (!artistMatch) return null;

  // Get access token (client credentials flow)
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) return null;

  // Get artist data
  const artistRes = await fetch(
    `https://api.spotify.com/v1/artists/${artistMatch[1]}`,
    { headers: { 'Authorization': `Bearer ${tokenData.access_token}` } }
  );
  const artistData = await artistRes.json();
  
  return {
    followers: artistData.followers?.total || null,
    monthlyListeners: null, // Not available via standard API
    genres: artistData.genres || [],
    popularity: artistData.popularity || null,
    image: artistData.images?.[0]?.url || null,
  };
}

// ── SoundCloud (public page scrape — no official API) ──
async function fetchSoundCloudFollowers(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OTONAMI/1.0)' },
    });
    const html = await res.text();
    // Try to extract from meta tags or JSON-LD
    const followerMatch = html.match(/"followers_count"\s*:\s*(\d+)/);
    return followerMatch ? parseInt(followerMatch[1]) : null;
  } catch {
    return null;
  }
}

export async function POST(request) {
  try {
    const { links } = await request.json();
    if (!links) return NextResponse.json({ error: 'links required' }, { status: 400 });

    const results = {};
    const errors = {};

    // Fetch in parallel
    const tasks = [];

    if (links.youtube) {
      tasks.push(
        fetchYouTubeFollowers(links.youtube)
          .then(v => { if (v) results.youtube = v; })
          .catch(e => { errors.youtube = e.message; })
      );
    }

    if (links.spotify) {
      tasks.push(
        fetchSpotifyFollowers(links.spotify)
          .then(v => {
            if (v) {
              results.spotify = v.followers;
              if (v.genres?.length) results.spotifyGenres = v.genres;
              if (v.popularity) results.spotifyPopularity = v.popularity;
              if (v.image) results.spotifyImage = v.image;
            }
          })
          .catch(e => { errors.spotify = e.message; })
      );
    }

    if (links.soundcloud) {
      tasks.push(
        fetchSoundCloudFollowers(links.soundcloud)
          .then(v => { if (v) results.soundcloud = v; })
          .catch(e => { errors.soundcloud = e.message; })
      );
    }

    // Instagram, X, Facebook — require authenticated API access
    // These are noted as needing future setup
    if (links.instagram) {
      results._note_instagram = 'Instagram Business API requires Facebook App Review. Manual entry for now.';
    }
    if (links.twitter) {
      results._note_twitter = 'X API v2 requires paid Basic tier ($100/mo). Manual entry for now.';
    }

    await Promise.all(tasks);

    return NextResponse.json({ followers: results, errors });
  } catch (error) {
    console.error('Social fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
