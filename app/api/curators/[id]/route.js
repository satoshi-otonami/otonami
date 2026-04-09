import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/curators/[id] — public curator info (no sensitive fields)
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Curator ID required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('curators')
      .select('id, name, type, platform, url, genres, bio, followers, region, icon, icon_url, accepts, preferred_moods, opportunities, playlist_url, open_to_all_genres')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Curator not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: data.id,
      name: data.name,
      type: data.type,
      platform: data.platform,
      url: data.url,
      genres: data.genres || [],
      bio: data.bio,
      followers: data.followers,
      region: data.region,
      icon: data.icon,
      icon_url: data.icon_url,
      accepts: data.accepts || [],
      preferred_moods: data.preferred_moods || [],
      opportunities: data.opportunities || [],
      playlist_url: data.playlist_url,
      open_to_all_genres: data.open_to_all_genres || false,
    });
  } catch (e) {
    console.error('Curator GET error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
