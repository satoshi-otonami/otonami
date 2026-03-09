export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-otonami-secret-change-me'
);

async function getAuthCurator(request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const { payload } = await jwtVerify(auth.slice(7), JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

// GET /api/curator/pitch/[id] — 単一ピッチ取得（自分宛のもののみ）
export async function GET(request, { params }) {
  const curator = await getAuthCurator(request);
  if (!curator) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getServiceSupabase();
  const { data, error } = await db
    .from('pitches')
    .select('id, artist_name, artist_name_en, artist_genre, subject, body, status, sent_at, created_at, feedback, rating, feedback_at, song_title, song_link')
    .eq('id', params.id)
    .eq('curator_id', curator.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Pitch not found or not authorized' }, { status: 404 });
  }

  return NextResponse.json({ pitch: data });
}

// PATCH /api/curator/pitch/[id] — フィードバック送信
export async function PATCH(request, { params }) {
  const curator = await getAuthCurator(request);
  if (!curator) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { status, feedback, rating } = await request.json();
  if (!['accepted', 'rejected', 'feedback', 'sent'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const db = getServiceSupabase();
  const updates = { status };
  if (feedback) { updates.feedback = feedback; updates.feedback_at = new Date().toISOString(); }
  if (rating)   updates.rating = rating;

  const { data, error } = await db
    .from('pitches')
    .update(updates)
    .eq('id', params.id)
    .eq('curator_id', curator.id)
    .select('id, status')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Pitch not found or not authorized' }, { status: 404 });
  }

  return NextResponse.json({ success: true, pitch: data });
}
