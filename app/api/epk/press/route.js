import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getEpkByArtistId, listPressByEpk, createPress } from '@/lib/epk';

async function authedEpk(request) {
  const payload = await verifyToken(request);
  if (!payload || payload.role !== 'artist') {
    return { error: 'Unauthorized', status: 401 };
  }
  const epk = await getEpkByArtistId(payload.artistId);
  if (!epk) return { error: 'EPK not found — save it first.', status: 404 };
  return { epk };
}

// GET /api/epk/press — list the artist's press rows
export async function GET(request) {
  try {
    const { epk, error, status } = await authedEpk(request);
    if (error) return NextResponse.json({ error }, { status });
    const press = await listPressByEpk(epk.id);
    return NextResponse.json({ press });
  } catch (e) {
    console.error('EPK press GET error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/epk/press — add a press row
export async function POST(request) {
  try {
    const { epk, error, status } = await authedEpk(request);
    if (error) return NextResponse.json({ error }, { status });
    const body = await request.json();
    const press = await createPress(epk.id, body);
    return NextResponse.json({ press }, { status: 201 });
  } catch (e) {
    console.error('EPK press POST error:', e);
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
