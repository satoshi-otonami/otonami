import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';
import {
  getArtistTracks,
  createArtistTrack,
  updateArtistTrack,
  deleteArtistTrack,
} from '@/lib/db';

// POST /api/artists/tracks — 楽曲追加（同一 artist_id + URL の既存行があれば再利用）
export async function POST(request) {
  try {
    const payload = await verifyToken(request);
    if (!payload || payload.role !== 'artist') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    if (!body.title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const VALID_AI_STATUS = ['human', 'ai_assisted', 'ai_generated'];
    const aiStatus = VALID_AI_STATUS.includes(body.ai_status) ? body.ai_status : 'human';

    // Dedup: when any URL is provided, look for an existing row for this
    // artist with the same value in the matching URL column. Studio sends
    // /api/artists/tracks on every analysis, so without this each pitch of
    // the same song would create a duplicate library entry.
    const urlFields = [
      { key: 'youtube_url',    value: body.youtube_url    || null },
      { key: 'spotify_url',    value: body.spotify_url    || null },
      { key: 'soundcloud_url', value: body.soundcloud_url || null },
      { key: 'bandcamp_url',   value: body.bandcamp_url   || null },
    ].filter(f => f.value);

    if (urlFields.length > 0) {
      const db = getServiceSupabase();
      let query = db
        .from('artist_tracks')
        .select('*')
        .eq('artist_id', payload.artistId)
        .limit(1);
      for (const f of urlFields) query = query.eq(f.key, f.value);
      const { data: existing } = await query.maybeSingle();
      if (existing) {
        return NextResponse.json({ success: true, track: existing, deduped: true });
      }
    }

    const track = await createArtistTrack({
      artist_id: payload.artistId,
      title: body.title,
      youtube_url: body.youtube_url || null,
      spotify_url: body.spotify_url || null,
      soundcloud_url: body.soundcloud_url || null,
      bandcamp_url: body.bandcamp_url || null,
      release_date: body.release_date || null,
      genre: body.genre || null,
      cover_image_url: body.cover_image_url || null,
      is_public: body.is_public !== undefined ? body.is_public : true,
      ai_status: aiStatus,
    });

    return NextResponse.json({ success: true, track });
  } catch (e) {
    console.error('Track POST error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET /api/artists/tracks — 楽曲一覧
export async function GET(request) {
  try {
    const payload = await verifyToken(request);
    if (!payload || payload.role !== 'artist') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tracks = await getArtistTracks(payload.artistId);
    return NextResponse.json({ tracks });
  } catch (e) {
    console.error('Track GET error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/artists/tracks — 楽曲削除
export async function DELETE(request) {
  try {
    const payload = await verifyToken(request);
    if (!payload || payload.role !== 'artist') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let trackId = searchParams.get('id');

    // URLパラメータになければbodyから取得
    if (!trackId) {
      try {
        const body = await request.json();
        trackId = body.track_id || body.id;
      } catch {
        // bodyがない場合
      }
    }

    if (!trackId) {
      return NextResponse.json({ error: 'Track ID is required' }, { status: 400 });
    }

    await deleteArtistTrack(trackId, payload.artistId);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Track DELETE error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/artists/tracks — 楽曲更新
export async function PATCH(request) {
  try {
    const payload = await verifyToken(request);
    if (!payload || payload.role !== 'artist') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, track_id, ...fields } = body;
    const trackId = id || track_id;

    if (!trackId) {
      return NextResponse.json({ error: 'Track ID is required' }, { status: 400 });
    }

    const ALLOWED = [
      'title', 'youtube_url', 'spotify_url', 'soundcloud_url', 'bandcamp_url',
      'release_date', 'genre', 'cover_image_url', 'is_public', 'ai_status',
    ];
    const VALID_AI_STATUS = ['human', 'ai_assisted', 'ai_generated'];
    const updateData = {};
    for (const key of ALLOWED) {
      if (fields[key] !== undefined) updateData[key] = fields[key];
    }
    if (updateData.ai_status && !VALID_AI_STATUS.includes(updateData.ai_status)) {
      return NextResponse.json({ error: 'Invalid ai_status' }, { status: 400 });
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const track = await updateArtistTrack(trackId, updateData, payload.artistId);
    return NextResponse.json({ success: true, track });
  } catch (e) {
    console.error('Track PATCH error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
