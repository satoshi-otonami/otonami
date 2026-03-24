import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  const { data: pitches, error: pErr } = await supabase
    .from('pitches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: curators, error: cErr } = await supabase
    .from('curators')
    .select('id, name, email, type, platform')
    .limit(30);

  return NextResponse.json({
    pitches: pitches?.map(p => ({
      id: p.id,
      curator_id: p.curator_id,
      curator_name: p.curator_name,
      artist_name: p.artist_name,
      track_title: p.track_title,
      status: p.status,
      all_columns: Object.keys(p),
      created_at: p.created_at
    })),
    curators: curators?.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email
    })),
    errors: { pErr, cErr }
  });
}
