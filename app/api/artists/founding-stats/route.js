import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/artists/founding-stats — operator-only count of Founding Artists.
// Auth: Authorization: Bearer <ADMIN_SECRET>
export async function GET(request) {
  if (!process.env.ADMIN_SECRET) {
    return NextResponse.json(
      { error: 'ADMIN_SECRET not configured' },
      { status: 500 }
    );
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  const { count, data, error } = await supabase
    .from('artists')
    .select('founding_number, name, email, created_at, founding_show_on_lp', { count: 'exact' })
    .eq('is_founding', true)
    .order('founding_number');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const FOUNDING_LIMIT = 20;
  return NextResponse.json({
    foundingCount: count ?? 0,
    remaining: Math.max(0, FOUNDING_LIMIT - (count ?? 0)),
    deadline: '2026-06-30T23:59:59+09:00',
    artists: data || [],
  });
}
