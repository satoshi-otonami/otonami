import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';

export const maxDuration = 60;

// Thin wrapper around POST /v1/audio/transcriptions so we can try multiple
// models with the same inputs. gpt-4o-mini-transcribe supports only
// response_format=json|text; whisper-1 supports verbose_json with segments.
async function callTranscription({ audioBlob, fileName, model, responseFormat, language, title }) {
  const form = new FormData();
  form.append('file', audioBlob, fileName);
  form.append('model', model);
  form.append('response_format', responseFormat);
  if (responseFormat === 'verbose_json') {
    form.append('timestamp_granularities[]', 'segment');
  }
  form.append('temperature', '0');
  if (language) form.append('language', language);
  if (title && typeof title === 'string') {
    form.append('prompt', title.slice(0, 200));
  }
  return fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  });
}

export async function POST(request) {
  try {
    const payload = await verifyToken(request);
    if (!payload || payload.role !== 'artist') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      audioUrl,
      videoId,
      language,
      title,
      duration: clientDuration,
    } = await request.json();

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

    // Try gpt-4o-mini-transcribe first — 2025's new model is significantly more
    // robust against music/instrumental hallucinations. It doesn't support
    // verbose_json, so we ask for plain json and synthesize segments from the
    // client-provided duration downstream.
    let res = await callTranscription({
      audioBlob,
      fileName,
      model: 'gpt-4o-mini-transcribe',
      responseFormat: 'json',
      language,
      title,
    });
    let modelUsed = 'gpt-4o-mini-transcribe';

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.warn(
        `gpt-4o-mini-transcribe failed (${res.status}), falling back to whisper-1:`,
        errBody.slice(0, 200)
      );
      res = await callTranscription({
        audioBlob,
        fileName,
        model: 'whisper-1',
        responseFormat: 'verbose_json',
        language,
        title,
      });
      modelUsed = 'whisper-1';
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error('Transcription API error (all models failed):', errText);
      return NextResponse.json(
        { error: 'Transcription failed', details: errText.slice(0, 300) },
        { status: 500 }
      );
    }

    const data = await res.json();
    let rawSegments = Array.isArray(data.segments) ? data.segments : [];
    const fullText = data.text || '';
    let effectiveDuration = data.duration || clientDuration || 0;

    // gpt-4o-mini-transcribe returns text only. If we don't already have
    // segments, synthesize them by splitting on sentence punctuation and
    // distributing linearly over the audio duration.
    if (rawSegments.length === 0 && fullText) {
      if (!effectiveDuration) {
        // Edge case: the client forgot to send duration and the model gave us
        // none either. Fall back to whisper-1 purely to get segments+duration.
        console.warn(
          'mini-transcribe returned text-only and no clientDuration — retrying with whisper-1'
        );
        const retry = await callTranscription({
          audioBlob,
          fileName,
          model: 'whisper-1',
          responseFormat: 'verbose_json',
          language,
          title,
        });
        if (retry.ok) {
          const retryData = await retry.json();
          rawSegments = Array.isArray(retryData.segments) ? retryData.segments : [];
          effectiveDuration = retryData.duration || 0;
          modelUsed = 'whisper-1 (duration fallback)';
        }
      } else {
        const lines = fullText
          .split(/[\n。！？.!?]+/)
          .map((l) => l.trim())
          .filter(Boolean);
        if (lines.length > 0) {
          const perLine = effectiveDuration / lines.length;
          rawSegments = lines.map((text, i) => ({
            start: i * perLine,
            end: (i + 1) * perLine,
            text,
          }));
          modelUsed = `${modelUsed} (synthesized ${lines.length} segments)`;
        }
      }
    }

    // Conservative hallucination filter — only drop segments Whisper itself
    // flagged as near-certain silence. Synthesized segments have no
    // no_speech_prob, so they pass through unchanged.
    const filteredSegments = rawSegments.filter((seg) => {
      if (typeof seg?.no_speech_prob === 'number' && seg.no_speech_prob > 0.9) return false;
      const text = (seg?.text || '').trim();
      if (text.length < 2) return false;
      return true;
    });

    console.log(
      `Transcribe[${modelUsed}]: ${rawSegments.length} segments → ${filteredSegments.length} after filtering`
    );

    const segments = filteredSegments.map((seg) => ({
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
            duration_seconds: effectiveDuration || null,
            language: data.language || language || null,
            status: 'ready',
            updated_at: new Date().toISOString(),
          })
          .eq('id', videoId);
      } catch (dbErr) {
        console.warn('lyric_videos update skipped:', dbErr.message);
      }
    }

    return NextResponse.json({
      text: fullText,
      language: data.language || language || 'ja',
      duration: effectiveDuration || null,
      segments,
      model: modelUsed,
    });
  } catch (err) {
    console.error('Transcribe error:', err);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
  }
}
