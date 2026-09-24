import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { isPublicCurator, PUBLIC_CURATOR_COLUMNS } from '@/lib/curator-visibility';

export const dynamic = 'force-dynamic';

// GET /api/curators/count — the public curator headcount.
//
// Must always agree with /api/curators/list and the landing page: all three
// apply isPublicCurator() (not seed, not test, not paused, email verified).
// Any surface that prints "N curators" reads this (or the ISR marquee count on
// the landing page) — never a literal.
export async function GET() {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('curators')
      .select(PUBLIC_CURATOR_COLUMNS)
      .or('is_seed.is.null,is_seed.eq.false');

    if (error) throw new Error(error.message);

    const count = (data || []).filter(isPublicCurator).length;
    return NextResponse.json({ count });
  } catch (e) {
    console.error('[curators/count] query failed:', e);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
}
