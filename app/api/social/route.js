import { NextResponse } from 'next/server';

// ── YouTube: Try API first, fallback to page scrape ──
async function fetchYouTubeFollowers(url) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (apiKey) {
    try {
      let channelParam = '';
      const handleMatch = url.match(/youtube\.com\/@([^/?]+)/);
      const channelMatch = url.match(/youtube\.com\/channel\/([^/?]+)/);
      if (handleMatch) {
        const searchRes = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(handleMatch[1])}&key=${apiKey}`
        );
        const searchData = await searchRes.json();
        if (searchData.items?.[0]) channelParam = `id=${searchData.items[0].snippet.channelId}`;
      } else if (channelMatch) {
        channelParam = `id=${channelMatch[1]}`;
      }
      if (channelParam) {
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
  }

  // Fallback: scrape page
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    const html = await res.text();
    const patterns = [
      /"subscriberCountText":\s*\{\s*"simpleText":\s*"([^"]+)"/,
      /"subscriberCountText":\s*\{\s*"accessibility":\s*\{\s*"accessibilityData":\s*\{\s*"label":\s*"([^"]+)"/,
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const text = match[1];
        const numMatch = text.match(/([\d.]+)\s*([KMBkm])?/i);
        if (numMatch) {
          let num = parseFloat(numMatch[1]);
          const suffix = (numMatch[2] || '').toUpperCase();
          if (suffix === 'K') num *= 1000;
          else if (suffix === 'M') num *= 1000000;
          else if (suffix === 'B') num *= 1000000000;
          return Math.round(num);
        }
      }
    }
  } catch (e) {
    console.log('YouTube scrape failed:', e.message);
  }
  return null;
}

// ── Spotify: API or scrape ──
async function fetchSpotifyFollowers(url) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (clientId && clientSecret) {
    try {
      const artistMatch = url.match(/artist\/([a-zA-Z0-9]+)/);
      if (artistMatch) {
        const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
          },
          body: 'grant_type=client_credentials',
        });
        const tokenData = await tokenRes.json();
        if (tokenData.access_token) {
          const artistRes = await fetch(
            `https://api.spotify.com/v1/artists/${artistMatch[1]}`,
            { headers: { 'Authorization': `Bearer ${tokenData.access_token}` } }
          );
          const artistData = await artistRes.json();
          return {
            followers: artistData.followers?.total || null,
            genres: artistData.genres || [],
            popularity: artistData.popularity || null,
            image: artistData.images?.[0]?.url || null,
          };
        }
      }
    } catch (e) {
      console.log('Spotify API error:', e.message);
    }
  }

  // Fallback: scrape
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    const html = await res.text();
    const listenersMatch = html.match(/([\d,]+)\s*monthly listeners/i);
    const followersMatch = html.match(/"followers":\s*\{\s*"total":\s*(\d+)/);
    if (followersMatch) return { followers: parseInt(followersMatch[1]) };
    if (listenersMatch) return { followers: parseInt(listenersMatch[1].replace(/,/g, '')) };
  } catch (e) {
    console.log('Spotify scrape failed:', e.message);
  }
  return null;
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

    await Promise.all(tasks);

    // Helpful message if no results
    if (Object.keys(results).length === 0) {
      const missingKeys = [];
      if (links.youtube && !process.env.YOUTUBE_API_KEY) missingKeys.push('YOUTUBE_API_KEY');
      if (links.spotify && !process.env.SPOTIFY_CLIENT_ID) missingKeys.push('SPOTIFY_CLIENT_ID/SECRET');
      if (missingKeys.length > 0) {
        errors._note = 'APIキー未設定のため自動取得できませんでした。手動入力するか、Vercel環境変数に追加してください: ' + missingKeys.join(', ');
      }
    }

    return NextResponse.json({ followers: results, errors });
  } catch (error) {
    console.error('Social fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
