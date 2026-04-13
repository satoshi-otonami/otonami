import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';

export const maxDuration = 30;

const AUDIO_MIME_TO_EXT = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/wave': 'wav',
  'audio/x-wav': 'wav',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/m4a': 'm4a',
};
const IMAGE_MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

// POST /api/lyric-video/upload
// Accepts JSON only. Returns signed upload URLs so the browser can PUT file
// bytes directly to Supabase Storage, bypassing Vercel's 4.5 MB body limit.
//
// Request body: { audioMime, backgroundMime?, title?, trackId? }
// Response: {
//   id, title,
//   audioUploadUrl, audioPublicUrl,
//   backgroundUploadUrl?, backgroundPublicUrl?
// }
export async function POST(request) {
  try {
    const payload = await verifyToken(request);
    if (!payload || payload.role !== 'artist') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (parseErr) {
      console.error('Invalid JSON body:', parseErr?.message);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { audioMime, backgroundMime, title: rawTitle, trackId } = body || {};

    const audioExt = AUDIO_MIME_TO_EXT[audioMime];
    if (!audioExt) {
      console.error('Unsupported audio MIME type:', audioMime);
      return NextResponse.json(
        { error: 'Unsupported audio format. Use MP3, WAV, or M4A.' },
        { status: 400 }
      );
    }

    let bgExt = null;
    if (backgroundMime) {
      bgExt = IMAGE_MIME_TO_EXT[backgroundMime];
      if (!bgExt) {
        console.error('Unsupported background MIME type:', backgroundMime);
        return NextResponse.json(
          { error: 'Unsupported background format. Use JPG, PNG, WebP, or GIF.' },
          { status: 400 }
        );
      }
    }

    const title = (rawTitle || 'Untitled').toString().slice(0, 120);
    const supabase = getServiceSupabase();
    const timestamp = Date.now();
    const randSlug = Math.random().toString(36).slice(2, 10);
    const audioPath = `audio/${payload.artistId}/${timestamp}_${randSlug}.${audioExt}`;

    const { data: audioSigned, error: audioSignError } = await supabase.storage
      .from('lyric-videos')
      .createSignedUploadUrl(audioPath);

    if (audioSignError || !audioSigned) {
      console.error('Audio sign error:', {
        message: audioSignError?.message,
        name: audioSignError?.name,
        statusCode: audioSignError?.statusCode,
        error: audioSignError?.error,
        path: audioPath,
      });
      return NextResponse.json(
        {
          error: 'Failed to generate upload URL',
          details: audioSignError?.message,
        },
        { status: 500 }
      );
    }

    const { data: audioPublicData } = supabase.storage
      .from('lyric-videos')
      .getPublicUrl(audioPath);

    let backgroundUploadUrl = null;
    let backgroundPublicUrl = null;
    if (bgExt) {
      const bgPath = `backgrounds/${payload.artistId}/${timestamp}_${randSlug}.${bgExt}`;
      const { data: bgSigned, error: bgSignError } = await supabase.storage
        .from('lyric-videos')
        .createSignedUploadUrl(bgPath);

      if (bgSignError || !bgSigned) {
        console.error('Background sign error:', {
          message: bgSignError?.message,
          path: bgPath,
        });
      } else {
        const { data: bgPublicData } = supabase.storage
          .from('lyric-videos')
          .getPublicUrl(bgPath);
        backgroundUploadUrl = bgSigned.signedUrl;
        backgroundPublicUrl = bgPublicData.publicUrl;
      }
    }

    let videoId = null;
    try {
      const { data: record } = await supabase
        .from('lyric_videos')
        .insert({
          artist_id: payload.artistId,
          track_id: trackId || null,
          title,
          audio_url: audioPublicData.publicUrl,
          background_url: backgroundPublicUrl,
          status: 'uploading',
        })
        .select('id');
      if (record && record[0]) videoId = record[0].id;
    } catch (dbErr) {
      console.warn('lyric_videos insert skipped (table may not exist):', dbErr.message);
    }

    return NextResponse.json({
      id: videoId,
      title,
      audioUploadUrl: audioSigned.signedUrl,
      audioPublicUrl: audioPublicData.publicUrl,
      backgroundUploadUrl,
      backgroundPublicUrl,
    });
  } catch (err) {
    console.error('Upload init error:', {
      message: err?.message,
      stack: err?.stack,
      name: err?.name,
    });
    return NextResponse.json(
      { error: 'Upload initialization failed', details: err?.message },
      { status: 500 }
    );
  }
}
