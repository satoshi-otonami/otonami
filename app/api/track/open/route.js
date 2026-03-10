export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

const PIXEL_HEADERS = {
  'Content-Type': 'image/gif',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const pitchId = searchParams.get('pid');

  if (pitchId) {
    try {
      const db = getServiceSupabase();

      // Only record first open — never overwrite opened_at
      const { data: pitch } = await db
        .from('pitches')
        .select('status, opened_at')
        .eq('id', pitchId)
        .single();

      if (pitch && !pitch.opened_at) {
        await db
          .from('pitches')
          .update({
            status: pitch.status === 'sent' ? 'opened' : pitch.status,
            opened_at: new Date().toISOString(),
          })
          .eq('id', pitchId);

        console.log(`[track/open] First open recorded for pitch ${pitchId}`);
      }
    } catch (e) {
      // Never let tracking errors affect the response
      console.warn('[track/open] Error:', e.message);
    }
  }

  return new NextResponse(PIXEL, { headers: PIXEL_HEADERS });
}
