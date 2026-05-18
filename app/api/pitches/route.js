import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';
import { pitchSubmitRatelimit, checkRatelimit } from '@/lib/ratelimit';
import { INPUT_LIMITS, validateLength } from '@/lib/validate-input';

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
    const payload = await verifyToken(request);
    if (!payload || payload.role !== 'artist') {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'ピッチ送信にはログインが必要です' },
        { status: 401 }
      );
    }

    const rl = await checkRatelimit(pitchSubmitRatelimit, `artist:${payload.artistId}`);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'RateLimitExceeded', message: rl.error, retryAfter: rl.retryAfter },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      );
    }

    if (isPreLaunchLocked()) {
      return NextResponse.json(
        { error: 'Pitch submissions are not available yet. OTONAMI launches on May 19, 2026.' },
        { status: 403 }
      );
    }

    const row = await request.json();

    if (!row.session_id) {
      return NextResponse.json({ error: 'session_id required' }, { status: 400 });
    }

    if (row.body) {
      const lengthError = validateLength(row.body, INPUT_LIMITS.PITCH_BODY, 'ピッチ本文');
      if (lengthError) {
        return NextResponse.json({ error: 'InputTooLong', message: lengthError }, { status: 413 });
      }
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

    // Strip unknown columns to prevent Supabase insert errors.
    // artist_id and status are intentionally NOT in PITCHES_COLUMNS so any
    // client-supplied value is dropped here; we inject trusted values below.
    const cleanRow = pickKnownColumns(row);
    cleanRow.body = englishBody;
    cleanRow.pitch_language = translated ? 'ja_translated' : 'en';
    cleanRow.artist_id = payload.artistId;
    // pitches.status DB default is 'draft'; force 'sent' for new submissions
    // so cron expiry checks (.eq('status','sent')) and curator dashboard
    // (.neq('status','draft')) see the pitch.
    cleanRow.status = 'sent';
    cleanRow.sent_at = new Date().toISOString();
    if (!cleanRow.deadline_at) {
      cleanRow.deadline_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }

    const db = getServiceSupabase();

    // Block AI-generated tracks (enforced server-side regardless of client state)
    if (cleanRow.track_id) {
      const { data: linkedTrack } = await db
        .from('artist_tracks')
        .select('ai_status')
        .eq('id', cleanRow.track_id)
        .maybeSingle();
      if (linkedTrack?.ai_status === 'ai_generated') {
        return NextResponse.json(
          { error: 'AI-generated tracks cannot be pitched on OTONAMI. / AI生成楽曲はピッチ送信できません。' },
          { status: 403 }
        );
      }
    }

    // --- Credit deduction (artists.credits via atomic RPC) ---
    if (!cleanRow.curator_id) {
      return NextResponse.json({ error: 'curator_id required' }, { status: 400 });
    }

    // Server-side trusted credit cost: curators.tier is the source of truth
    // (per CLAUDE.md). Ignore any client-supplied credits_charged value.
    const { data: curator } = await db
      .from('curators')
      .select('tier')
      .eq('id', cleanRow.curator_id)
      .maybeSingle();
    const creditsRequired = curator?.tier || 2;
    cleanRow.credits_charged = creditsRequired;

    const { data: newCredits, error: rpcError } = await db.rpc(
      'increment_artist_credits',
      { p_artist_id: payload.artistId, p_amount: -creditsRequired }
    );

    if (rpcError) {
      if (rpcError.code === 'P0001' || rpcError.message?.includes('Insufficient credits')) {
        return NextResponse.json(
          { error: 'Insufficient credits', required: creditsRequired, message: 'クレジットが不足しています' },
          { status: 402 }
        );
      }
      console.error('[pitches] Credit deduction RPC error:', rpcError);
      return NextResponse.json(
        { error: 'Credit processing failed', detail: rpcError.message },
        { status: 500 }
      );
    }

    // --- Insert pitch (with pitch_language retry fallback) ---
    let { data, error } = await db
      .from('pitches')
      .insert(cleanRow)
      .select('id')
      .single();

    if (error && error.message?.includes('pitch_language')) {
      console.warn('[pitches] pitch_language column missing, inserting without it');
      delete cleanRow.pitch_language;
      ({ data, error } = await db
        .from('pitches')
        .insert(cleanRow)
        .select('id')
        .single());
    }

    if (error) {
      // Rollback credit deduction since the pitch was not persisted.
      const { error: rollbackErr } = await db.rpc('increment_artist_credits', {
        p_artist_id: payload.artistId,
        p_amount: creditsRequired,
      });
      if (rollbackErr) {
        console.error('[pitches] CRITICAL: Credit rollback failed:', rollbackErr);
      } else {
        // Note: Supabase .insert() does NOT throw on DB errors — it returns
        // { error }. Always destructure and check; .catch() would silently
        // swallow column/RLS/FK failures.
        const { error: rollbackLogErr } = await db.from('credit_transactions').insert({
          artist_id: payload.artistId,
          amount: creditsRequired,
          type: 'pitch_spend_rollback',
          description: 'Pitch insert failed, credits restored',
          metadata: { curator_id: cleanRow.curator_id, error: error.message },
        });
        if (rollbackLogErr) {
          console.error('[pitches] credit_transactions rollback log failed:', rollbackLogErr);
        }
      }
      console.error('[pitches] Insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the spend (non-fatal if it fails — the balance is already correct).
    // Destructure error; .catch() would silently swallow DB errors since
    // Supabase resolves the Promise even on RLS/FK/column failures.
    const { error: txErr } = await db.from('credit_transactions').insert({
      artist_id: payload.artistId,
      amount: -creditsRequired,
      type: 'pitch_spend',
      description: 'Pitch to curator',
      metadata: { pitch_id: data.id, curator_id: cleanRow.curator_id },
    });
    if (txErr) {
      console.error('[pitches] credit_transactions log failed (non-fatal):', txErr);
    }

    return NextResponse.json({
      id: data.id,
      pitchText: englishBody,
      new_credits: newCredits,
      credits_charged: creditsRequired,
    });
  } catch (e) {
    console.error('[pitches] Unexpected error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
