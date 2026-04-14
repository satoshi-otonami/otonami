import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ひらがな・カタカナ・漢字・全角記号を検出
const JAPANESE_RE = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\uff01-\uff5e]/;

async function ensureEnglishPitch(pitchContent, artistName, trackTitle) {
  if (!pitchContent?.trim()) return { text: pitchContent, translated: false };

  const hasJapanese = JAPANESE_RE.test(pitchContent);
  if (!hasJapanese) return { text: pitchContent, translated: false };

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are a professional music PR translator. Your job is to convert a music pitch into fluent, professional English.

STRICT RULES:
1. The output must be 100% in English. Do NOT leave any Japanese text (hiragana, katakana, kanji) in the output.
2. If the original contains Japanese greetings or self-introductions (e.g. "こんにちは", "〜です"), translate them naturally into English or remove them if they are redundant.
3. Preserve artist names, track titles, and URLs exactly as-is — but if the artist name is written in Japanese (e.g. "るーと１４"), romanize it or use the English equivalent if known.
4. Keep the tone friendly, enthusiastic, and professional.
5. Do NOT add any information not present in the original.
6. Return ONLY the translated English text. No explanations, no markdown, no quotes.

Artist: ${artistName}
Track: ${trackTitle}

Original pitch (may contain mixed Japanese and English):
${pitchContent}`,
      }],
    });

    const translated = response.content.filter(b => b.type === 'text').map(b => b.text).join('');

    // 翻訳後も日本語が残っていたら1回だけリトライ（全角記号も含めてチェック）
    const stillHasJapanese = JAPANESE_RE.test(translated);
    if (stillHasJapanese) {
      console.warn('[pitches] First translation still contains Japanese, retrying...');
      const retry = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `The following text still contains Japanese characters. Rewrite it entirely in English. Remove or translate ALL Japanese text. Return ONLY the English version:\n\n${translated}`,
        }],
      });
      const retried = retry.content.filter(b => b.type === 'text').map(b => b.text).join('');
      return { text: retried, translated: true };
    }

    return { text: translated, translated: true };
  } catch (e) {
    console.error('[pitches] Translation failed, using original:', e.message);
    return { text: pitchContent, translated: false };
  }
}

// Known columns in the pitches table — strip anything else to avoid insert errors
const PITCHES_COLUMNS = new Set([
  'session_id', 'curator_id', 'artist_name', 'artist_email', 'artist_genre',
  'curator_name', 'subject', 'body', 'song_link', 'match_score',
  'feedback_message', 'placement_platform', 'placement_url', 'placement_date',
  'negotiation_status', 'messages', 'pitch_language', 'track_id',
  'sent_at', 'deadline_at', 'credits_charged',
]);

function pickKnownColumns(row) {
  const clean = {};
  for (const key of Object.keys(row)) {
    if (PITCHES_COLUMNS.has(key)) clean[key] = row[key];
  }
  return clean;
}

// Pre-launch gate (server-side enforcement)
function isPreLaunchLocked() {
  const launchDate = process.env.NEXT_PUBLIC_LAUNCH_DATE;
  if (!launchDate) return false;
  const launch = new Date(launchDate);
  if (Number.isNaN(launch.getTime())) return false;
  return new Date() < launch;
}

// POST /api/pitches — ピッチをDBに保存（日本語があれば英語に翻訳してから保存）
export async function POST(request) {
  try {
    if (isPreLaunchLocked()) {
      return NextResponse.json(
        { error: 'Pitch submissions are not available yet. OTONAMI launches in May 2026.' },
        { status: 403 }
      );
    }

    const row = await request.json();

    if (!row.session_id) {
      return NextResponse.json({ error: 'session_id required' }, { status: 400 });
    }

    const originalBody = row.body || '';
    const artistName = row.artist_name || '';
    const trackTitle = row.subject || '';

    console.log(`[pitches] Saving pitch for artist="${artistName}" subject="${trackTitle}"`);

    // 日本語チェックと翻訳
    const { text: englishBody, translated } = await ensureEnglishPitch(
      originalBody,
      artistName,
      trackTitle
    );

    if (translated) {
      console.log(`[pitches] Translated Japanese pitch to English for artist: ${artistName}`);
      console.log(`[pitches] Original (first 200 chars): ${originalBody.slice(0, 200)}`);
    }

    // Strip unknown columns to prevent Supabase insert errors
    const cleanRow = pickKnownColumns(row);
    cleanRow.body = englishBody;
    cleanRow.pitch_language = translated ? 'ja_translated' : 'en';

    const db = getServiceSupabase();
    const { data, error } = await db
      .from('pitches')
      .insert(cleanRow)
      .select('id')
      .single();

    if (error) {
      // pitch_language カラムが未作成の場合はそのカラムを除いてリトライ
      if (error.message?.includes('pitch_language')) {
        console.warn('[pitches] pitch_language column missing, inserting without it');
        delete cleanRow.pitch_language;
        const { data: data2, error: error2 } = await db
          .from('pitches')
          .insert(cleanRow)
          .select('id')
          .single();
        if (error2) {
          console.error('[pitches] Insert error (retry):', error2);
          return NextResponse.json({ error: error2.message }, { status: 500 });
        }
        return NextResponse.json({ id: data2.id, pitchText: englishBody });
      }
      console.error('[pitches] Insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: data.id, pitchText: englishBody });
  } catch (e) {
    console.error('[pitches] Unexpected error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
