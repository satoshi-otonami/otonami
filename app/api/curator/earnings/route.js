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
  } catch { return null; }
}

export async function GET(request) {
  try {
    const curator = await getAuthCurator(request);
    if (!curator) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getServiceSupabase();
    const cEmail = String(curator.email || '').trim();

    // Get all curator IDs for this email
    const { data: curatorRows } = await db.from('curators').select('id').eq('email', cEmail);
    const curatorIds = curatorRows?.map(r => r.id) || [];
    if (curator.id) curatorIds.push(curator.id);
    const uniqueIds = [...new Set(curatorIds)];

    if (uniqueIds.length === 0) {
      return NextResponse.json({ total_earned: 0, available_balance: 0, total_paid: 0, pending_count: 0, earnings: [], last_payout: null });
    }

    // Fetch earnings
    const { data: earnings, error } = await db
      .from('curator_earnings')
      .select('*, pitches(artist_name, song_title)')
      .in('curator_id', uniqueIds)
      .order('earned_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Earnings fetch error:', error);
      // Fallback without join
      const { data: earningsBasic } = await db
        .from('curator_earnings')
        .select('*')
        .in('curator_id', uniqueIds)
        .order('earned_at', { ascending: false })
        .limit(100);

      const allEarnings = earningsBasic || [];
      const total_earned = allEarnings.reduce((sum, e) => sum + (e.amount || 0), 0);
      const available_balance = allEarnings.filter(e => e.status === 'approved').reduce((sum, e) => sum + (e.amount || 0), 0);
      const total_paid = allEarnings.filter(e => e.status === 'paid').reduce((sum, e) => sum + (e.amount || 0), 0);
      const pending_count = allEarnings.filter(e => e.status === 'pending').length;

      return NextResponse.json({ total_earned, available_balance, total_paid, pending_count, earnings: allEarnings, last_payout: null });
    }

    const allEarnings = earnings || [];
    const total_earned = allEarnings.reduce((sum, e) => sum + (e.amount || 0), 0);
    const available_balance = allEarnings.filter(e => e.status === 'approved').reduce((sum, e) => sum + (e.amount || 0), 0);
    const total_paid = allEarnings.filter(e => e.status === 'paid').reduce((sum, e) => sum + (e.amount || 0), 0);
    const pending_count = allEarnings.filter(e => e.status === 'pending').length;

    // Last payout
    const { data: lastPayout } = await db
      .from('payouts')
      .select('*')
      .in('curator_id', uniqueIds)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      total_earned,
      available_balance,
      total_paid,
      pending_count,
      earnings: allEarnings.map(e => ({
        ...e,
        artist_name: e.pitches?.artist_name || null,
        song_title: e.pitches?.song_title || null,
        pitches: undefined,
      })),
      last_payout: lastPayout ? { date: lastPayout.completed_at, amount: lastPayout.amount } : null,
    });
  } catch (e) {
    console.error('Earnings API error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
