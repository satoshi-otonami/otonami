// app/api/promo/caption/route.js
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      trackTitle,
      artistName,
      genres = [],
      moods = [],
      releaseDate,
      bio,
      spotifyUrl,
      youtubeUrl,
      language = 'both'
    } = body;

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const platformLinks = [
      spotifyUrl && `Spotify: ${spotifyUrl}`,
      youtubeUrl && `YouTube: ${youtubeUrl}`
    ].filter(Boolean).join('\n');

    const prompt = `You are a music marketing specialist. Generate SNS captions and hashtags for a new music release.

TRACK INFO:
- Title: ${trackTitle}
- Artist: ${artistName}
- Genres: ${genres.join(', ') || 'Not specified'}
- Moods: ${moods.join(', ') || 'Not specified'}
- Release Date: ${releaseDate || 'Now'}
- Artist Bio: ${bio || 'Independent artist from Japan'}
- Links: ${platformLinks || 'Not provided'}

Generate the following in VALID JSON format (no markdown, no backticks):

{
  "instagram": {
    "en": "English Instagram caption (150-200 chars, engaging, with line breaks using \\n, no emojis, end with CTA like 'Link in bio')",
    "ja": "Japanese Instagram caption (same style, natural Japanese, not direct translation)"
  },
  "x": {
    "en": "English X/Twitter post (under 250 chars, punchy, no emojis)",
    "ja": "Japanese X/Twitter post (same constraints, natural Japanese)"
  },
  "facebook": {
    "en": "English Facebook post (200-300 chars, slightly more descriptive, professional tone)",
    "ja": "Japanese Facebook post (same style)"
  },
  "hashtags": {
    "en": ["#NewMusic", "#NowPlaying", ... 8-12 relevant English hashtags],
    "ja": ["#新曲", "#音楽", ... 8-12 relevant Japanese hashtags]
  }
}

RULES:
- Captions should feel authentic, not overly promotional
- Incorporate genre/mood naturally (don't list them)
- Japanese captions should be native-level, not translations
- Include the artist name in each caption
- Hashtags should mix popular tags with niche genre tags
- Do NOT include the JSON backticks or markdown formatting`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].text.trim();

    // JSONパース（backticks除去対応）
    const cleanJson = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const captions = JSON.parse(cleanJson);

    return Response.json({ success: true, captions });
  } catch (error) {
    console.error('Caption generation error:', error);
    return Response.json(
      { error: 'Failed to generate captions', details: error.message },
      { status: 500 }
    );
  }
}
