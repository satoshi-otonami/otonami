import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/curators/public?name=CuratorName  or  ?id=uuid
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    const id = searchParams.get('id');
    if (!name && !id) {
      return NextResponse.json({ error: 'name or id parameter required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    let query = supabase.from('curators').select('*');
    if (id) {
      query = query.eq('id', id);
    } else {
      query = query.eq('name', name);
    }
    const { data, error } = await query.limit(1).maybeSingle();

    if (error) {
      console.error('Curator public query error:', error);
      return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Curator not found' }, { status: 404 });
    }

    // Map DB columns to JS field names (matching mapCuratorFromDB in lib/db.js)
    const curator = {
      id: data.id,
      name: data.name,
      type: data.type || null,
      platform: data.platform || null,
      url: data.url || null,
      genres: data.genres || [],
      bio: data.bio || null,
      followers: data.followers || null,
      region: data.region || null,
      icon: data.icon || null,
      iconUrl: data.icon_url || null,
      accepts: data.accepts || [],
      tags: data.tags || [],
      tier: data.tier || null,
      preferredMoods: data.preferred_moods || [],
      preferredTempo: data.preferred_tempo || null,
      preferredArtists: data.preferred_artists || [],
      rejectedGenres: data.rejected_genres || [],
      playlistUrl: data.playlist_url || null,
      responseTime: data.response_time || null,
      opportunities: data.opportunities || [],
      preferredAttributes: data.preferred_attributes || [],
      pitchesReceived: data.pitches_received || null,
      pitchesResponded: data.pitches_responded || null,
      pitchesAccepted: data.pitches_accepted || null,
      creditCost: data.credit_cost || 2,
      openToAllGenres: data.open_to_all_genres || false,
    };

    return NextResponse.json({ curator });
  } catch (e) {
    console.error('Curator public GET error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
