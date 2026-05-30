import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getArtistById, getArtistTracks } from '@/lib/db';
import {
  getEpkByArtistId,
  createEpk,
  updateEpk,
  generateSlugFromName,
  isSlugAvailable,
  listTourByEpk,
  listPressByEpk,
} from '@/lib/epk';

// Fields the editor is allowed to write (whitelist).
const ALLOWED = [
  'theme',
  'featured_track_id',
  'tagline_en',
  'tagline_jp',
  'pull_quote_en',
  'pull_quote_jp',
  'bio_extended_en',
  'bio_extended_jp',
  'sound_scenes',
  'for_fans_of',
  'contact_management_name',
  'contact_management_email',
  'contact_sync_name',
  'contact_sync_email',
  'contact_press_email',
];

// GET /api/epk/save — load the authenticated artist's EPK + tracks (for the editor)
export async function GET(request) {
  try {
    const payload = await verifyToken(request);
    if (!payload || payload.role !== 'artist') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const artistId = payload.artistId;
    const [artist, epk, tracks] = await Promise.all([
      getArtistById(artistId),
      getEpkByArtistId(artistId),
      getArtistTracks(artistId),
    ]);
    if (!artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }
    // Tour/Press counts power the editor's completion ring (Tour/Press chapters).
    let tourCount = 0;
    let pressCount = 0;
    if (epk) {
      const [tourRows, pressRows] = await Promise.all([
        listTourByEpk(epk.id),
        listPressByEpk(epk.id),
      ]);
      tourCount = tourRows.length;
      pressCount = pressRows.length;
    }
    return NextResponse.json({
      epk: epk || null,
      tracks: tracks || [],
      artist: {
        id: artist.id,
        name: artist.name,
        is_founding: artist.is_founding ?? false,
        founding_number: artist.founding_number ?? null,
      },
      tour_count: tourCount,
      press_count: pressCount,
    });
  } catch (e) {
    console.error('EPK save GET error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/epk/save — create or update the authenticated artist's EPK
export async function POST(request) {
  try {
    const payload = await verifyToken(request);
    if (!payload || payload.role !== 'artist') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const artistId = payload.artistId;

    const artist = await getArtistById(artistId);
    if (!artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }

    const body = await request.json();
    let epk = await getEpkByArtistId(artistId);

    // Build the patch from the whitelist.
    const patch = {};
    for (const key of ALLOWED) {
      if (body[key] !== undefined) patch[key] = body[key] === '' ? null : body[key];
    }

    // Validate featured_track_id belongs to this artist (else clear it).
    if (patch.featured_track_id) {
      const tracks = await getArtistTracks(artistId);
      const owns = tracks.some((t) => t.id === patch.featured_track_id);
      if (!owns) patch.featured_track_id = null;
    }

    // Resolve slug: keep existing, else auto-generate a unique one.
    let slug = epk?.slug;
    if (!slug) {
      const baseSlug = generateSlugFromName(artist.name);
      slug = baseSlug;
      let counter = 1;
      // eslint-disable-next-line no-await-in-loop
      while (!(await isSlugAvailable(slug, epk?.id))) {
        slug = `${baseSlug}-${counter++}`;
      }
    }

    if (epk) {
      epk = await updateEpk(epk.id, patch);
    } else {
      epk = await createEpk({
        artist_id: artistId,
        slug,
        theme: patch.theme || 'editorial_dark',
        ...patch,
      });
    }

    return NextResponse.json({ epk });
  } catch (e) {
    console.error('EPK save POST error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
