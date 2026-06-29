import { supabase, getServiceSupabase } from './supabase';
import { authFetch, ApiError } from './api-client';

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

export async function initSession() {
  const id = getSessionId();
  if (!id) return { id: null };
  try {
    const { data, error } = await supabase
      .from('sessions')
      .upsert({ id, last_seen_at: new Date().toISOString() }, { onConflict: 'id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch {
    return { id };
  }
}

// Test/dummy curators must never display real activity numbers on production cards.
function isTestCurator(row) {
  return (row?.name || '').trim().toLowerCase() === 'test';
}

export async function loadCurators() {
  try {
    const { data, error } = await supabase
      .from('curators')
      .select('*')
      .or('is_seed.is.null,is_seed.eq.false')
      .order('tier', { ascending: true });
    if (error) throw error;
    // Filter out curators with low response rate (5+ pitches received, <50% responded)
    const active = data.filter(c => {
      if (!c.pitches_received || c.pitches_received < 5) return true;
      return (c.pitches_responded || 0) / c.pitches_received >= 0.5;
    });

    // ── Live activity stats from pitches (display-only; never fed to scoring) ──
    // curators.pitches_* columns are unmaintained, so aggregate per curator here.
    //   received  = pitches sent to the curator
    //   responded = curator responded (responded_at set)
    //   accepted  = status === 'accepted'
    // On failure we fall back to empty stats → cards show the neutral "New" state.
    const stats = {};
    try {
      const { data: pitchRows } = await supabase
        .from('pitches')
        .select('curator_id, status, responded_at');
      for (const p of pitchRows || []) {
        if (!p.curator_id) continue;
        const s = (stats[p.curator_id] ||= { received: 0, responded: 0, accepted: 0 });
        s.received += 1;
        if (p.responded_at) s.responded += 1;
        if (p.status === 'accepted') s.accepted += 1;
      }
    } catch { /* non-fatal: leave stats empty */ }

    // Test/dummy curators get a null stat so they never show real numbers.
    return active.map(c => mapCuratorFromDB(c, isTestCurator(c) ? null : stats[c.id]));
  } catch {
    return null;
  }
}

// SNS自動紹介 Phase 2a: 未紹介キュレーターを1件pick。
// 条件: introduced_at IS NULL（未投稿） AND sns_intro_opt_out = false（オプトアウト方式・既定で対象）
//       かつ既存の公開条件 is_seed <> true。並びは created_at DESC、LIMIT 1。
// 該当0件のときは明示的に null を返す（呼び出し側でハンドリング）。
export async function pickUnintroducedCurator() {
  const db = getServiceSupabase();
  const { data, error } = await db
    .from('curators')
    .select('id, name, playlist, url, playlist_url, region, type, opportunities, accepts, tier, genres, preferred_moods, icon_url')
    .is('introduced_at', null)
    .eq('sns_intro_opt_out', false)
    .or('is_seed.is.null,is_seed.eq.false')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
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

export async function saveCuratorToDB(curator) {
  try {
    await supabase
      .from('curators')
      .upsert(mapCuratorToDB(curator), { onConflict: 'id' });
  } catch (e) {
    console.warn('Curator save failed:', e.message);
  }
}

export async function loadPitches(artistEmail) {
  const sessionId = getSessionId();
  if (!sessionId && !artistEmail) return [];
  try {
    let query = supabase.from('pitches').select('*');
    // session_id と artist_email の両方でOR検索（セッション変更時も全ピッチ取得）
    if (sessionId && artistEmail) {
      query = query.or(`session_id.eq.${sessionId},artist_email.eq.${artistEmail}`);
    } else if (sessionId) {
      query = query.eq('session_id', sessionId);
    } else {
      query = query.eq('artist_email', artistEmail);
    }
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) throw error;
    // 重複排除（同じIDのピッチがsession_idとartist_emailの両方でヒットする場合）
    const seen = new Set();
    const unique = data.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
    return unique.map(mapPitchFromDB);
  } catch {
    return [];
  }
}

export async function savePitchesToDB(pitches) {
  const sessionId = getSessionId();
  if (!sessionId || !pitches?.length) return;
  try {
    const rows = pitches.slice(0, 300).map(p => ({
      ...mapPitchToDB(p),
      session_id: sessionId,
    }));
    await supabase.from('pitches').upsert(rows, { onConflict: 'id' });
  } catch (e) {
    console.warn('Pitches save failed:', e.message);
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
    };
  } catch (e) {
    // ApiError (401/402/413/429) は呼び出し側でハンドリングするため再 throw
    if (e instanceof ApiError) throw e;
    console.warn('insertPitchGetUUID failed:', e.message);
    return null;
  }
}

/**
 * Read an artist's credit balance from artists.credits.
 * Returns 0 when artistId is missing (caller is not authenticated as an artist)
 * or when the lookup fails — never reads from localStorage or sessions.credits.
 */
export async function loadCredits(artistId) {
  if (!artistId) return 0;
  try {
    const { data, error } = await supabase
      .from('artists')
      .select('credits')
      .eq('id', artistId)
      .maybeSingle();
    if (error) {
      console.error('loadCredits error:', error);
      return 0;
    }
    return data?.credits ?? 0;
  } catch (e) {
    console.error('loadCredits exception:', e);
    return 0;
  }
}

/**
 * Deprecated. Credit balance is managed server-side:
 *   - Pitch sends decrement via POST /api/pitches (atomic RPC)
 *   - Stripe purchases increment via PUT /api/stripe (atomic RPC)
 *   - Expiry refunds increment via the cron job
 * Use the new_credits value returned by /api/pitches to update local state.
 */
export async function saveCredits() {
  console.warn('saveCredits is deprecated. Credits are managed server-side.');
}

export async function logEmail({ curatorId, curatorEmail, artistName, subject, status = 'sent', errorMessage }) {
  const sessionId = getSessionId();
  try {
    await supabase.from('email_log').insert({
      session_id: sessionId,
      curator_id: curatorId,
      curator_email: curatorEmail,
      artist_name: artistName,
      subject,
      status,
      error_message: errorMessage,
    });
  } catch (e) {
    console.warn('Email log failed:', e.message);
  }
}

export async function registerCurator(formData) {
  const id = `${formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now()}`;
  const { data, error } = await supabase
    .from('curators')
    .insert({
      id,
      name: formData.name,
      email: formData.email,
      type: formData.type || 'blog',
      playlist: formData.outletName,
      url: formData.url,
      genres: formData.genres || [],
      bio: formData.bio,
      followers: parseInt(formData.followers) || 0,
      region: formData.region || 'Global',
      accepts: formData.accepts || [],
      tags: ['pending_review'],
      tier: 2,
      is_seed: false,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// ══════════════════════════════════════════════
// Artist 関連
// ══════════════════════════════════════════════

export async function getArtistByEmail(email) {
  const db = getServiceSupabase();
  const { data, error } = await db
    .from('artists')
    .select('*')
    .eq('email', email)
    .single();
  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return data || null;
}

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

// ══════════════════════════════════════════════
// Curator Mapping
// ══════════════════════════════════════════════

function mapCuratorFromDB(row, stat) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    type: row.type,
    platform: row.platform || null,
    playlist: row.playlist,
    url: row.url,
    genres: row.genres || [],
    bio: row.bio,
    followers: row.followers,
    region: row.region,
    icon: row.icon,
    iconUrl: row.icon_url || null,
    accepts: row.accepts || [],
    tags: row.tags || [],
    tier: row.tier,
    creditCost: row.tier ?? 2,
    isSeed: row.is_seed,
    audioProfile: row.audio_profile || null,
    preferredMoods: row.preferred_moods || [],
    preferredTempo: row.preferred_tempo || null,
    // `similar_artists` is the column written by the curator dashboard;
    // `preferred_artists` is a legacy column kept for backward compat.
    similarArtists: row.similar_artists || [],
    preferredArtists: row.preferred_artists || [],
    rejectedGenres: row.rejected_genres || [],
    playlistUrl: row.playlist_url || null,
    responseTime: row.response_time || null,
    opportunities: row.opportunities || [],
    preferredAttributes: row.preferred_attributes || [],
    // Live activity stats (display-only). Null stat (no pitches / test curator) → zeros → "New".
    pitchesReceived:  stat?.received  ?? 0,
    pitchesResponded: stat?.responded ?? 0,
    pitchesAccepted:  stat?.accepted  ?? 0,
  };
}

function mapCuratorToDB(c) {
  return {
    id: c.id,
    name: c.name,
    email: c.email || null,
    type: c.type || 'blog',
    platform: c.platform || null,
    playlist: c.playlist || null,
    url: c.url || null,
    genres: c.genres || [],
    bio: c.bio || null,
    followers: c.followers || 0,
    region: c.region || 'Global',
    icon: c.icon || '🎵',
    accepts: c.accepts || [],
    tags: c.tags || [],
    tier: c.tier || 2,
    is_seed: c.isSeed || false,
  };
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
    genre: row.genre || row.artist_genre || null,
    creditCost: row.credit_cost ?? 2,
    deadline: row.deadline || null,
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
    deadline: p.deadline || null,
    deadline_at: p.deadline || p.deadlineAt || null,
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
