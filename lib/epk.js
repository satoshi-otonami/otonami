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

  const [{ data: press }, { data: tour }, pitchStats, { data: tracks }] =
    await Promise.all([
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
    ]);

  return {
    epk,
    artist: epk.artist,
    featured_track: epk.featured_track,
    tracks: tracks || [],
    press: press || [],
    tour: tour || [],
    pitch_stats: pitchStats,
  };
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
