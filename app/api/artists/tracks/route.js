import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import {
  getArtistTracks,
  createArtistTrack,
  updateArtistTrack,
  deleteArtistTrack,
} from '@/lib/db';

// POST /api/artists/tracks — 楽曲追加
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
