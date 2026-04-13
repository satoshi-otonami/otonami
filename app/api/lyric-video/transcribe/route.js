import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';

export const maxDuration = 60;

export async function POST(request) {
  try {
    const payload = await verifyToken(request);
    if (!payload || payload.role !== 'artist') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { audioUrl, videoId, language, title } = await request.json();
    if (!audioUrl) {
      return NextResponse.json({ error: 'audioUrl is required' }, { status: 400 });
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch audio file' }, { status: 400 });
    }
    const audioBlob = await audioResponse.blob();

    const fileName = audioUrl.split('/').pop() || 'audio.mp3';
    const whisperForm = new FormData();
    whisperForm.append('file', audioBlob, fileName);
    whisperForm.append('model', 'whisper-1');
    whisperForm.append('response_format', 'verbose_json');
    whisperForm.append('timestamp_granularities[]', 'segment');
    // temperature=0 makes Whisper's sampling deterministic, which significantly
    // reduces hallucinated text during instrumental sections or unclear vocals.
    whisperForm.append('temperature', '0');
    if (language) {
      whisperForm.append('language', language);
    }
    // A short prompt biases Whisper toward the right vocabulary. The song title
    // is the cheapest, highest-signal hint we can pass.
    if (title && typeof title === 'string') {
      whisperForm.append('prompt', title.slice(0, 200));
    }

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: whisperForm,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('Whisper API error:', errorText);
      return NextResponse.json(
        { error: 'Transcription failed', details: errorText.slice(0, 300) },
        { status: 500 }
      );
    }

    const whisperData = await whisperResponse.json();
    const rawSegments = Array.isArray(whisperData.segments) ? whisperData.segments : [];

    // Filter out Whisper hallucinations. The two high-signal fields in
    // verbose_json are no_speech_prob (model's confidence the clip is silent/
    // instrumental) and compression_ratio (high values mean the text compresses
    // well, i.e. the same phrase repeats — a classic hallucination pattern).
    const filteredSegments = rawSegments.filter((seg) => {
      if (typeof seg?.no_speech_prob === 'number' && seg.no_speech_prob > 0.6) return false;
      if (typeof seg?.compression_ratio === 'number' && seg.compression_ratio > 2.4) return false;
      const text = (seg?.text || '').trim();
      if (text.length < 2) return false;
      return true;
    });

    // Collapse consecutive duplicate lines. Whisper hallucinations in
    // instrumental gaps often emit the same phrase over and over; keeping the
    // first occurrence is enough to preserve legitimate repeated choruses
    // (which are normally separated by other lines between repeats).
    const dedupedSegments = [];
    for (const seg of filteredSegments) {
      const text = (seg.text || '').trim();
      const lastText = dedupedSegments.length
        ? (dedupedSegments[dedupedSegments.length - 1].text || '').trim()
        : '';
      if (text !== lastText) {
        dedupedSegments.push(seg);
      }
    }

    console.log(
      `Whisper: ${rawSegments.length} segments → ${dedupedSegments.length} after filtering`
    );

    const segments = dedupedSegments.map((seg) => ({
      start: seg.start,
      end: seg.end,
      text: (seg.text || '').trim(),
    }));

    if (videoId) {
      try {
        const supabase = getServiceSupabase();
        await supabase
          .from('lyric_videos')
          .update({
            lyrics: { segments },
            duration_seconds: whisperData.duration || null,
            language: whisperData.language || language || null,
            status: 'ready',
            updated_at: new Date().toISOString(),
          })
          .eq('id', videoId);
      } catch (dbErr) {
        console.warn('lyric_videos update skipped:', dbErr.message);
      }
    }

    return NextResponse.json({
      text: whisperData.text || '',
      language: whisperData.language || language || 'ja',
      duration: whisperData.duration || null,
      segments,
    });
  } catch (err) {
    console.error('Transcribe error:', err);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
  }
}
