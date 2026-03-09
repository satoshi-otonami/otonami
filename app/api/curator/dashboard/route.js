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
    const filter = searchParams.get('status');

    // curator_id OR curator_email でマッチ（シードキュレーターIDずれ対策）
    const cId = String(curator.id || '').trim();
    const cEmail = String(curator.email || '').trim();
    const orFilter = `curator_id.eq.${cId},curator_email.eq.${cEmail}`;
    console.log(`[dashboard] orFilter="${orFilter}"`);

    let query = db
      .from('pitches')
      .select('*')
      .or(orFilter)
      .order('created_at', { ascending: false })
      .limit(100);

    if (filter && filter !== 'all') {
      query = query.eq('status', filter);
    } else {
      query = query.neq('status', 'draft');
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    console.log(`[dashboard] curatorId=${curator.id} email=${curator.email} pitchCount=${data?.length ?? 0}`);

    return NextResponse.json({ pitches: data || [] });
  } catch (error) {
    console.error('[dashboard] GET error:', error);
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

    const { pitchId, status, feedback_text, feedback_rating } = await request.json();

    if (!pitchId || !['accepted', 'rejected', 'feedback', 'sent'].includes(status)) {
      return NextResponse.json(
        { error: 'pitchId and valid status required' },
        { status: 400 }
      );
    }

    const db = getServiceSupabase();

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

    if (error) throw new Error(error.message);
    if (!data) {
      return NextResponse.json({ error: 'Pitch not found or not authorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true, pitch: data });
  } catch (error) {
    console.error('[dashboard] PATCH error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
