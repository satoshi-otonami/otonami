import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';
import { isTestCurator } from '@/lib/curator-visibility';

export const dynamic = 'force-dynamic';

// The curator roster behind /studio — the list artists browse and the population
// match-score runs over.
//
// This used to be lib/db.js `loadCurators()`, which read `curators` straight from
// the browser with the public anon key. That handed every visitor all 46 columns
// of all 55 rows: pw_hash, payment_info, verification_token, intro_mark_token and
// every curator's email address. Phase 1 (2026-09-20) closed the four secrets with
// a column-level GRANT; this route closes the rest by moving the read server-side,
// so the anon SELECT policy on `curators` can be dropped entirely.
//
// The shape returned here is exactly what mapCuratorFromDB used to build, minus
// `email`. Nothing artist-facing needs the address itself — the one thing it was
// used for (spotting that two curator profiles belong to the same person, so the
// UI can grey out a sibling that already holds an active pitch) is served by
// `contactKey` below.

// Same-contact grouping without shipping the address. Salted with JWT_SECRET so
// the digest can't be reversed by hashing a guessed list of addresses; truncated
// because it only ever gets compared for equality within one response.
const CONTACT_SALT = process.env.JWT_SECRET || 'otonami-contact-key';
function contactKey(email) {
  const norm = (email || '').trim().toLowerCase();
  if (!norm) return null;
  return createHash('sha256').update(`${CONTACT_SALT}:${norm}`).digest('hex').slice(0, 16);
}

// Mirrors the old mapCuratorFromDB. `platform`, `audioProfile` and
// `preferredTempo` were read off the row by that mapper but have never existed as
// columns on the live table, so they were always null — kept at null here rather
// than silently dropped, so the client contract does not change.
function mapCurator(c, stat) {
  return {
    id: c.id,
    name: c.name,
    type: c.type,
    platform: null,
    playlist: c.playlist,
    url: c.url,
    genres: c.genres || [],
    bio: c.bio,
    followers: c.followers,
    region: c.region,
    icon: c.icon,
    iconUrl: c.icon_url || null,
    accepts: c.accepts || [],
    tags: c.tags || [],
    tier: c.tier,
    creditCost: c.tier ?? 2,
    isSeed: c.is_seed,
    isPaused: c.is_paused === true,
    audioProfile: null,
    preferredMoods: c.preferred_moods || [],
    preferredTempo: null,
    similarArtists: c.similar_artists || [],
    preferredArtists: c.preferred_artists || [],
    rejectedGenres: c.rejected_genres || [],
    openToAllGenres: c.open_to_all_genres === true,
    playlistUrl: c.playlist_url || null,
    responseTime: c.response_time || null,
    opportunities: c.opportunities || [],
    preferredAttributes: c.preferred_attributes || [],
    submissionGuidelines: c.submission_guidelines || null,
    // Live activity stats (display-only). Null stat → zeros → the "New" card state.
    pitchesReceived: stat?.received ?? 0,
    pitchesResponded: stat?.responded ?? 0,
    pitchesAccepted: stat?.accepted ?? 0,
    // Opaque per-person grouping token. Equal values mean "same human", nothing more.
    contactKey: contactKey(c.email),
  };
}

// GET /api/curators/studio — artist token required.
export async function GET(request) {
  try {
    const payload = await verifyToken(request);
    if (!payload || payload.role !== 'artist') {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'ログインが必要です' },
        { status: 401 }
      );
    }

    const db = getServiceSupabase();

    // `email` is selected but never returned — contactKey() consumes it here and
    // the mapper drops it.
    const { data, error } = await db
      .from('curators')
      .select(
        'id,name,email,type,playlist,url,genres,bio,followers,region,icon,icon_url,' +
        'accepts,tags,tier,is_seed,is_paused,preferred_moods,similar_artists,' +
        'preferred_artists,rejected_genres,open_to_all_genres,playlist_url,' +
        'response_time,opportunities,preferred_attributes,submission_guidelines,' +
        'pitches_received,pitches_responded'
      )
      .or('is_seed.is.null,is_seed.eq.false')
      // Curators who paused intake are hidden from artist-facing matching.
      // `not is true` (rather than eq.false) so a NULL — should the column ever
      // be made nullable — still reads as "accepting".
      .not('is_paused', 'is', true)
      .order('tier', { ascending: true });
    if (error) throw new Error(error.message);

    // Seed/staff/test curators are excluded from artist-facing lists entirely
    // (they used to slip through and could receive real pitches). Redundant with
    // the SQL filter above by design — a second guard on the same source of truth.
    const visible = (data || []).filter(c => !isTestCurator(c) && c.is_paused !== true);
    // Filter out curators with low response rate (5+ pitches received, <50% responded).
    // Note these columns are unmaintained (all zero today), so this has never
    // actually fired — kept as-is to avoid changing behaviour in a security change.
    const active = visible.filter(c => {
      if (!c.pitches_received || c.pitches_received < 5) return true;
      return (c.pitches_responded || 0) / c.pitches_received >= 0.5;
    });

    // ── Live activity stats from pitches (display-only; never fed to scoring) ──
    // curators.pitches_* columns are unmaintained, so aggregate per curator here.
    // On failure we fall back to empty stats → cards show the neutral "New" state.
    const stats = {};
    try {
      const { data: pitchRows } = await db
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

    return NextResponse.json(
      { curators: active.map(c => mapCurator(c, stats[c.id])) },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (e) {
    console.error('Curators studio error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
