import { NextResponse } from 'next/server';
import { getPublicEpk } from '@/lib/epk';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,49}$/;

// GET /api/epk/[slug] — public, published EPK only
export async function GET(req, { params }) {
  const { slug } = params;
  if (!slug || !SLUG_RE.test(slug)) {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
  }

  try {
    const data = await getPublicEpk(slug);
    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error('EPK public GET error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
