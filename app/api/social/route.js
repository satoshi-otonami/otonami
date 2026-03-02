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

// ── Spotify: API first, then scrape fallback ──
async function fetchSpotifyData(url) {
  const artistMatch = url.match(/artist\/([a-zA-Z0-9]+)/);
  if (!artistMatch) throw new Error('No artist ID in URL');
  const artistId = artistMatch[1];

  // Method 1: Official API
  const apiResult = await trySpotifyAPI(artistId);
  if (apiResult) return apiResult;

  // Method 2: Scrape public artist page
  const scrapeResult = await trySpotifyScrape(artistId);
  if (scrapeResult) return scrapeResult;

  throw new Error('Both API and scrape methods failed');
}

async function trySpotifyAPI(artistId) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      },
      body: 'grant_type=client_credentials',
    });
    if (!tokenRes.ok) return null;
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return null;

    const artistRes = await fetch(
      `https://api.spotify.com/v1/artists/${artistId}`,
      { headers: { 'Authorization': `Bearer ${tokenData.access_token}` } }
    );
    if (!artistRes.ok) return null;

    const d = await artistRes.json();
    return {
      followers: d.followers?.total || 0,
      genres: d.genres || [],
      popularity: d.popularity || null,
      name: d.name || null,
    };
  } catch { return null; }
}

async function trySpotifyScrape(artistId) {
  try {
    // Spotify's internal API used by the web embed
    const res = await fetch(`https://open.spotify.com/artist/${artistId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    const html = await res.text();

    // Try multiple patterns for follower count
    let followers = null;
    let name = null;

    // Pattern 1: JSON-LD or meta data
    const followerPatterns = [
      /"followers"\s*:\s*\{\s*"total"\s*:\s*(\d+)/,
      /followers.*?(\d[\d,]+)/i,
      /"followerCount"\s*:\s*(\d+)/,
      /interactionCount.*?(\d+)/,
    ];
    for (const p of followerPatterns) {
      const m = html.match(p);
      if (m) { followers = parseInt(m[1].replace(/,/g, '')); break; }
    }

    // Get name
    const nameMatch = html.match(/<title>([^<]+?)(?:\s*[-–|]|\s*on Spotify)/i) ||
                       html.match(/"name"\s*:\s*"([^"]+)"/);
    if (nameMatch) name = nameMatch[1].trim();

    if (followers !== null) {
      return { followers, genres: [], popularity: null, name };
    }

    // Pattern 2: Try Spotify's oEmbed for at least the name
    const oembedRes = await fetch(`https://open.spotify.com/oembed?url=https://open.spotify.com/artist/${artistId}`);
    if (oembedRes.ok) {
      const oembedData = await oembedRes.json();
      // oEmbed doesn't have followers, but confirms artist exists
      return { followers: 0, genres: [], popularity: null, name: oembedData.title || null, note: 'followers unavailable via scrape' };
    }

    return null;
  } catch { return null; }
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
          if (v.note) results.spotifyNote = v.note;
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
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}
