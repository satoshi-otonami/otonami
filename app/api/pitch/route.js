import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { pitchRatelimit, checkRatelimit } from '@/lib/ratelimit';
import { INPUT_LIMITS, validateAllLengths } from '@/lib/validate-input';
import { getServiceSupabase } from '@/lib/supabase';
import { anthropicRequestBase } from '@/lib/anthropic-model';
import { buildPitchPrompt } from '@/lib/pitch-prompt';
import {
  releaseStatus,
  releasePromptBlock,
  findReleaseClaims,
  neutralizeReleaseClaims,
  todayJst,
} from '@/lib/pitch-release';
import { resolveIdentity, applySignOff, applyArtistName } from '@/lib/pitch-identity';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });

// Comparable key for a track URL: Spotify track id, YouTube video id, or the
// URL without query/hash/trailing slash. Absorbs ?si=..., /intl-ja/, youtu.be.
function linkKey(url) {
  const u = String(url || '').trim();
  if (!u) return '';
  const sp = u.match(/spotify\.com\/(?:intl-[a-z-]+\/)?track\/([A-Za-z0-9]+)/);
  if (sp) return `spotify:${sp[1]}`;
  const yt = u.match(/(?:youtube\.com\/watch\?[^#]*\bv=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{11})/);
  if (yt) return `youtube:${yt[1]}`;
  return u.replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase();
}

// The key track's artist_tracks row (only the caller's own tracks): by trackId,
// else by the song link, else by a title that matches exactly one track.
// null when it cannot be decided — the release status is then UNKNOWN.
async function lookupKeyTrack(sb, artistId, { trackId, songLink, songTitle }) {
  const cols = 'id, title, release_date, spotify_url, youtube_url, soundcloud_url, bandcamp_url';
  if (typeof trackId === 'string' && /^[0-9a-f-]{36}$/i.test(trackId)) {
    const { data } = await sb.from('artist_tracks').select(cols)
      .eq('id', trackId).eq('artist_id', artistId).maybeSingle();
    if (data) return data;
  }
  const { data: rows } = await sb.from('artist_tracks').select(cols).eq('artist_id', artistId).limit(500);
  const tracks = rows || [];
  const key = linkKey(songLink);
  if (key) {
    const byLink = tracks.filter((t) =>
      [t.spotify_url, t.youtube_url, t.soundcloud_url, t.bandcamp_url].some((u) => u && linkKey(u) === key));
    if (byLink.length === 1) return byLink[0];
  }
  const title = String(songTitle || '').trim().toLowerCase();
  if (title) {
    const byTitle = tracks.filter((t) => String(t.title || '').trim().toLowerCase() === title);
    if (byTitle.length === 1) return byTitle[0];
  }
  return null;
}

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
    const { artist, style, links, followers, userName, trackFeatures, trackId } = await request.json();

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
    // hot_news (artists.hot_news) is deliberately NOT read: fed in as a bare
    // "Latest Activity" line it made the model present a different release as the
    // key track's album (α波オルゴール × ゆりかごのうた → "latest release, a Studio
    // Ghibli best collection"; 鳳レオ × 夏哀れ → "my debut single"). Re-enable it
    // only together with rules that keep it a separate work from the key track
    // (buildPitchPrompt still accepts artistDbHotNews for that).
    // name / name_en / label_name / bio_en: the registered spellings
    // (lib/pitch-identity.js). bio_en goes in next to the Japanese bio, as the
    // reference for how names are spelled (it is translated with name_en and
    // label_name pinned — the bio's 「デラ」 otherwise came out as "Dera"). It does
    // not replace the bio: a machine translation can get the meaning wrong.
    let artistDbBio = null;
    let artistDbBioEn = null;
    let artistDbInfluences = null;
    let artistRowForNames = null;
    try {
      const sb = getServiceSupabase();
      const { data: artistRow } = await sb
        .from('artists')
        .select('bio, bio_en, influences, name, name_en, label_name')
        .eq('id', payload.artistId)
        .maybeSingle();
      if (artistRow) {
        artistDbBio = artistRow.bio?.trim() || null;
        artistDbBioEn = (artistDbBio && artistRow.bio_en?.trim()) || null;
        artistRowForNames = artistRow;
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

    // How the key track's release may be described (lib/pitch-release.js).
    // Unknown → never "new"/"latest". Lookup failure must not block generation.
    const today = todayJst();
    let keyTrack = null;
    try {
      keyTrack = await lookupKeyTrack(getServiceSupabase(), payload.artistId, {
        trackId,
        songLink: artist.songLink || links?.songLink,
        songTitle: artist.songTitle,
      });
    } catch (e) {
      console.warn('Pitch: key track lookup failed:', e.message);
    }
    const release = releaseStatus(keyTrack?.release_date || null, today);
    const keyTrackTitle = artist.songTitle || keyTrack?.title || '';

    const identity = resolveIdentity(artistRowForNames, artist);

    const prompt = buildPitchPrompt({
      artist,
      style,
      links,
      followers,
      userName,
      trackFeatures,
      artistDbBio,
      artistDbBioEn,
      artistDbInfluences,
      keyTrackRelease: releasePromptBlock(keyTrackTitle || 'the key track', release, today),
      identity,
    });

    // Strip any Japanese text in parentheses that may have leaked through
    const stripJapaneseParens = (s) =>
      s.replace(/\s*[（(][^）)]*[ぁ-んァ-ヶー一-龠][^）)]*[）)]/g, '');

    const generateOnce = async () => {
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
      // Split pitch and EPK
      const parts = text.split('---EPK---');
      return {
        usage: message.usage,
        pitch: stripJapaneseParens((parts[0] || '').trim()),
        epk: stripJapaneseParens((parts[1] || '').trim()),
      };
    };

    // Release check: one retry if the body calls the track new/latest against
    // its release status; if the retry still does, replace the opening with the
    // fixed neutral opener and drop the other offending sentences whole.
    let gen = await generateOnce();
    const usage = { ...gen.usage };
    const releaseCheck = { status: release.cls, retried: false, neutralized: false };
    let claims = findReleaseClaims(gen.pitch, release);
    if (claims.length) {
      releaseCheck.retried = true;
      gen = await generateOnce();
      usage.input_tokens = (usage.input_tokens || 0) + (gen.usage?.input_tokens || 0);
      usage.output_tokens = (usage.output_tokens || 0) + (gen.usage?.output_tokens || 0);
      claims = findReleaseClaims(gen.pitch, release);
      if (claims.length) {
        gen = { ...gen, pitch: neutralizeReleaseClaims(gen.pitch, claims, keyTrackTitle) };
        releaseCheck.neutralized = true;
        console.warn('Pitch: release claims survived a retry; opening neutralized', {
          artistId: payload.artistId, status: release.cls, claims,
        });
      }
    }
    // The sign-off is written here, from the registered name (name_en, else the
    // name as registered — Japanese included), never by the model.
    const pitch = applySignOff(gen.pitch, identity.signName);
    const epk = applyArtistName(gen.epk, identity.signName);

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
      usage,
      releaseCheck,
    });
  } catch (error) {
    console.error('Pitch generation error:', error);
    return NextResponse.json(
      { error: 'Pitch generation failed', detail: error.message },
      { status: 500 }
    );
  }
}
