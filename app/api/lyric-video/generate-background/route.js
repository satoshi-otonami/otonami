import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';

export const maxDuration = 60;

// POST /api/lyric-video/generate-background
// Body: { lyrics: string, title?: string, videoId?: string }
// Response: { backgroundUrl, prompt }
export async function POST(request) {
  try {
    const payload = await verifyToken(request);
    if (!payload || payload.role !== 'artist') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lyrics, title, videoId } = await request.json();

    if (!lyrics || !lyrics.trim()) {
      return NextResponse.json({ error: 'Lyrics are required' }, { status: 400 });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 });
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const promptResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: `You are an art director creating a background image for a lyric video.
Analyze these song lyrics and generate a DALL-E 3 image prompt.

Song title: ${title || 'Untitled'}
Lyrics:
${lyrics.slice(0, 3000)}

Rules:
- Output ONLY the image prompt, nothing else
- The image should be a wide cinematic background (no text, no people's faces)
- Focus on atmosphere, mood, and scenery that matches the lyrics
- Use specific visual details: lighting, colors, time of day, weather, textures
- Style: high quality digital art, cinematic, suitable as a music video background
- The image should have space in the center for text overlay (lyrics)
- Keep it under 200 words`,
        },
      ],
    });

    const imagePrompt =
      (promptResponse?.content?.[0]?.type === 'text'
        ? promptResponse.content[0].text
        : ''
      ).trim();
    if (!imagePrompt) {
      console.error('Claude returned empty image prompt');
      return NextResponse.json(
        { error: 'Failed to generate image prompt' },
        { status: 500 }
      );
    }

    const dalleResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: imagePrompt,
        n: 1,
        size: '1792x1024',
        quality: 'standard',
        response_format: 'url',
      }),
    });

    if (!dalleResponse.ok) {
      const errorText = await dalleResponse.text();
      console.error('DALL-E API error:', errorText.slice(0, 500));
      return NextResponse.json(
        { error: 'Image generation failed', details: errorText.slice(0, 300) },
        { status: 500 }
      );
    }

    const dalleData = await dalleResponse.json();
    const tempImageUrl = dalleData?.data?.[0]?.url;
    if (!tempImageUrl) {
      return NextResponse.json(
        { error: 'Image generation returned no URL' },
        { status: 500 }
      );
    }

    const imageResponse = await fetch(tempImageUrl);
    if (!imageResponse.ok) {
      console.error('Failed to fetch DALL-E image:', imageResponse.status);
      return NextResponse.json(
        { error: 'Failed to download generated image' },
        { status: 500 }
      );
    }
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    const supabase = getServiceSupabase();
    const timestamp = Date.now();
    const randSlug = Math.random().toString(36).slice(2, 8);
    const imagePath = `backgrounds/${payload.artistId}/ai_${timestamp}_${randSlug}.png`;

    const { error: uploadError } = await supabase.storage
      .from('lyric-videos')
      .upload(imagePath, imageBuffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', {
        message: uploadError.message,
        name: uploadError.name,
        path: imagePath,
      });
      return NextResponse.json(
        { error: 'Failed to save image', details: uploadError.message },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from('lyric-videos')
      .getPublicUrl(imagePath);
    const backgroundUrl = urlData.publicUrl;

    if (videoId) {
      try {
        await supabase
          .from('lyric_videos')
          .update({
            background_url: backgroundUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', videoId);
      } catch (dbErr) {
        console.warn('lyric_videos update skipped:', dbErr.message);
      }
    }

    return NextResponse.json({
      backgroundUrl,
      prompt: imagePrompt,
    });
  } catch (err) {
    console.error('Generate background error:', {
      message: err?.message,
      name: err?.name,
    });
    return NextResponse.json(
      { error: err?.message || 'Background generation failed' },
      { status: 500 }
    );
  }
}
