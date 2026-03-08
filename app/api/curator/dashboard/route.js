export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-otonami-secret-change-me'
);

async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

async function getAuthCurator(request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const payload = await verifyToken(auth.slice(7));
  if (!payload) return null;
  return payload;
}

// GET /api/curator/dashboard — キュレーター宛のピッチ一覧
export async function GET(request) {
  try {
    const curator = await getAuthCurator(request);
    if (!curator) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getServiceSupabase();

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('status'); // 'all' | 'sent' | 'accepted' | 'rejected'

    let query = db
      .from('pitches')
      .select('id, artist_name, artist_genre, subject, body, status, sent_at, created_at')
      .eq('curator_id', curator.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (filter && filter !== 'all') {
      query = query.eq('status', filter);
    } else {
      // デフォルト: sent / accepted / rejected のみ（draft除外）
      query = query.neq('status', 'draft');
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return NextResponse.json({ pitches: data || [] });
  } catch (error) {
    console.error('Dashboard GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/curator/dashboard — ピッチを承認 or 却下
export async function PATCH(request) {
  try {
    const curator = await getAuthCurator(request);
    if (!curator) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pitchId, status, feedback, rating } = await request.json();

    if (!pitchId || !['accepted', 'rejected', 'feedback', 'sent'].includes(status)) {
      return NextResponse.json(
        { error: 'pitchId and valid status required' },
        { status: 400 }
      );
    }

    const db = getServiceSupabase();

    const updateData = { status };
    if (feedback != null) updateData.feedback = feedback;
    if (rating != null) updateData.rating = rating;
    if (feedback != null || rating != null) updateData.feedback_at = new Date().toISOString();

    // curator_id が一致するピッチのみ更新（他のキュレーターのピッチを変更不可）
    const { data, error } = await db
      .from('pitches')
      .update(updateData)
      .eq('id', pitchId)
      .eq('curator_id', curator.id)
      .select('id, status')
      .single();

    if (error) throw new Error(error.message);
    if (!data) {
      return NextResponse.json({ error: 'Pitch not found or not authorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true, pitch: data });
  } catch (error) {
    console.error('Dashboard PATCH error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
