import { NextResponse } from 'next/server';

// ── YouTube: Use forHandle for accurate lookup ──
async function fetchYouTubeFollowers(url) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;

  try {
    let channelParam = '';
    const handleMatch = url.match(/youtube\.com\/@([^/?]+)/);
    const channelMatch = url.match(/youtube\.com\/channel\/([^/?]+)/);

    if (handleMatch) {
      // Use forHandle for exact match (not search which can return wrong results)
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics&forHandle=${encodeURIComponent(handleMatch[1])}&key=${apiKey}`
      );
      const data = await res.json();
      const count = data.items?.[0]?.statistics?.subscriberCount;
      if (count) return parseInt(count);
    } else if (channelMatch) {
      channelParam = `id=${channelMatch[1]}`;
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics&${channelParam}&key=${apiKey}`
      );
      const data = await res.json();
      const count = data.items?.[0]?.statistics?.subscriberCount;
      if (count) return parseInt(count);
    }
  } catch (e) {
    console.log('YouTube API error:', e.message);
  }
  return null;
}

// ── Spotify: API ──
async function fetchSpotifyData(url) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const artistMatch = url.match(/artist\/([a-zA-Z0-9]+)/);
    if (!artistMatch) return null;

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

    const artistRes = await fetch(
      `https://api.spotify.com/v1/artists/${artistMatch[1]}`,
      { headers: { 'Authorization': `Bearer ${tokenData.access_token}` } }
    );
    const artistData = await artistRes.json();
    return {
      followers: artistData.followers?.total || 0,
      genres: artistData.genres || [],
      popularity: artistData.popularity || null,
      image: artistData.images?.[0]?.url || null,
      name: artistData.name || null,
    };
  } catch (e) {
    console.log('Spotify API error:', e.message);
    return null;
  }
}

// ── SoundCloud: scrape ──
async function fetchSoundCloudFollowers(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    });
    const html = await res.text();
    const followerMatch = html.match(/"followers_count"\s*:\s*(\d+)/);
    return followerMatch ? parseInt(followerMatch[1]) : null;
  } catch { return null; }
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
          .then(v => { if (v) results.youtube = v; })
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
              if (v.image) results.spotifyImage = v.image;
              if (v.name) results.spotifyName = v.name;
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

    await Promise.all(tasks);

    // Helpful message if no results
    if (Object.keys(results).length === 0) {
      const missingKeys = [];
      if (links.youtube && !process.env.YOUTUBE_API_KEY) missingKeys.push('YOUTUBE_API_KEY');
      if (links.spotify && !process.env.SPOTIFY_CLIENT_ID) missingKeys.push('SPOTIFY_CLIENT_ID/SECRET');
      if (missingKeys.length > 0) {
        errors._note = 'APIキー未設定: ' + missingKeys.join(', ');
      }
    }

    return NextResponse.json({ followers: results, errors });
  } catch (error) {
    console.error('Social fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
