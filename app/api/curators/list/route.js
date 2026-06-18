import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/curators/list — all registered curators (public fields only)
export async function GET() {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('curators')
      .select('id, name, type, playlist, url, genres, bio, followers, region, icon_url, accepts, preferred_moods, opportunities, similar_artists, tags, tier, open_to_all_genres')
      .or('is_seed.is.null,is_seed.eq.false')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    // Live response-rate aggregation from the pitches table.
    // The curators.pitches_received/responded/accepted columns are NOT maintained
    // (never incremented anywhere), so compute per-curator stats on the fly.
    //   received  = every pitch sent to the curator
    //   responded = curator actually responded (accepted | feedback | declined)
    const RESPONDED = new Set(['accepted', 'feedback', 'declined']);
    const stats = {};
    const { data: pitchRows, error: pitchErr } = await supabase
      .from('pitches')
      .select('curator_id, status');
    if (pitchErr) {
      console.warn('Curators list: pitch stats aggregation failed (non-fatal):', pitchErr.message);
    } else {
      for (const p of pitchRows || []) {
        if (!p.curator_id) continue;
        const s = (stats[p.curator_id] ||= { received: 0, responded: 0 });
        s.received += 1;
        if (RESPONDED.has(p.status)) s.responded += 1;
      }
    }

    const curators = (data || []).map(c => {
      const s = stats[c.id] || { received: 0, responded: 0 };
      return {
        id: c.id,
        name: c.name,
        type: c.type,
        platform: c.playlist,
        url: c.url,
        genres: c.genres || [],
        bio: c.bio,
        followers: c.followers || 0,
        region: c.region,
        iconUrl: c.icon_url,
        accepts: c.accepts || [],
        preferredMoods: c.preferred_moods || [],
        opportunities: c.opportunities || [],
        similarArtists: c.similar_artists || [],
        tags: c.tags || [],
        tier: c.tier,
        creditCost: c.tier || 2,
        openToAllGenres: c.open_to_all_genres || false,
        pitchesReceived: s.received,
        pitchesResponded: s.responded,
        // null (not 0) when no pitches received yet → UI shows "—" instead of 0%
        responseRate: s.received > 0 ? Math.round((s.responded / s.received) * 100) : null,
      };
    });

    return NextResponse.json({ curators }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (e) {
    console.error('Curators list error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
