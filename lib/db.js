import { supabase } from './supabase';

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
  if (!id) return { id: null, credits: 20 };
  try {
    const { data, error } = await supabase
      .from('sessions')
      .upsert({ id, last_seen_at: new Date().toISOString() }, { onConflict: 'id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch {
    const localCredits = parseInt(localStorage.getItem('otonami-credits') || '20');
    return { id, credits: localCredits };
  }
}

export async function loadCurators() {
  try {
    const { data, error } = await supabase
      .from('curators')
      .select('*')
      .order('tier', { ascending: true });
    if (error) throw error;
    return data.map(mapCuratorFromDB);
  } catch {
    return null;
  }
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

    const res = await fetch('/api/pitches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    // Return { id, pitchText } so callers can use the (translated) text for emails
    return { id: data.id, pitchText: data.pitchText ?? row.body };
  } catch (e) {
    console.warn('insertPitchGetUUID failed:', e.message);
    return null;
  }
}

export async function loadCredits() {
  const sessionId = getSessionId();
  if (!sessionId) return 20;
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('credits')
      .eq('id', sessionId)
      .single();
    if (error) throw error;
    return data.credits;
  } catch {
    return parseInt(localStorage.getItem('otonami-credits') || '20');
  }
}

export async function saveCredits(credits) {
  const sessionId = getSessionId();
  localStorage.setItem('otonami-credits', String(credits));
  if (!sessionId) return;
  try {
    await supabase
      .from('sessions')
      .update({ credits })
      .eq('id', sessionId);
  } catch (e) {
    console.warn('Credits save failed:', e.message);
  }
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
      tier: 3,
      is_seed: false,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

function mapCuratorFromDB(row) {
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
    isSeed: row.is_seed,
    audioProfile: row.audio_profile || null,
    preferredMoods: row.preferred_moods || [],
    preferredTempo: row.preferred_tempo || null,
    preferredArtists: row.preferred_artists || [],
    rejectedGenres: row.rejected_genres || [],
    playlistUrl: row.playlist_url || null,
    responseTime: row.response_time || null,
    opportunities: row.opportunities || [],
    preferredAttributes: row.preferred_attributes || [],
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
    deadline: p.deadline || null,
    match_score: p.matchScore ?? null,
    // status / sent_at / opened_at / listened_at / feedback_at は
    // キュレーター側APIが管理するため、アーティスト側からは上書きしない。
    // 新規INSERT時はDBスキーマのデフォルト値（status='sent', sent_at=NOW()）が使われる。
    feedback_message: p.feedbackMessage || null,
    placement_platform: p.placementPlatform || null,
    placement_url: p.placementUrl || null,
    placement_date: p.placementDate || null,
    negotiation_status: p.negotiationStatus || null,
    messages: p.messages || [],
  };
}
