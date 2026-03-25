import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

// GET /api/curators/public?name=CuratorName
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    if (!name) {
      return NextResponse.json({ error: 'name parameter required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('curators')
      .select('*')
      .eq('name', name)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Curator public query error:', error);
      return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Curator not found' }, { status: 404 });
    }

    // Return only public-safe fields
    const safe = {
      id: data.id,
      name: data.name,
      platform: data.platform || data.platform_name || null,
      genres: data.genres || [],
      description: data.description || data.bio || null,
      followers: data.followers || data.follower_count || null,
      playlist_url: data.playlist_url || data.url || null,
      spotify_url: data.spotify_url || null,
      youtube_url: data.youtube_url || null,
      instagram_url: data.instagram_url || null,
      twitter_url: data.twitter_url || null,
      website_url: data.website_url || null,
      avatar_url: data.avatar_url || null,
      tier: data.tier || null,
      acceptance_rate: data.acceptance_rate || null,
      avg_response_days: data.avg_response_days || null,
      region: data.region || null,
      language: data.language || null,
    };

    return NextResponse.json({ curator: safe });
  } catch (e) {
    console.error('Curator public GET error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
