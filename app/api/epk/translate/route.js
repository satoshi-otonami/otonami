import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { translateRatelimit, checkRatelimit } from '@/lib/ratelimit';
import { INPUT_LIMITS, validateLength } from '@/lib/validate-input';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });

// EPK-specific JA→EN *draft* translation for the editor's "英訳する" button.
// Distinct from /api/translate (pitch, first-person voice): EPK bio/tagline are
// written in the band's editorial third-person voice. Counts/years must survive
// untouched (the SXSW "10回" review). Proper nouns keep their established
// English/romaji form, but Japanese-only person/place names are transcribed to
// Hepburn romaji (the 山崎千裕 → Yamazaki Chihiro case), never left as kanji.
const FIELD_CONFIG = {
  bio: { max_tokens: 1200 },
  tagline: { max_tokens: 300 },
};

const SYSTEM_PROMPT =
  'You are a translator for a music EPK (electronic press kit). Translate the ' +
  'Japanese text into natural, industry-standard English for international playlist ' +
  'curators and music press. ' +
  'Proper nouns — band names, person names, song titles, festival names, label names, ' +
  'and place names. If an established English or romanized form already exists, keep it ' +
  'exactly as written (e.g. ROUTE14band, SXSW, Bay of Islands Jazz Festival); do not ' +
  'translate or re-spell it. If a name is written only in Japanese, transcribe it into ' +
  'Hepburn romaji, surname before given name (e.g. 山崎千裕 → Yamazaki Chihiro); never ' +
  'leave Japanese characters in the output, and never invent or reinterpret a spelling. ' +
  'When a proper noun already appears in English elsewhere in the text, match that form ' +
  'consistently. ' +
  'Preserve ALL numbers, counts, and years exactly as in the source ' +
  '(e.g. 「SXSWに10回」 → "ten times at SXSW" or "10 times"; never add, drop, or ' +
  'reinterpret a count). Do not introduce facts, opinions, or detail not present in ' +
  'the source. Keep the original third-person / editorial voice — do not switch to ' +
  'first person. A 1–2 sentence tagline must stay concise. ' +
  'Output ONLY the translated English text — no preamble, no quotation marks, no notes.';

// POST /api/epk/translate — { field: "bio"|"tagline", text_jp } -> { text_en }
// Half-automatic: returns a draft the artist reviews/edits before saving. Never
// writes to the DB and never auto-translates on save.
export async function POST(request) {
  try {
    const payload = await verifyToken(request);
    if (!payload || payload.role !== 'artist') {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const field = body?.field;
    const textJp = typeof body?.text_jp === 'string' ? body.text_jp : '';

    if (!FIELD_CONFIG[field]) {
      return NextResponse.json({ error: '不正なフィールドです' }, { status: 400 });
    }
    if (!textJp.trim()) {
      return NextResponse.json({ error: '翻訳する日本語が入力されていません' }, { status: 400 });
    }

    const lengthError = validateLength(textJp, INPUT_LIMITS.TRANSLATE_TEXT, '翻訳テキスト');
    if (lengthError) {
      return NextResponse.json({ error: lengthError }, { status: 413 });
    }

    // Real Claude call — consume the shared translate rate-limit budget.
    const rl = await checkRatelimit(translateRatelimit, `artist:${payload.artistId}`);
    if (!rl.success) {
      return NextResponse.json(
        { error: rl.error, retryAfter: rl.retryAfter },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      );
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: FIELD_CONFIG[field].max_tokens,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: textJp }],
    });

    const textEn = message.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();

    if (!textEn) {
      return NextResponse.json(
        { error: '翻訳結果が空でした。もう一度お試しください。' },
        { status: 502 }
      );
    }

    return NextResponse.json({ text_en: textEn });
  } catch (error) {
    console.error('[epk/translate] error:', error.message);
    return NextResponse.json({ error: error.message || '翻訳に失敗しました' }, { status: 500 });
  }
}
