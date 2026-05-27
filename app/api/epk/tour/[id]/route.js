import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getEpkByArtistId, updateTour, deleteTour } from '@/lib/epk';

async function authedEpk(request) {
  const payload = await verifyToken(request);
  if (!payload || payload.role !== 'artist') {
    return { error: 'Unauthorized', status: 401 };
  }
  const epk = await getEpkByArtistId(payload.artistId);
  if (!epk) return { error: 'EPK not found — save it first.', status: 404 };
  return { epk };
}

// PATCH /api/epk/tour/[id] — update one tour row (scoped to the artist's EPK)
export async function PATCH(request, { params }) {
  try {
    const { epk, error, status } = await authedEpk(request);
    if (error) return NextResponse.json({ error }, { status });
    const body = await request.json();
    const tour = await updateTour(params.id, epk.id, body);
    if (!tour) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ tour });
  } catch (e) {
    console.error('EPK tour PATCH error:', e);
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

// DELETE /api/epk/tour/[id] — remove one tour row (scoped to the artist's EPK)
export async function DELETE(request, { params }) {
  try {
    const { epk, error, status } = await authedEpk(request);
    if (error) return NextResponse.json({ error }, { status });
    const ok = await deleteTour(params.id, epk.id);
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('EPK tour DELETE error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
