import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  const { data: pitches } = await supabase
    .from('pitches')
    .select('id, curator_id, curator_name, curator_email, artist_name, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: curators } = await supabase
    .from('curators')
    .select('id, name, email')
    .limit(30);

  const matchCheck = pitches?.map(p => {
    const matchById = curators?.find(c => c.id === p.curator_id);
    const matchByEmail = curators?.find(c => c.email === p.curator_email);
    const matchByName = curators?.find(c => c.name === p.curator_name);
    return {
      pitch_id: p.id,
      pitch_curator_id: p.curator_id,
      pitch_curator_id_type: typeof p.curator_id,
      pitch_curator_id_length: p.curator_id?.length,
      pitch_curator_name: p.curator_name,
      pitch_curator_email: p.curator_email,
      curator_found_by_id: matchById ? { id: matchById.id, name: matchById.name } : null,
      curator_found_by_email: matchByEmail ? { id: matchByEmail.id, name: matchByEmail.name } : null,
      curator_found_by_name: matchByName ? { id: matchByName.id, name: matchByName.name } : null,
    };
  });

  return NextResponse.json({
    pitches_count: pitches?.length,
    curators_count: curators?.length,
    curators: curators?.map(c => ({ id: c.id, id_length: c.id?.length, name: c.name, email: c.email })),
    matchCheck,
  });
}
