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

export async function loadPitches() {
  const sessionId = getSessionId();
  if (!sessionId) return [];
  try {
    const { data, error } = await supabase
      .from('pitches')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) throw error;
    return data.map(mapPitchFromDB);
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
    playlist: row.playlist,
    url: row.url,
    genres: row.genres || [],
    bio: row.bio,
    followers: row.followers,
    region: row.region,
    icon: row.icon,
    accepts: row.accepts || [],
    tags: row.tags || [],
    tier: row.tier,
    isSeed: row.is_seed,
  };
}

function mapCuratorToDB(c) {
  return {
    id: c.id,
    name: c.name,
    email: c.email || null,
    type: c.type || 'blog',
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
    artistGenre: row.artist_genre,
    curatorId: row.curator_id,
    curatorName: row.curator_name,
    subject: row.subject,
    body: row.body,
    status: row.status,
    sentAt: row.sent_at,
    createdAt: row.created_at,
  };
}

function mapPitchToDB(p) {
  return {
    id: p.id,
    artist_name: p.artistName || p.artist?.name,
    artist_genre: p.artistGenre || p.artist?.genre,
    curator_id: p.curatorId || p.curator?.id,
    curator_name: p.curatorName || p.curator?.name,
    subject: p.subject,
    body: p.body,
    status: p.status || 'draft',
    sent_at: p.sentAt || null,
  };
}
