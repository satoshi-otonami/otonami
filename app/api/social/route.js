import { NextResponse } from 'next/server';

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

// ── Spotify: Try 3 methods ──
async function fetchSpotifyData(url) {
  const artistMatch = url.match(/artist\/([a-zA-Z0-9]+)/);
  if (!artistMatch) throw new Error('No artist ID in URL');
  const artistId = artistMatch[1];

  const errors = [];

  // Method 1: Anonymous web token (what Spotify's web player uses)
  try {
    const tokenRes = await fetch('https://open.spotify.com/get_access_token?reason=transport&productType=web_player', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });
    if (tokenRes.ok) {
      const tokenData = await tokenRes.json();
      if (tokenData.accessToken) {
        const artistRes = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
          headers: { 'Authorization': `Bearer ${tokenData.accessToken}` },
        });
        if (artistRes.ok) {
          const d = await artistRes.json();
          return { followers: d.followers?.total || 0, genres: d.genres || [], popularity: d.popularity, name: d.name, method: 'anon_token' };
        }
        errors.push('anon_token artist: ' + artistRes.status);
      }
    }
  } catch (e) { errors.push('anon_token: ' + e.message); }

  // Method 2: Official API with client credentials
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    if (clientId && clientSecret) {
      const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
        },
        body: 'grant_type=client_credentials',
      });
      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        if (tokenData.access_token) {
          const artistRes = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
            headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
          });
          if (artistRes.ok) {
            const d = await artistRes.json();
            return { followers: d.followers?.total || 0, genres: d.genres || [], popularity: d.popularity, name: d.name, method: 'client_cred' };
          }
          errors.push('client_cred artist: ' + artistRes.status);
        }
      }
    }
  } catch (e) { errors.push('client_cred: ' + e.message); }

  // Method 3: Spotify embed page parse
  try {
    const embedRes = await fetch(`https://open.spotify.com/embed/artist/${artistId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    if (embedRes.ok) {
      const html = await embedRes.text();
      // Look for __NEXT_DATA__ or similar JSON blob
      const jsonMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
      if (jsonMatch) {
        const pageData = JSON.parse(jsonMatch[1]);
        // Navigate the data structure
        const state = pageData?.props?.pageProps;
        if (state?.state?.data?.entity) {
          const entity = state.state.data.entity;
          return {
            followers: entity.stats?.followers || entity.stats?.monthlyListeners || 0,
            name: entity.name || null,
            genres: [],
            popularity: null,
            method: 'embed_parse'
          };
        }
      }
      // Fallback: look for any follower/listener patterns in HTML
      const fMatch = html.match(/"followers"\s*:\s*(\d+)/) || html.match(/"followerCount"\s*:\s*(\d+)/);
      const nMatch = html.match(/"name"\s*:\s*"([^"]+)"/);
      if (fMatch) {
        return { followers: parseInt(fMatch[1]), name: nMatch?.[1] || null, genres: [], popularity: null, method: 'embed_regex' };
      }
    }
  } catch (e) { errors.push('embed: ' + e.message); }

  throw new Error('All 3 methods failed: ' + errors.join(' | '));
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
    const tasks = [];

    if (links.youtube) {
      tasks.push(fetchYouTubeFollowers(links.youtube).then(v => { results.youtube = v; }).catch(e => { errors.youtube = e.message; }));
    }
    if (links.soundcloud) {
      tasks.push(fetchSoundCloudFollowers(links.soundcloud).then(v => { results.soundcloud = v; }).catch(e => { errors.soundcloud = e.message; }));
    }
    if (links.spotify) {
      tasks.push(fetchSpotifyData(links.spotify).then(v => {
        if (v) {
          results.spotify = v.followers;
          if (v.genres?.length) results.spotifyGenres = v.genres;
          if (v.popularity) results.spotifyPopularity = v.popularity;
          if (v.name) results.spotifyName = v.name;
          results.spotifyMethod = v.method;
        }
      }).catch(e => { errors.spotify = e.message; }));
    }

    await Promise.all(tasks);
    return NextResponse.json({ followers: results, errors });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', methods: ['anon_token', 'client_credentials', 'embed_parse'] });
}
