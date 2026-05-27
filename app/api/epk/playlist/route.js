import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getEpkByArtistId, updatePlaylist } from '@/lib/epk';

// PATCH /api/epk/playlist — set the Featured Playlist for the authenticated
// artist's EPK. Body: { track_ids: ["uuid", ...] } (ordered, pinned first, max 5).
export async function PATCH(request) {
  try {
    const payload = await verifyToken(request);
    if (!payload || payload.role !== 'artist') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const epk = await getEpkByArtistId(payload.artistId);
    if (!epk) {
      return NextResponse.json(
        { error: 'EPK not found — save it first.' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const trackIds = body.track_ids ?? body.trackIds ?? [];
    const updated = await updatePlaylist(epk.id, trackIds);
    return NextResponse.json({ epk: updated });
  } catch (e) {
    console.error('EPK playlist PATCH error:', e);
    // Validation failures (max 5, ownership) surface here as 400.
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
