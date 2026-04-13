import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';

export const maxDuration = 60;

const ALLOWED_AUDIO = [
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave',
  'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/m4a',
];
const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_AUDIO = 25 * 1024 * 1024;
const MAX_IMAGE = 10 * 1024 * 1024;

export async function POST(request) {
  try {
    const payload = await verifyToken(request);
    if (!payload || payload.role !== 'artist') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio');
    const backgroundFile = formData.get('background');
    const title = (formData.get('title') || 'Untitled').toString().slice(0, 120);
    const trackId = formData.get('track_id') || null;

    if (!audioFile || typeof audioFile === 'string') {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }
    if (!ALLOWED_AUDIO.includes(audioFile.type)) {
      return NextResponse.json(
        { error: 'Unsupported audio format. Use MP3, WAV, or M4A.' },
        { status: 400 }
      );
    }
    if (audioFile.size > MAX_AUDIO) {
      return NextResponse.json(
        { error: 'Audio file too large. Max 25MB (Whisper API limit).' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();
    const timestamp = Date.now();
    const randSlug = Math.random().toString(36).slice(2, 10);

    const audioExt = (audioFile.name.split('.').pop() || 'mp3').toLowerCase();
    const audioPath = `lyric-videos/audio/${payload.artistId}/${timestamp}_${randSlug}.${audioExt}`;
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    const { error: audioError } = await supabase.storage
      .from('avatars')
      .upload(audioPath, audioBuffer, {
        contentType: audioFile.type,
        upsert: false,
      });

    if (audioError) {
      console.error('Audio upload error:', audioError);
      return NextResponse.json({ error: 'Failed to upload audio' }, { status: 500 });
    }

    const { data: audioUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(audioPath);

    let backgroundUrl = null;
    if (backgroundFile && typeof backgroundFile !== 'string' && backgroundFile.size > 0) {
      if (!ALLOWED_IMAGE.includes(backgroundFile.type)) {
        return NextResponse.json(
          { error: 'Unsupported background format. Use JPG, PNG, WebP, or GIF.' },
          { status: 400 }
        );
      }
      if (backgroundFile.size > MAX_IMAGE) {
        return NextResponse.json(
          { error: 'Background image too large. Max 10MB.' },
          { status: 400 }
        );
      }
      const bgExt = (backgroundFile.name.split('.').pop() || 'jpg').toLowerCase();
      const bgPath = `lyric-videos/backgrounds/${payload.artistId}/${timestamp}_${randSlug}.${bgExt}`;
      const bgBuffer = Buffer.from(await backgroundFile.arrayBuffer());
      const { error: bgError } = await supabase.storage
        .from('avatars')
        .upload(bgPath, bgBuffer, {
          contentType: backgroundFile.type,
          upsert: false,
        });
      if (!bgError) {
        const { data: bgUrlData } = supabase.storage.from('avatars').getPublicUrl(bgPath);
        backgroundUrl = bgUrlData.publicUrl;
      }
    }

    let videoId = null;
    try {
      const { data: record } = await supabase
        .from('lyric_videos')
        .insert({
          artist_id: payload.artistId,
          track_id: trackId,
          title,
          audio_url: audioUrlData.publicUrl,
          background_url: backgroundUrl,
          status: 'draft',
        })
        .select('id');
      if (record && record[0]) videoId = record[0].id;
    } catch (dbErr) {
      console.warn('lyric_videos insert skipped (table may not exist):', dbErr.message);
    }

    return NextResponse.json({
      id: videoId,
      audioUrl: audioUrlData.publicUrl,
      backgroundUrl,
      title,
    });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
