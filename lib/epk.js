// ══════════════════════════════════════════════════════════════
//  EPK data layer (Phase 1)
//  All functions run server-side (public page SSR + API routes), so
//  they use getServiceSupabase() — matching lib/db.js — rather than the
//  anon client. Reads/writes therefore bypass RLS cleanly.
// ══════════════════════════════════════════════════════════════
import { getServiceSupabase } from './supabase';

// artists columns that actually exist (NOTE: soundcloud_url / bandcamp_url
// live on artist_tracks, not artists — do not select them here).
const ARTIST_FIELDS =
  'id, name, bio, hot_news, avatar_url, cover_url, region, label_name, ' +
  'genres, moods, influences, twitter_url, instagram_url, youtube_url, ' +
  'spotify_url, facebook_url, website_url';

const TRACK_FIELDS =
  'id, title, youtube_url, spotify_url, soundcloud_url, bandcamp_url, ' +
  'cover_image_url, release_date, genre';

// ── Public EPK (published only) — for /epk/[slug] ──
export async function getPublicEpk(slug) {
  const db = getServiceSupabase();

  const { data: epk, error } = await db
    .from('artist_epks')
    .select(
      `*,
       artist:artist_id ( ${ARTIST_FIELDS} ),
       featured_track:featured_track_id ( ${TRACK_FIELDS} )`
    )
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();

  if (error) {
    console.error('getPublicEpk error:', error);
    return null;
  }
  if (!epk) return null;

  const trackIds = Array.isArray(epk.playlist_track_ids)
    ? epk.playlist_track_ids
    : [];

  const [
    { data: press },
    { data: tour },
    pitchStats,
    { data: tracks },
    playlistTracks,
  ] = await Promise.all([
    db.from('epk_press').select('*').eq('epk_id', epk.id).order('sort_order'),
    db.from('epk_tour').select('*').eq('epk_id', epk.id).order('sort_order'),
    getPitchStatsForArtist(epk.artist_id),
    db
      .from('artist_tracks')
      .select(TRACK_FIELDS)
      .eq('artist_id', epk.artist_id)
      .eq('is_public', true)
      .order('release_date', { ascending: false, nullsFirst: false })
      .limit(10),
    resolvePlaylistTracks(db, epk, trackIds),
  ]);

  return {
    epk,
    artist: epk.artist,
    featured_track: epk.featured_track,
    playlist_tracks: playlistTracks,
    tracks: tracks || [],
    press: press || [],
    tour: tour || [],
    pitch_stats: pitchStats,
  };
}

// Resolve the Featured Playlist into ordered track rows. Order follows
// playlist_track_ids (pinned first). Falls back to the single featured_track
// for EPKs created before playlists existed (or with an empty playlist).
async function resolvePlaylistTracks(db, epk, trackIds) {
  if (trackIds.length > 0) {
    const { data: rows } = await db
      .from('artist_tracks')
      .select(TRACK_FIELDS)
      .eq('artist_id', epk.artist_id)
      .in('id', trackIds);
    const ordered = trackIds
      .map((id) => (rows || []).find((t) => t.id === id))
      .filter(Boolean);
    if (ordered.length > 0) return ordered;
  }
  return epk.featured_track ? [epk.featured_track] : [];
}

// ── Pitch stats for the OTONAMI badge ──
// NOTE: pitches has no `opened_at` column (the spec referenced one that
// doesn't exist). We derive a response rate from `responded_at` instead.
async function getPitchStatsForArtist(artistId) {
  const db = getServiceSupabase();
  const { data: pitches, error } = await db
    .from('pitches')
    .select('curator_id, status, responded_at, curators(region)')
    .eq('artist_id', artistId)
    .neq('status', 'draft');

  if (error || !pitches || pitches.length === 0) {
    return { curators_reached: 0, countries: 0, response_rate: 0, total: 0 };
  }

  const curators = new Set(pitches.map((p) => p.curator_id).filter(Boolean));
  const regions = new Set(pitches.map((p) => p.curators?.region).filter(Boolean));
  const responded = pitches.filter((p) => p.responded_at).length;

  return {
    curators_reached: curators.size,
    countries: regions.size,
    response_rate: Math.round((responded / pitches.length) * 100),
    total: pitches.length,
  };
}

// ── CRUD (editor) ──
export async function getEpkByArtistId(artistId) {
  const db = getServiceSupabase();
  const { data, error } = await db
    .from('artist_epks')
    .select('*')
    .eq('artist_id', artistId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function createEpk({ artist_id, slug, ...rest }) {
  const db = getServiceSupabase();
  const { data, error } = await db
    .from('artist_epks')
    .insert({ artist_id, slug, ...rest })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateEpk(id, patch) {
  const db = getServiceSupabase();
  const { data, error } = await db
    .from('artist_epks')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function publishEpk(id, isPublished) {
  return updateEpk(id, { is_published: isPublished });
}

// ── slug helpers ──
export function generateSlugFromName(name) {
  const base = (name || 'artist')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
  // slug CHECK requires first char [a-z0-9] and length >= 2
  if (!base || base.length < 2) return `artist-${Date.now().toString(36)}`;
  return base;
}

export async function isSlugAvailable(slug, excludeEpkId = null) {
  const db = getServiceSupabase();
  let query = db.from('artist_epks').select('id').eq('slug', slug);
  if (excludeEpkId) query = query.neq('id', excludeEpkId);
  const { data } = await query.maybeSingle();
  return !data;
}

// ── small helper: copy only whitelisted keys that were actually provided ──
function pickFields(obj, fields) {
  const out = {};
  for (const k of fields) if (obj?.[k] !== undefined) out[k] = obj[k];
  return out;
}

// ── Featured Playlist ──
// trackIds is an ordered array (pinned first), max 5, all owned by the artist.
// featured_track_id is kept in sync with the pinned track for back-compat.
export async function updatePlaylist(epkId, trackIds) {
  const db = getServiceSupabase();
  if (!Array.isArray(trackIds)) {
    throw new Error('playlist must be an array of track ids');
  }
  // De-dupe while preserving order, then cap at 5.
  const ids = [...new Set(trackIds.filter(Boolean))];
  if (ids.length > 5) {
    throw new Error('playlist accepts at most 5 tracks');
  }

  const { data: epk, error: epkErr } = await db
    .from('artist_epks')
    .select('id, artist_id')
    .eq('id', epkId)
    .maybeSingle();
  if (epkErr) throw new Error(epkErr.message);
  if (!epk) throw new Error('EPK not found');

  if (ids.length > 0) {
    const { data: owned, error: ownErr } = await db
      .from('artist_tracks')
      .select('id')
      .eq('artist_id', epk.artist_id)
      .in('id', ids);
    if (ownErr) throw new Error(ownErr.message);
    if ((owned || []).length !== ids.length) {
      throw new Error('playlist contains tracks not owned by this artist');
    }
  }

  const { data, error } = await db
    .from('artist_epks')
    .update({ playlist_track_ids: ids, featured_track_id: ids[0] || null })
    .eq('id', epkId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// ── Tour & Live (epk_tour) ──
const TOUR_FIELDS = [
  'year',
  'event_en',
  'event_jp',
  'location',
  'is_highlight',
  'highlight_count',
  'highlight_label',
  'sort_order',
];

export async function listTourByEpk(epkId) {
  const db = getServiceSupabase();
  const { data, error } = await db
    .from('epk_tour')
    .select('*')
    .eq('epk_id', epkId)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createTour(epkId, input) {
  const db = getServiceSupabase();
  const { data, error } = await db
    .from('epk_tour')
    .insert({ epk_id: epkId, ...pickFields(input, TOUR_FIELDS) })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// id + epkId scope every mutation so an artist can only touch their own rows.
export async function updateTour(id, epkId, patch) {
  const db = getServiceSupabase();
  const { data, error } = await db
    .from('epk_tour')
    .update(pickFields(patch, TOUR_FIELDS))
    .eq('id', id)
    .eq('epk_id', epkId)
    .select();
  if (error) throw new Error(error.message);
  return data?.[0] || null;
}

export async function deleteTour(id, epkId) {
  const db = getServiceSupabase();
  const { data, error } = await db
    .from('epk_tour')
    .delete()
    .eq('id', id)
    .eq('epk_id', epkId)
    .select();
  if (error) throw new Error(error.message);
  return (data?.length || 0) > 0;
}

// ── Press & Recognition (epk_press) ──
const PRESS_FIELDS = [
  'quote_en',
  'quote_jp',
  'source',
  'date_label',
  'source_url',
  'sort_order',
];

export async function listPressByEpk(epkId) {
  const db = getServiceSupabase();
  const { data, error } = await db
    .from('epk_press')
    .select('*')
    .eq('epk_id', epkId)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createPress(epkId, input) {
  const db = getServiceSupabase();
  // epk_press.source is NOT NULL — reject early with a clear message.
  if (!input?.source) throw new Error('press source is required');
  const { data, error } = await db
    .from('epk_press')
    .insert({ epk_id: epkId, ...pickFields(input, PRESS_FIELDS) })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updatePress(id, epkId, patch) {
  const db = getServiceSupabase();
  const { data, error } = await db
    .from('epk_press')
    .update(pickFields(patch, PRESS_FIELDS))
    .eq('id', id)
    .eq('epk_id', epkId)
    .select();
  if (error) throw new Error(error.message);
  return data?.[0] || null;
}

export async function deletePress(id, epkId) {
  const db = getServiceSupabase();
  const { data, error } = await db
    .from('epk_press')
    .delete()
    .eq('id', id)
    .eq('epk_id', epkId)
    .select();
  if (error) throw new Error(error.message);
  return (data?.length || 0) > 0;
}
