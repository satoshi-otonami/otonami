import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';

// Always dynamic — uses request headers (JWT) and query params.
export const dynamic = 'force-dynamic';

// GET /api/artists/transactions
// Returns the authenticated artist's credit_transactions, formatted for the
// studio purchase-history panel. Filters to type='purchase' by default;
// pass ?all=1 to return every transaction type (spend / refund / bonus).
export async function GET(request) {
  try {
    const payload = await verifyToken(request);
    if (!payload || payload.role !== 'artist') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const includeAll = url.searchParams.get('all') === '1';

    const db = getServiceSupabase();
    let query = db
      .from('credit_transactions')
      .select('id, type, amount, description, stripe_payment_id, metadata, created_at')
      .eq('artist_id', payload.artistId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (!includeAll) query = query.eq('type', 'purchase');

    const { data, error } = await query;
    if (error) {
      console.error('[transactions] query error:', error);
      return NextResponse.json({ error: 'Query failed', detail: error.message }, { status: 500 });
    }

    const history = (data || []).map(tx => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      label: tx.metadata?.package || tx.description || tx.type,
      credits: tx.amount,
      price: tx.metadata?.amount_total ?? null,
      currency: tx.metadata?.currency || 'jpy',
      method: 'Stripe Card',
      cardLast4: null,
      date: tx.created_at,
      stripe_payment_id: tx.stripe_payment_id,
    }));

    return NextResponse.json({ history });
  } catch (e) {
    console.error('[transactions] unexpected error:', e);
    return NextResponse.json({ error: 'Internal error', detail: e.message }, { status: 500 });
  }
}
