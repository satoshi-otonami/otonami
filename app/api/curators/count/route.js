import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { isSeedCurator } from '@/lib/curator-visibility';

export const dynamic = 'force-dynamic';

// GET /api/curators/count — the public curator headcount.
//
// Must always agree with /api/curators/list: same table, same is_seed guard,
// same isSeedCurator() predicate applied after the query. Any surface that
// prints "N curators" reads this (or the ISR marquee count on the landing
// page, which filters identically) — never a literal.
export async function GET() {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('curators')
      .select('id, is_seed')
      .or('is_seed.is.null,is_seed.eq.false');

    if (error) throw new Error(error.message);

    const count = (data || []).filter(c => !isSeedCurator(c)).length;
    return NextResponse.json({ count });
  } catch (e) {
    console.error('[curators/count] query failed:', e);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
}
