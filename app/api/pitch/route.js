import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { pitchRatelimit, checkRatelimit } from '@/lib/ratelimit';
import { INPUT_LIMITS, validateAllLengths } from '@/lib/validate-input';
import { getServiceSupabase } from '@/lib/supabase';
import { anthropicRequestBase } from '@/lib/anthropic-model';
import { buildPitchPrompt } from '@/lib/pitch-prompt';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });

export async function POST(request) {
  try {
    const payload = await verifyToken(request);
    if (!payload || payload.role !== 'artist') {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'ログインが必要です' },
        { status: 401 }
      );
    }

    const rl = await checkRatelimit(pitchRatelimit, `artist:${payload.artistId}`);
    if (!rl.success) {
      return NextResponse.json(
        { error: 'RateLimitExceeded', message: rl.error, retryAfter: rl.retryAfter },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      );
    }

    // `curator` may still be present in the body from older clients; it is
    // intentionally not read — see the TARGET CURATOR note below.
    const { artist, style, links, followers, userName, trackFeatures } = await request.json();

    if (!artist?.name || !artist?.genre) {
      return NextResponse.json({ error: 'Artist name and genre required' }, { status: 400 });
    }

    // プロンプト組み立ては lib/pitch-prompt.js（純関数）。回帰テストが本番と
    // 同一のプロンプトを組めるように切り出してある。

    // The pitch creation form stores a per-pitch description in localStorage,
    // but the canonical artist profile bio lives in `artists.bio` (written via
    // the artist profile page). These are NOT synced on the frontend, so we
    // fetch the DB bio here and merge it into the prompt — without this, a
    // user with a rich SXSW/Ghibli-grade bio in their profile sees a generic
    // pitch because only the empty pitch-form description reaches Claude.
    let artistDbBio = null;
    let artistDbHotNews = null;
    let artistDbInfluences = null;
    try {
      const sb = getServiceSupabase();
      const { data: artistRow } = await sb
        .from('artists')
        .select('bio, hot_news, influences')
        .eq('id', payload.artistId)
        .maybeSingle();
      if (artistRow) {
        artistDbBio = artistRow.bio?.trim() || null;
        artistDbHotNews = artistRow.hot_news?.trim() || null;
        artistDbInfluences = Array.isArray(artistRow.influences) && artistRow.influences.length
          ? artistRow.influences.join(', ')
          : null;
      }
    } catch (e) {
      console.warn('Pitch: artist bio fetch failed:', e.message);
    }

    const lengthError = validateAllLengths([
      { value: artist.name, max: INPUT_LIMITS.ARTIST_NAME, name: 'アーティスト名' },
      // artist.genre は選択済みジャンルを ", " で連結した1本の文字列なので、効いて
      // いるのは「個数」ではなく合計文字数。既定文言（「ジャンルは100文字以内で
      // 入力してください」）は個数制限と誤読され、実際に顧客が「ジャンルが多すぎる」
      // と解釈した（2026-09 クリムゾンテクノロジー）。汎用バリデータは触らず、この
      // フィールドだけ呼び出し側で文言を上書きする。
      {
        value: artist.genre,
        max: INPUT_LIMITS.GENRE,
        name: 'ジャンル',
        message: (len, max) =>
          `ジャンルの合計文字数が上限を超えています（現在${len} / ${max}文字）。選択しているジャンルを減らしてください。`,
      },
      { value: artist.description, max: INPUT_LIMITS.ARTIST_DESCRIPTION, name: '自己紹介' },
      { value: artist.influences, max: INPUT_LIMITS.ARTIST_INFLUENCES, name: '影響を受けたアーティスト' },
      { value: artist.achievements, max: INPUT_LIMITS.ARTIST_ACHIEVEMENTS, name: '実績' },
    ]);
    if (lengthError) {
      return NextResponse.json({ error: 'InputTooLong', message: lengthError }, { status: 413 });
    }

    const prompt = buildPitchPrompt({
      artist,
      style,
      links,
      followers,
      userName,
      trackFeatures,
      artistDbBio,
      artistDbHotNews,
      artistDbInfluences,
    });

    const message = await client.messages.create({
      ...anthropicRequestBase('pitch'),
      max_tokens: 1200,
      // temperature は指定しない。Sonnet 5 / Opus 4.7 以降では temperature /
      // top_p / top_k は API から削除されており、渡すと 400 になる。
      // 以前ここには temperature: 0.3 があり「既定の 1.0 だと禁止語を拾う
      // ことがある」ための保険だったが、その役目は (1) TONE LOCK の
      // FORBIDDEN リスト (2) scrubTone() による決定論的なスクラブ
      // (3) 出力直前の FINAL CHECK が引き継いでいる。
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n');

    // Strip any Japanese text in parentheses that may have leaked through
    const stripJapaneseParens = (s) =>
      s.replace(/\s*[（(][^）)]*[ぁ-んァ-ヶー一-龠][^）)]*[）)]/g, '');

    // Split pitch and EPK
    const parts = text.split('---EPK---');
    const pitch = stripJapaneseParens((parts[0] || '').trim());
    const epk = stripJapaneseParens((parts[1] || '').trim());

    // Persist the achievements/description the artist actually used, so the next
    // pitch (e.g. re-pitching the same track to another curator) prefills them
    // instead of forcing re-entry. Last-used-wins, but only for non-empty values
    // so an omitted field never wipes a previously saved one. Non-fatal: a save
    // failure must not break pitch generation. Does NOT touch `bio` (EPK source).
    try {
      const profileUpdate = {};
      const usedAchievements = (artist.achievements || '').trim();
      const usedDescription = (artist.description || '').trim();
      if (usedAchievements) profileUpdate.achievements = usedAchievements;
      if (usedDescription) profileUpdate.description = usedDescription;
      if (Object.keys(profileUpdate).length > 0) {
        const sbSave = getServiceSupabase();
        const { error: saveErr } = await sbSave
          .from('artists')
          .update(profileUpdate)
          .eq('id', payload.artistId);
        if (saveErr) console.warn('Pitch: profile prefill save failed:', saveErr.message);
      }
    } catch (e) {
      console.warn('Pitch: profile prefill save exception:', e.message);
    }

    return NextResponse.json({
      pitch,
      epk,
      usage: message.usage,
    });
  } catch (error) {
    console.error('Pitch generation error:', error);
    return NextResponse.json(
      { error: 'Pitch generation failed', detail: error.message },
      { status: 500 }
    );
  }
}
