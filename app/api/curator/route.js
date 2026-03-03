import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const form = await request.json();

    if (!form.name || !form.email || !form.outletName) {
      return NextResponse.json(
        { error: 'Name, email, and outlet name are required.' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    const id = `${form.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}-${Date.now()}`;

    const { data, error } = await supabase
      .from('curators')
      .insert({
        id,
        name: form.name,
        email: form.email,
        type: form.type || 'blog',
        playlist: form.outletName,
        url: form.url || null,
        genres: form.genres || [],
        bio: form.bio || null,
        followers: parseInt(form.followers) || 0,
        region: form.region || 'Global',
        accepts: form.accepts || [],
        tags: ['pending_review'],
        tier: 3,
        is_seed: false,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, curator: data });
  } catch (e) {
    console.error('Curator registration error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
