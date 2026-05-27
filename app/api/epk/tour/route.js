import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getEpkByArtistId, listTourByEpk, createTour } from '@/lib/epk';

// Resolve the authenticated artist's EPK, or an { error, status } to return.
async function authedEpk(request) {
  const payload = await verifyToken(request);
  if (!payload || payload.role !== 'artist') {
    return { error: 'Unauthorized', status: 401 };
  }
  const epk = await getEpkByArtistId(payload.artistId);
  if (!epk) return { error: 'EPK not found — save it first.', status: 404 };
  return { epk };
}

// GET /api/epk/tour — list the artist's tour rows
export async function GET(request) {
  try {
    const { epk, error, status } = await authedEpk(request);
    if (error) return NextResponse.json({ error }, { status });
    const tour = await listTourByEpk(epk.id);
    return NextResponse.json({ tour });
  } catch (e) {
    console.error('EPK tour GET error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/epk/tour — add a tour row
export async function POST(request) {
  try {
    const { epk, error, status } = await authedEpk(request);
    if (error) return NextResponse.json({ error }, { status });
    const body = await request.json();
    const tour = await createTour(epk.id, body);
    return NextResponse.json({ tour }, { status: 201 });
  } catch (e) {
    console.error('EPK tour POST error:', e);
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
