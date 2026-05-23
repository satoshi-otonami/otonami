import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { translateRatelimit, checkRatelimit } from '@/lib/ratelimit';
import { INPUT_LIMITS, validateLength } from '@/lib/validate-input';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });

// Hiragana / katakana / kanji / fullwidth punctuation. Matches the detector
// used by ensureEnglishPitch in app/api/pitches/route.js for consistency.
const JAPANESE_RE = /[　-〿぀-ゟ゠-ヿ一-龯！-～]/;

// POST /api/translate — translate a single short Japanese field to natural
// English. Used by the pitch "template" generator (generatePitch in
// OtonamiApp.jsx) to translate the per-pitch description / achievements /
// influences fields BEFORE they are interpolated into the otherwise-English
// template, so the on-screen preview is no longer a JA/EN mix. Pitch SEND
// still re-translates the whole body via ensureEnglishPitch (app/api/pitches)
// as the final safety net, so a failure here only degrades the preview.
export async function POST(request) {
  try {
    const payload = await verifyToken(request);
    if (!payload || payload.role !== 'artist') {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'ログインが必要です', translated: '' },
        { status: 401 }
      );
    }

    const { text } = await request.json();

    // Empty input — nothing to translate. (No rate-limit / API spend.)
    if (!text || !text.trim()) {
      return NextResponse.json({ translated: text || '' });
    }

    const lengthError = validateLength(text, INPUT_LIMITS.TRANSLATE_TEXT, '翻訳テキスト');
    if (lengthError) {
      return NextResponse.json(
        { error: 'InputTooLong', message: lengthError, translated: '' },
        { status: 413 }
      );
    }

    // Already English — skip the Claude call (and the rate-limit budget). A
    // field with no Japanese characters, or ≥90% ASCII, is treated as English.
    const asciiCount = (text.match(/[\x00-\x7F]/g) || []).length;
    if (!JAPANESE_RE.test(text) || asciiCount / text.length > 0.9) {
      return NextResponse.json({ translated: text });
    }

    // Only real Claude calls consume the (shared) translate rate-limit budget.
    const rl = await checkRatelimit(translateRatelimit, `artist:${payload.artistId}`);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'RateLimitExceeded', message: rl.error, retryAfter: rl.retryAfter, translated: '' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      );
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system:
        'Translate the Japanese text to natural English for international music curators. ' +
        'Keep proper nouns (band names, venue names, song titles, festival names) as-is. ' +
        'Return ONLY the English translation, no preamble or explanation.',
      messages: [{ role: 'user', content: text }],
    });

    const translated = message.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')
      .trim();

    // Fall back to the original if the model returned nothing usable.
    return NextResponse.json({ translated: translated || text });
  } catch (error) {
    console.error('[translate] error:', error.message);
    return NextResponse.json({ error: error.message, translated: '' }, { status: 500 });
  }
}
