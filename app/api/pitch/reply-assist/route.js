import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';
import { translateRatelimit, checkRatelimit } from '@/lib/ratelimit';
import { INPUT_LIMITS, validateLength } from '@/lib/validate-input';
import { anthropicRequestBase } from '@/lib/anthropic-model';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });

// かな・漢字のみ（全角記号は含めない — 英文に混ざる「！」等での誤判定を避ける）
const JA_RE = /[぀-ゟ゠-ヿ一-龯]/;

// 返信ボタンを出せるのは、キュレーターが実際に応答したピッチだけ。
// フィードバック通知メールが既にキュレーターの連絡先を開示している状態と
// 同じ条件に揃える（この機能で新たに開示範囲を広げない）。
const REPLYABLE_STATUSES = ['feedback', 'accepted', 'declined'];

// POST /api/pitch/reply-assist — フィードバックへの返信アシスト
//
// 日本語の返信文を「そのまま送れる英文メール本文」に整え、宛先（キュレーターの
// 連絡先）と件名を返す。送信はアーティスト本人のメーラー（mailto）から行う。
// 既存のメール直結経路を維持したまま「英語で書けない」の壁だけを外すのが目的
//（2026/10/11 山下さん決定。アプリ内スレッド化は本機能の利用状況を見て判断）。
export async function POST(request) {
  try {
    const payload = await verifyToken(request);
    if (!payload || payload.role !== 'artist') {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'ログインが必要です' },
        { status: 401 }
      );
    }

    const { pitchId, text } = await request.json();
    if (!pitchId || !text || !String(text).trim()) {
      return NextResponse.json({ error: 'pitchId and text are required' }, { status: 400 });
    }

    const lengthError = validateLength(text, INPUT_LIMITS.TRANSLATE_TEXT, '返信テキスト');
    if (lengthError) {
      return NextResponse.json({ error: 'InputTooLong', message: lengthError }, { status: 413 });
    }

    const db = getServiceSupabase();
    const { data: pitch } = await db
      .from('pitches')
      .select('id, artist_id, artist_name, curator_id, curator_name, subject, status')
      .eq('id', pitchId)
      .maybeSingle();

    if (!pitch) {
      return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });
    }
    // 自分のピッチのみ（レーベルアカウントはアーティスト切替時にトークンが
    // 再発行されるので、トークンのartistIdとの一致で足りる）
    if (!pitch.artist_id || pitch.artist_id !== payload.artistId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    if (!REPLYABLE_STATUSES.includes(pitch.status)) {
      return NextResponse.json(
        { error: 'NotReplyable', message: 'キュレーターの応答後に返信できます' },
        { status: 409 }
      );
    }

    const curatorName = pitch.curator_name || 'the curator';
    const artistName = pitch.artist_name || 'the artist';

    // 既に英語で書かれていればClaude呼び出し（とレート枠）を使わない
    let en = String(text).trim();
    if (JA_RE.test(en)) {
      const rl = await checkRatelimit(translateRatelimit, `artist:${payload.artistId}`);
      if (!rl.success) {
        return NextResponse.json(
          { error: 'RateLimitExceeded', message: rl.error, retryAfter: rl.retryAfter },
          { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
        );
      }
      const response = await client.messages.create({
        ...anthropicRequestBase('translateJa'),
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are helping a Japanese independent artist reply to feedback from an international music curator. Translate the artist's reply into natural, professional English, formatted as a ready-to-send email body.

RULES:
1. Start with a short greeting to ${curatorName} and end with a brief sign-off from ${artistName}.
2. Preserve artist names, track titles, and URLs exactly as-is.
3. Keep it concise and friendly. Do NOT add information the artist did not write.
4. Return ONLY the email body text. No subject line, no explanations, no markdown.

Artist's reply (Japanese):
${en}`,
        }],
      });
      const translated = response.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('')
        .trim();
      if (!translated) {
        return NextResponse.json(
          { error: 'TranslationFailed', message: '英訳に失敗しました。時間をおいて再度お試しください' },
          { status: 502 }
        );
      }
      en = translated;
    }

    // 宛先: キュレーターの登録メール（フィードバック通知メールと同じ開示範囲）
    let curatorEmail = null;
    if (pitch.curator_id) {
      const { data: curatorRow } = await db
        .from('curators')
        .select('email')
        .eq('id', pitch.curator_id)
        .maybeSingle();
      curatorEmail = curatorRow?.email?.trim() || null;
    }

    const subject = `Re: "${pitch.subject || 'your feedback'}" — ${artistName} (via OTONAMI)`;

    return NextResponse.json({ en, curatorEmail, curatorName, subject });
  } catch (e) {
    console.error('[reply-assist] error:', e?.message);
    return NextResponse.json(
      { error: '返信アシストに失敗しました。時間をおいて再度お試しください' },
      { status: 500 }
    );
  }
}
