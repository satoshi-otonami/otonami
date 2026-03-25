import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { youtube_url, spotify_url } = await request.json();
    let thumbnailUrl = null;

    // 1. YouTube thumbnail (no API key needed, derived from URL structure)
    if (youtube_url) {
      let videoId = null;
      const match1 = youtube_url.match(/[?&]v=([^&]+)/);
      const match2 = youtube_url.match(/youtu\.be\/([^?&]+)/);
      videoId = match1?.[1] || match2?.[1];
      if (videoId) {
        thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }
    }

    // 2. Spotify album art (oEmbed API, no API key needed)
    if (!thumbnailUrl && spotify_url) {
      try {
        const oembedRes = await fetch(
          `https://open.spotify.com/oembed?url=${encodeURIComponent(spotify_url)}`
        );
        if (oembedRes.ok) {
          const oembedData = await oembedRes.json();
          if (oembedData.thumbnail_url) {
            thumbnailUrl = oembedData.thumbnail_url;
          }
        }
      } catch (e) {
        console.error('Spotify oEmbed error:', e);
      }
    }

    return NextResponse.json({ thumbnail_url: thumbnailUrl });
  } catch (error) {
    return NextResponse.json({ thumbnail_url: null }, { status: 200 });
  }
}
