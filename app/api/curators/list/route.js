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
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    const curators = (data || []).map(c => ({
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
      }));

    return NextResponse.json({ curators });
  } catch (e) {
    console.error('Curators list error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
