import { NextResponse } from 'next/server';
import { verifyToken, signArtistSession } from '@/lib/auth';
import { getAccountById, getAccountArtist, resolveAccountId } from '@/lib/db';

// POST /api/account/switch — アクティブアーティストの切替
//
// The whole switch is a token re-issue: `artistId` in the JWT *is* the active
// artist, so every existing route (pitch creation, credits, tracks, EPK…) picks
// up the new context with no change. The ownership check below is the only
// thing standing between a session and another account's artist, so it must
// stay a scoped lookup (account_id AND id), never an id-only one.
export async function POST(request) {
  try {
    const payload = await verifyToken(request);
    if (!payload || payload.role !== 'artist') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = await resolveAccountId(payload);
    if (!accountId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { artist_id: artistId } = await request.json();
    if (!artistId) {
      return NextResponse.json({ error: 'artist_id is required' }, { status: 400 });
    }

    const artist = await getAccountArtist(accountId, artistId);
    if (!artist) {
      // Same response whether the artist does not exist or belongs to someone
      // else — do not let a caller probe for valid artist ids.
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }

    const account = await getAccountById(accountId);
    const token = await signArtistSession({
      accountId,
      artistId: artist.id,
      email: account?.email || payload.email,
    });

    return NextResponse.json({
      success: true,
      token,
      artist: {
        id: artist.id,
        name: artist.name,
        email: artist.email,
        avatar_url: artist.avatar_url,
        credits: artist.credits,
      },
    });
  } catch (e) {
    console.error('Account switch error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
