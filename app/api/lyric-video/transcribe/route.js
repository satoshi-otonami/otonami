import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';

export const maxDuration = 60;

// Thin wrapper around POST /v1/audio/transcriptions so we can try multiple
// models with the same inputs. gpt-4o-mini-transcribe supports only
// response_format=json|text; whisper-1 supports verbose_json with segment +
// word granularity.
async function callTranscription({ audioBlob, fileName, model, responseFormat, language, title }) {
  const form = new FormData();
  form.append('file', audioBlob, fileName);
  form.append('model', model);
  form.append('response_format', responseFormat);
  if (responseFormat === 'verbose_json') {
    form.append('timestamp_granularities[]', 'segment');
    form.append('timestamp_granularities[]', 'word');
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

// Group per-word timestamps into readable lyric lines. Split rules:
//   - >1.5s gap between consecutive words (natural breath/phrase break)
//   - Current group already has 8 words (keeps lines scannable on screen)
//   - Previous word ended with sentence-final punctuation
// Joiner is language-aware: Whisper returns bare word tokens without leading
// spaces ("Hello", "world"), so English/Latin scripts need ' ' between them
// or they collapse into "Helloworld". CJK has no inter-word spacing so we
// join with ''. If language isn't given we sniff the first ~10 words for
// CJK characters.
function buildSegmentsFromWords(words, language) {
  if (!Array.isArray(words) || words.length === 0) return [];

  const sampleText = words
    .slice(0, 10)
    .map((w) => (w.word || w.text || '').toString())
    .join('');
  const isCjkLang = typeof language === 'string' && /^(ja|zh|ko)/i.test(language);
  const hasCjkChars = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff\uac00-\ud7af]/.test(sampleText);
  const joiner = isCjkLang || hasCjkChars ? '' : ' ';

  const segments = [];
  let currentWords = [];
  let segStart = words[0].start;

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const wordText = (w.word || w.text || '').toString();
    currentWords.push(wordText);

    const isLast = i === words.length - 1;
    const nextWord = words[i + 1];
    const gap = nextWord ? (nextWord.start || 0) - (w.end || 0) : 0;
    const wordCount = currentWords.length;
    const endsWithPunctuation = /[.!?,。！？、]$/.test(wordText.trim());

    if (isLast || gap > 1.5 || wordCount >= 8 || endsWithPunctuation) {
      const text = currentWords.join(joiner).replace(/\s+/g, ' ').trim();
      if (text.length > 0) {
        // Pad the phrase with -0.3s lead-in and +0.1s tail. Lyrics feel
        // better when they appear a beat before the vocal hits and linger
        // briefly after the last syllable decays. Math.max(0, ...) keeps
        // the very first phrase from going negative if the vocal starts
        // near zero, but we do NOT clamp non-zero word starts to 0 — the
        // whole point of using word timestamps is that the instrumental
        // intro stays free of lyrics.
        segments.push({
          start: Math.max(0, segStart - 0.3),
          end: w.end + 0.1,
          text,
        });
      }
      currentWords = [];
      if (nextWord) segStart = nextWord.start;
    }
  }

  return segments;
}

// Fallback used when we only have segment-level timestamps. Distribute each
// segment's time across its tokens proportionally so we can still run the
// result through buildSegmentsFromWords to get punctuation/length-based
// splits. For CJK with no whitespace we fall back to per-character splitting.
function pseudoWordsFromSegments(segments) {
  const pseudoWords = [];
  for (const seg of segments) {
    const text = (seg?.text || '').trim();
    if (!text) continue;
    const total = (seg.end || 0) - (seg.start || 0);
    if (total <= 0) continue;

    let tokens = text.split(/\s+/).filter(Boolean);
    if (tokens.length <= 1 && text.length > 1 && !/\s/.test(text)) {
      tokens = Array.from(text);
    }
    if (tokens.length === 0) continue;

    const perToken = total / tokens.length;
    for (let i = 0; i < tokens.length; i++) {
      pseudoWords.push({
        word: tokens[i],
        start: seg.start + i * perToken,
        end: seg.start + (i + 1) * perToken,
      });
    }
  }
  return pseudoWords;
}

// Conservative hallucination filter. Only drops segments Whisper itself
// flagged as near-certain silence. no_speech_prob is only present on raw
// whisper-1 segments.
function filterHallucinations(segments) {
  return segments.filter((seg) => {
    if (typeof seg?.no_speech_prob === 'number' && seg.no_speech_prob > 0.9) return false;
    const text = (seg?.text || '').trim();
    if (text.length < 2) return false;
    return true;
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

    // Try gpt-4o-mini-transcribe first — the 2025 model is much more robust
    // against music/instrumental hallucinations. It doesn't support
    // verbose_json or word-level timestamps, so we ask for plain json and
    // synthesize segments from the client-provided duration downstream.
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

    let data = await res.json();
    let fullText = data.text || '';
    let effectiveDuration = data.duration || clientDuration || 0;
    let segments = [];
    let segmentSource = '';

    // --- Path A: word-level timestamps available (whisper-1 with word granularity)
    if (Array.isArray(data.words) && data.words.length > 0) {
      // Drop words that fall inside segments flagged as silence/hallucinations.
      const rawSegs = Array.isArray(data.segments) ? data.segments : [];
      const liveSegs = filterHallucinations(rawSegs);
      const liveSet = new Set(liveSegs);
      const droppedRanges = rawSegs
        .filter((s) => !liveSet.has(s))
        .map((s) => ({ start: s.start, end: s.end }));
      const liveWords = droppedRanges.length
        ? data.words.filter((w) => !droppedRanges.some((r) => w.start >= r.start && w.end <= r.end))
        : data.words;

      segments = buildSegmentsFromWords(liveWords, data.language || language);
      segmentSource = `${data.words.length} words → ${segments.length} phrases`;
    }
    // --- Path B: segment-level timestamps only (edge case) — pseudo-word rebuild
    else if (Array.isArray(data.segments) && data.segments.length > 0) {
      const liveSegs = filterHallucinations(data.segments);
      const pseudoWords = pseudoWordsFromSegments(liveSegs);
      const rebuilt = buildSegmentsFromWords(pseudoWords, data.language || language);
      segments = rebuilt.length > 0
        ? rebuilt
        : liveSegs.map((s) => ({ start: s.start, end: s.end, text: (s.text || '').trim() }));
      segmentSource = `${data.segments.length} segments → ${pseudoWords.length} pseudo-words → ${segments.length} phrases`;
    }
    // --- Path C: mini-transcribe returned text + we have a duration.
    //     Distribute lines evenly across the duration. mini-transcribe is
    //     more robust against instrumental hallucinations than whisper-1,
    //     so we prefer its text here even though we lose word-level timing.
    //     We reserve a short intro window before the first lyric since
    //     equal-division has no vocal-onset info to anchor to.
    else if (fullText && effectiveDuration > 0) {
      const lines = fullText
        .split(/[\n。！？.!?]+/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length > 0) {
        const introOffset = Math.min(15, Math.max(3, effectiveDuration * 0.05));
        const usableDuration = Math.max(0, effectiveDuration - introOffset);
        const perLine = usableDuration / lines.length;
        segments = lines.map((text, i) => ({
          start: parseFloat((introOffset + i * perLine).toFixed(2)),
          end: parseFloat((introOffset + (i + 1) * perLine).toFixed(2)),
          text,
        }));
        segmentSource = `text-only → ${lines.length} sentences over ${effectiveDuration.toFixed(1)}s (intro ${introOffset.toFixed(1)}s)`;
      }
    }
    // --- Path D: mini-transcribe text with no duration — retry whisper-1
    //     strictly to learn the clip duration, then even-distribute mini's
    //     text. We never adopt whisper-1's text (it hallucinates GPS-nav
    //     style lyrics on instrumentals); we only borrow its duration and
    //     segment boundaries as timing anchors.
    else if (fullText && !effectiveDuration) {
      console.warn('mini-transcribe returned text with no duration — fetching whisper-1 duration only');
      const miniText = fullText;
      const retry = await callTranscription({
        audioBlob,
        fileName,
        model: 'whisper-1',
        responseFormat: 'verbose_json',
        language,
        title,
      });
      if (retry.ok) {
        const whisperData = await retry.json();
        effectiveDuration = whisperData.duration || effectiveDuration;
        if (effectiveDuration > 0) {
          const lines = miniText
            .split(/[\n。！？.!?]+/)
            .map((l) => l.trim())
            .filter(Boolean);
          if (lines.length > 0) {
            const perLine = effectiveDuration / lines.length;
            segments = lines.map((text, i) => ({
              start: i * perLine,
              end: (i + 1) * perLine,
              text,
            }));
            segmentSource = `text-only (whisper-1 duration) → ${lines.length} sentences over ${effectiveDuration.toFixed(1)}s`;
          }
        }
      } else {
        console.warn('whisper-1 duration retry failed — no segments produced');
      }
    }

    console.log(`Transcribe[${modelUsed}]: ${segmentSource || 'no segments produced'}`);

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
