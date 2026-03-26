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
      return NextResponse.json({ total_earned: 0, total_credits: 0, available_balance: 0, total_paid: 0, pending_count: 0, review_count: 0, earnings: [], last_payout: null });
    }

    // Fetch earnings (without join — more reliable)
    const { data: earningsRaw, error } = await db
      .from('curator_earnings')
      .select('*')
      .in('curator_id', uniqueIds)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Earnings fetch error:', error);
    }

    const allEarnings = earningsRaw || [];

    // Debug: log raw earnings pitch_ids
    console.log('[earnings] raw count:', allEarnings.length, 'sample:', allEarnings[0] ? { id: allEarnings[0].id, pitch_id: allEarnings[0].pitch_id, pitch_id_type: typeof allEarnings[0].pitch_id } : 'none');

    // Enrich with pitch data (artist_name, subject/song_title)
    const pitchIds = [...new Set(allEarnings.map(e => e.pitch_id).filter(Boolean))];
    let pitchMap = {};
    if (pitchIds.length > 0) {
      const { data: pitches, error: pitchError } = await db
        .from('pitches')
        .select('id, artist_name, subject')
        .in('id', pitchIds);
      if (pitchError) {
        console.error('[earnings] Pitches enrichment query error:', JSON.stringify(pitchError));
      }
      console.log('[earnings] pitchIds queried:', pitchIds.length, 'pitches returned:', (pitches || []).length);
      if (pitches && pitches.length > 0) {
        console.log('[earnings] sample pitch:', { id: pitches[0].id, artist_name: pitches[0].artist_name, subject: pitches[0].subject });
      }
      for (const p of (pitches || [])) {
        pitchMap[p.id] = p;
      }
    } else {
      console.log('[earnings] no pitch_ids found in earnings records');
    }

    const enrichedEarnings = allEarnings.map(e => {
      const pitch = pitchMap[e.pitch_id];
      return {
        ...e,
        artist_name: pitch?.artist_name || null,
        song_title: pitch?.subject || null,
      };
    });

    // Debug: log first enriched earning
    if (enrichedEarnings.length > 0) {
      console.log('[earnings] first enriched:', { id: enrichedEarnings[0].id, artist_name: enrichedEarnings[0].artist_name, song_title: enrichedEarnings[0].song_title, pitch_id: enrichedEarnings[0].pitch_id });
    }

    const total_earned = allEarnings.reduce((sum, e) => sum + (e.amount || 0), 0);
    const total_credits = allEarnings.reduce((sum, e) => sum + (e.credits_earned || 0), 0);
    const available_balance = allEarnings.filter(e => e.status === 'approved').reduce((sum, e) => sum + (e.amount || 0), 0);
    const total_paid = allEarnings.filter(e => e.status === 'paid').reduce((sum, e) => sum + (e.amount || 0), 0);
    const pending_count = allEarnings.filter(e => e.status === 'pending').length;
    const review_count = allEarnings.length;

    // Last payout
    const { data: lastPayout } = await db
      .from('payouts')
      .select('*')
      .in('curator_id', uniqueIds)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      total_earned,
      total_credits,
      available_balance,
      total_paid,
      pending_count,
      review_count,
      earnings: enrichedEarnings,
      last_payout: lastPayout ? { date: lastPayout.completed_at, amount: lastPayout.amount } : null,
    });
  } catch (e) {
    console.error('Earnings API error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
