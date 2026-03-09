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
  const pitchId = params.id;

  console.log(`[pitch-detail] GET pitchId=${pitchId} curatorId=${curator.id} email=${curator.email}`);

  // curator_id OR curator_email でマッチ
  const cId = String(curator.id || '').trim();
  const cEmail = String(curator.email || '').trim();
  const orFilter = `curator_id.eq.${cId},curator_email.eq.${cEmail}`;
  console.log(`[pitch-detail] orFilter="${orFilter}"`);

  const { data, error } = await db
    .from('pitches')
    .select('*')
    .eq('id', pitchId)
    .or(orFilter)
    .single();

  console.log(`[pitch-detail] result: found=${!!data} error=${error?.message ?? 'none'}`);

  if (error || !data) {
    return NextResponse.json({ error: 'Pitch not found or not authorized' }, { status: 404 });
  }

  return NextResponse.json({ pitch: data });
}

// PATCH /api/curator/pitch/[id] — フィードバック送信
export async function PATCH(request, { params }) {
  const curator = await getAuthCurator(request);
  if (!curator) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { status, feedback_text, feedback_rating } = await request.json();
  if (!['accepted', 'rejected', 'feedback', 'sent'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const db = getServiceSupabase();
  const pitchId = params.id;
  const updates = { status };
  if (feedback_text) { updates.feedback_text = feedback_text; updates.feedback_at = new Date().toISOString(); }
  if (feedback_rating) updates.feedback_rating = feedback_rating;

  // まず curator_id で試みる
  let { data, error } = await db
    .from('pitches')
    .update(updates)
    .eq('id', pitchId)
    .eq('curator_id', curator.id)
    .select('id, status')
    .single();

  // curator_id でヒットしなかった場合は curator_email でフォールバック
  if (!data && curator.email) {
    const res2 = await db
      .from('pitches')
      .update(updates)
      .eq('id', pitchId)
      .eq('curator_email', curator.email)
      .select('id, status')
      .single();
    data  = res2.data;
    error = res2.error;
  }

  if (error || !data) {
    return NextResponse.json({ error: 'Pitch not found or not authorized' }, { status: 404 });
  }

  return NextResponse.json({ success: true, pitch: data });
}
