import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getEpkByArtistId, updatePress, deletePress } from '@/lib/epk';

async function authedEpk(request) {
  const payload = await verifyToken(request);
  if (!payload || payload.role !== 'artist') {
    return { error: 'Unauthorized', status: 401 };
  }
  const epk = await getEpkByArtistId(payload.artistId);
  if (!epk) return { error: 'EPK not found — save it first.', status: 404 };
  return { epk };
}

// PATCH /api/epk/press/[id] — update one press row (scoped to the artist's EPK)
export async function PATCH(request, { params }) {
  try {
    const { epk, error, status } = await authedEpk(request);
    if (error) return NextResponse.json({ error }, { status });
    const body = await request.json();
    const press = await updatePress(params.id, epk.id, body);
    if (!press) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ press });
  } catch (e) {
    console.error('EPK press PATCH error:', e);
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

// DELETE /api/epk/press/[id] — remove one press row (scoped to the artist's EPK)
export async function DELETE(request, { params }) {
  try {
    const { epk, error, status } = await authedEpk(request);
    if (error) return NextResponse.json({ error }, { status });
    const ok = await deletePress(params.id, epk.id);
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('EPK press DELETE error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
