import { getServiceSupabase } from './supabase';
import { authFetch, ApiError } from './api-client';
import { isSeedCurator } from './curator-visibility';

const SESSION_KEY = 'otonami-session-id';

function getSessionId() {
  if (typeof window === 'undefined') return null;
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}
/**
 * The curator roster behind /studio (the browsable list and the population
 * match-score runs over).
 *
 * Reads GET /api/curators/studio, which needs an artist token. This used to be
 * an anon-key read of `curators` straight from the browser — see that route for
 * what that exposed. The route returns the mapped, camelCase shape, so there is
 * no client-side mapping step here any more.
 *
 * Returns [] on any failure (including 401 before auth resolves) so a cold mount
 * paints an empty list rather than throwing out of the effect.
 */
export async function loadCurators() {
  try {
    const res = await authFetch('/api/curators/studio');
    if (!res.ok) return [];
    const data = await res.json();
    return data.curators || [];
  } catch {
    return [];
  }
}

// SNS自動紹介 Phase 2a: 未紹介キュレーターを1件pick。
// 条件: introduced_at IS NULL（未投稿） AND sns_intro_opt_out = false（オプトアウト方式・既定で対象）
//       かつ既存の公開条件 is_seed <> true（isSeedCurator でも二重に弾く。
//       これにより Yamaou / Yamao のように sns_intro_opt_out=false のままの
//       seed 行も確実に除外される）。
//       並びは created_at DESC、先頭の非seed 1件を採用。
// 該当0件のときは明示的に null を返す（呼び出し側でハンドリング）。
export async function pickUnintroducedCurator() {
  const db = getServiceSupabase();
  const { data: rows, error } = await db
    .from('curators')
    .select('id, name, playlist, url, playlist_url, region, type, opportunities, accepts, tier, genres, preferred_moods, icon_url, is_seed')
    .is('introduced_at', null)
    .eq('sns_intro_opt_out', false)
    .or('is_seed.is.null,is_seed.eq.false')
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) throw new Error(error.message);
  // Seed/staff/test curators must never be introduced publicly on SNS; skip to
  // the next candidate (fetch a few rows since the JS predicate can't run in
  // SQL). is_seed is in the select above so the predicate can actually read it.
  const data = (rows || []).find(c => !isSeedCurator(c)) || null;
  if (!data) return null;
  // 列の意味を生成側に正しく渡すため正規化（opportunities=サービス /
  // type≠curator_type / tier=クレジットコスト / playlist=媒体名 / genres=ジャンル本体）。
  return {
    id: data.id,
    name: data.name,
    platform: data.playlist || null,        // 媒体名（DB列は playlist）
    platformUrl: data.url || data.playlist_url || null,
    region: data.region || null,
    type: data.type || null,
    opportunities: data.opportunities || [],
    accepts: data.accepts || [],            // accepts=未使用の死列(実DB 4/34)。ジャンルは genres 列を使う。
    tier: data.tier ?? null,
    genres: data.genres ?? [],
    preferred_moods: data.preferred_moods ?? [],
    icon_url: data.icon_url ?? null,
  };
}

// SNS自動紹介 Phase 2b-1: 下書き送信時にワンタイム確定トークンを保存。
// pick のたびに新しい値で上書きし、古い下書きメールの確定リンクを無効化する。
export async function setIntroMarkToken(curatorId, token) {
  const db = getServiceSupabase();
  const { error } = await db
    .from('curators')
    .update({ intro_mark_token: token })
    .eq('id', curatorId);
  if (error) throw new Error(error.message);
}

// SNS自動紹介 Phase 2b-1: ワンタップ確定。
// intro_mark_token を照合し、一致したら introduced_at=now / intro_mark_token=null（再利用防止）。
// 既に確定済みで同じリンクを再タップした場合は冪等に成功扱い（already=true）。
// 戻り値: { ok:true, curator, already? } / { ok:false, reason }
export async function markCuratorIntroduced(curatorId, token) {
  if (!curatorId || !token) return { ok: false, reason: 'missing' };
  const db = getServiceSupabase();
  const { data, error } = await db
    .from('curators')
    .update({ introduced_at: new Date().toISOString(), intro_mark_token: null })
    .eq('id', curatorId)
    .eq('intro_mark_token', token)
    .select('id, name, introduced_at')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return { ok: true, curator: data };
  // token 不一致 → 既に確定済み(token=null化済み)を同リンク再タップしたケースを冪等処理。
  const { data: cur } = await db
    .from('curators')
    .select('id, name, introduced_at')
    .eq('id', curatorId)
    .maybeSingle();
  if (cur && cur.introduced_at) return { ok: true, curator: cur, already: true };
  return { ok: false, reason: 'invalid' };
}

// SNS自動紹介 Phase 2b-1: 確定の取り消し（誤タップ救済）。
// 確定済み(introduced_at IS NOT NULL)のキュレーターのみ取り消し可能。
// introduced_at を null に戻し、画面から渡された token を再アーム（同一リンクで再確定可能に）。
// 戻り値: { ok:true, curator } / { ok:false, reason }
export async function undoCuratorIntroduced(curatorId, token) {
  if (!curatorId || !token) return { ok: false, reason: 'missing' };
  const db = getServiceSupabase();
  const { data, error } = await db
    .from('curators')
    .update({ introduced_at: null, intro_mark_token: token })
    .eq('id', curatorId)
    .not('introduced_at', 'is', null)
    .select('id, name')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { ok: false, reason: 'invalid' };
  return { ok: true, curator: data };
}
/**
 * Pitches for the signed-in artist (the tracking tab).
 *
 * Reads GET /api/pitches, which scopes to the token's artist. This used to be an
 * anon-key read of `pitches`, whose SELECT policy is USING (true) — the browser
 * received every pitch in the table and the artist filter was applied only on the
 * client. The session_id branch is gone with it: every row carries artist_id
 * (187/187 verified 2026-09-20), and a client-supplied session id would have been
 * a guessable key to someone else's pitches.
 */
export async function loadPitches(artistId) {
  try {
    const qs = artistId ? `?artistId=${encodeURIComponent(artistId)}` : '';
    const res = await authFetch(`/api/pitches${qs}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.pitches || []).map(mapPitchFromDB);
  } catch {
    return [];
  }
}
// Insert a single new pitch via the /api/pitches route.
// The route auto-translates Japanese pitch content to English before saving.
// Returns { id, pitchText } where pitchText is the (possibly translated) English body.
export async function insertPitchGetUUID(pitch) {
  const sessionId = getSessionId();
  if (!sessionId) return null;
  try {
    const row = mapPitchToDB(pitch);
    delete row.id; // Let Supabase generate the UUID
    row.session_id = sessionId;

    const res = await authFetch('/api/pitches', {
      method: 'POST',
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      // 409 + curator_paused: the curator turned off intake. Nothing was
      // inserted, charged, or emailed. Returned (not thrown) so sendAll drops
      // this one recipient and keeps going — an ApiError would abort the batch
      // and strand every curator after it.
      if (res.status === 409 && errData.code === 'curator_paused') {
        return { paused: true, message: errData.message || null };
      }
      // 402 Payment Required: insufficient credits. Re-throw so the caller
      // can break out of the per-curator send loop instead of silently failing.
      if (res.status === 402) {
        throw new ApiError(
          'InsufficientCredits',
          errData.message || 'クレジットが不足しています',
          402
        );
      }
      throw new Error(errData.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    // Same-contact duplicate: the server already has an active pitch for this
    // track to this curator's email (via another of their profiles). It did NOT
    // insert, charge, or return an id. Surface skipped so the caller can count
    // it without treating it as a failure — and without sending an email.
    if (data.skipped) {
      return { skipped: true, existing_pitch_id: data.existing_pitch_id };
    }
    // new_credits is the authoritative server-side balance after deduction;
    // callers should setCredits(new_credits) to stay in sync.
    return {
      id: data.id,
      pitchText: data.pitchText ?? row.body,
      new_credits: data.new_credits,
      // サーバが curators.response_time から算出した回答期限（7日 or 14日）
      deadline_at: data.deadline_at ?? null,
      // 次に送るピッチメールの宛先。キュレーター一覧はメールアドレスを
      // 返さなくなったため（/api/curators/studio は不可逆な contactKey のみ）、
      // 実際に作成・課金されたピッチ1件分だけをここで受け取る。
      curator_email: data.curator_email ?? null,
    };
  } catch (e) {
    // ApiError (401/402/413/429) は呼び出し側でハンドリングするため再 throw
    if (e instanceof ApiError) throw e;
    console.warn('insertPitchGetUUID failed:', e.message);
    return null;
  }
}
// ══════════════════════════════════════════════
// Artist 関連
// ══════════════════════════════════════════════

// Removed: getArtistByEmail(). artists.email is a contact address now, not an
// identity — under a label account it repeats across artists, and the old
// .single() turned that into a PGRST116 that read as "wrong password". Look an
// artist up by id (getArtistById) or through its account (getArtistsByAccountId
// / getAccountArtist); look a *login* up with getAccountByEmail().

export async function getArtistById(id) {
  const db = getServiceSupabase();
  const { data, error } = await db
    .from('artists')
    .select('*')
    .eq('id', id)
    .single();
  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return data || null;
}

// ══════════════════════════════════════════════
// Accounts 関連（1ログイン = 1アカウント、配下に複数アーティスト）
// ══════════════════════════════════════════════

// A label can manage several artists from one login. The cap keeps a single
// account from farming signup perks or spamming artist rows; it is a policy
// number, not a schema constraint, so it can be raised without a migration.
export const MAX_ARTISTS_PER_ACCOUNT = 10;

/** Emails are stored lower/trimmed everywhere so lookups can't miss on case. */
export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export async function getAccountByEmail(email) {
  const db = getServiceSupabase();
  const { data, error } = await db
    .from('accounts')
    .select('*')
    .eq('email', normalizeEmail(email))
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data || null;
}

export async function getAccountById(id) {
  if (!id) return null;
  const db = getServiceSupabase();
  const { data, error } = await db
    .from('accounts')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data || null;
}

export async function createAccount({ email, password_hash, email_verified = false, verification_token = null, verification_expires_at = null }) {
  const db = getServiceSupabase();
  const { data, error } = await db
    .from('accounts')
    .insert({
      email: normalizeEmail(email),
      password_hash,
      email_verified,
      verification_token,
      verification_expires_at,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateAccount(id, data) {
  const db = getServiceSupabase();
  const { data: account, error } = await db
    .from('accounts')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return account;
}

/**
 * Every artist under an account, oldest first — the order the switcher shows
 * and the order the active artist is picked from on login.
 */
export async function getArtistsByAccountId(accountId) {
  if (!accountId) return [];
  const db = getServiceSupabase();
  const { data, error } = await db
    .from('artists')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Resolve an artist id *within* an account. Returns null when the artist does
 * not exist or belongs to someone else — the single ownership check the switch
 * endpoint and every account-scoped route relies on.
 */
export async function getAccountArtist(accountId, artistId) {
  if (!accountId || !artistId) return null;
  const db = getServiceSupabase();
  const { data, error } = await db
    .from('artists')
    .select('*')
    .eq('account_id', accountId)
    .eq('id', artistId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data || null;
}

/**
 * Account id for an artist-role JWT payload.
 *
 * Tokens issued before the label-account change carry only `artistId`, and they
 * stay valid for their full 30 days. Fall back to the artist row so those
 * sessions can still reach the account-scoped endpoints instead of 401-ing.
 */
export async function resolveAccountId(payload) {
  if (!payload || payload.role !== 'artist') return null;
  if (payload.accountId) return payload.accountId;
  if (!payload.artistId) return null;
  const artist = await getArtistById(payload.artistId);
  return artist?.account_id || null;
}

export async function countArtistsByAccountId(accountId) {
  const db = getServiceSupabase();
  const { count, error } = await db
    .from('artists')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', accountId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function createArtist(data) {
  const db = getServiceSupabase();
  const { data: artist, error } = await db
    .from('artists')
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return artist;
}

export async function updateArtist(id, data) {
  const db = getServiceSupabase();
  const { data: artist, error } = await db
    .from('artists')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return artist;
}

// ══════════════════════════════════════════════
// Artist Tracks 関連
// ══════════════════════════════════════════════

export async function getArtistTracks(artistId) {
  const db = getServiceSupabase();
  const { data, error } = await db
    .from('artist_tracks')
    .select('*')
    .eq('artist_id', artistId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createArtistTrack(data) {
  const db = getServiceSupabase();
  const { data: track, error } = await db
    .from('artist_tracks')
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return track;
}

export async function updateArtistTrack(id, data, artistId) {
  const db = getServiceSupabase();
  const { data: track, error } = await db
    .from('artist_tracks')
    .update(data)
    .eq('id', id)
    .eq('artist_id', artistId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return track;
}

export async function deleteArtistTrack(id, artistId) {
  const db = getServiceSupabase();
  const { error } = await db
    .from('artist_tracks')
    .delete()
    .eq('id', id)
    .eq('artist_id', artistId);
  if (error) throw new Error(error.message);
}
function mapPitchFromDB(row) {
  return {
    id: row.id,
    artistName: row.artist_name,
    artistNameEn: row.artist_name_en || null,
    artistEmail: row.artist_email || null,
    artistGenre: row.artist_genre,
    curatorId: row.curator_id,
    curatorName: row.curator_name,
    subject: row.subject,
    body: row.body,
    pitchText: row.body || null,
    songTitle: row.song_title || null,
    songLink: row.song_link || null,
    // トラック紐づけ。pitches.track_id → artist_tracks.id
    trackId: row.track_id || null,
    trackTitle: row.artist_tracks?.title || null,
    respondedAt: row.responded_at || null,
    genre: row.genre || row.artist_genre || null,
    creditCost: row.credit_cost ?? 2,
    // 期限はサーバ（POST /api/pitches）が curators.response_time から算出して
    // pitches.deadline_at に保存する。クライアントは読むだけ。
    deadline: row.deadline_at || null,
    status: row.status,
    sentAt: row.sent_at || row.created_at || null,
    createdAt: row.created_at,
    openedAt: row.opened_at || null,
    listenedAt: row.listened_at || null,
    listenDuration: row.listen_duration || 0,
    feedbackAt: row.feedback_at || null,
    rating: row.rating || null,
    matchScore: row.match_score ?? null,
    feedbackMessage: row.feedback_message || row.feedback || null,
    placementPlatform: row.placement_platform || null,
    placementUrl: row.placement_url || null,
    placementDate: row.placement_date || null,
    negotiationStatus: row.negotiation_status || 'none',
    messages: row.messages || [],
  };
}

function mapPitchToDB(p) {
  // pitchText は "Subject: xxx\n\n本文..." の形式で保存されている
  const fullText = p.pitchText || p.body || '';
  const subMatch = fullText.match(/^Subject:\s*(.+)/m);
  const subject = p.subject || (subMatch ? subMatch[1].trim() : null);
  const body = p.body || fullText || null;

  return {
    id: p.id,
    artist_name: p.artistName || p.artist?.name,
    artist_name_en: p.artistNameEn || p.artist?.nameEn || null,
    artist_email: p.artistEmail || p.artist?.email || null,
    artist_genre: p.artistGenre || p.genre || p.artist?.genre,
    curator_id: p.curatorId || p.curator?.id,
    curator_name: p.curatorName || p.curator?.name,
    subject,
    body,
    song_title: p.songTitle || null,
    song_link: p.songLink || null,
    genre: p.genre || p.artistGenre || null,
    credit_cost: p.creditCost ?? 2,
    credits_charged: p.creditCost ?? 2,
    // deadline_at は書かない。サーバが curators.response_time から算出した値が
    // 唯一の正で、ここから送ると upsert が 7 日固定で上書きしてしまう。
    sent_at: p.sentAt || null,
    match_score: p.matchScore ?? null,
    // status / opened_at / listened_at / feedback_at はキュレーター側APIが管理する。
    // 新規INSERT時の status='sent' / sent_at=NOW() は POST /api/pitches が
    // サーバー側で強制セットする（DB default は 'draft' / NULL のため信頼しない）。
    feedback_message: p.feedbackMessage || null,
    placement_platform: p.placementPlatform || null,
    placement_url: p.placementUrl || null,
    placement_date: p.placementDate || null,
    negotiation_status: p.negotiationStatus || null,
    messages: p.messages || [],
    track_id: p.trackId || null,
  };
}
