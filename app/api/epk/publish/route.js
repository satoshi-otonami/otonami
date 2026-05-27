import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getEpkByArtistId, publishEpk } from '@/lib/epk';

// POST /api/epk/publish — toggle publish state for the authenticated artist's EPK
export async function POST(request) {
  try {
    const payload = await verifyToken(request);
    if (!payload || payload.role !== 'artist') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { is_published } = await request.json();
    const epk = await getEpkByArtistId(payload.artistId);
    if (!epk) {
      return NextResponse.json(
        { error: 'EPK not found — save it first.' },
        { status: 404 }
      );
    }

    const updated = await publishEpk(epk.id, !!is_published);
    return NextResponse.json({ epk: updated });
  } catch (e) {
    console.error('EPK publish error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
