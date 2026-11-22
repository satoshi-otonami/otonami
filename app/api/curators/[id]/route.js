import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { isTestCurator } from '@/lib/curator-visibility';

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
      .select('id, name, type, playlist, url, genres, bio, followers, region, icon, icon_url, accepts, preferred_moods, opportunities, playlist_url, open_to_all_genres, is_seed, is_paused, email_verified')
      .eq('id', id)
      .maybeSingle();

    // Seed/test and unverified curators are not public: answer exactly as if
    // the id did not exist. A paused curator is still shown (the page tells
    // the visitor intake is paused instead of offering the submit button).
    if (error || !data || isTestCurator(data) || data.email_verified !== true) {
      return NextResponse.json({ error: 'Curator not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: data.id,
      name: data.name,
      type: data.type,
      platform: data.playlist,
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
      is_paused: data.is_paused === true,
    });
  } catch (e) {
    console.error('Curator GET error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
