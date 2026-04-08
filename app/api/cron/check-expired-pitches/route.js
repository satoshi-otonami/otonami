import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  // Vercel Cron authentication
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch expired pitches (sent, past deadline, not yet refunded)
    const { data: expiredPitches, error: fetchError } = await supabase
      .from('pitches')
      .select('id, artist_email, credits_charged, curator_id, subject, curator_name')
      .eq('status', 'sent')
      .is('refunded_at', null)
      .not('deadline_at', 'is', null)
      .lt('deadline_at', new Date().toISOString());

    if (fetchError) throw fetchError;

    if (!expiredPitches || expiredPitches.length === 0) {
      return Response.json({ message: 'No expired pitches', processed: 0 });
    }

    const results = [];

    for (const pitch of expiredPitches) {
      // 1. Return credits to artist
      if (pitch.artist_email && pitch.credits_charged > 0) {
        const { error: creditError } = await supabase.rpc('increment_artist_credits', {
          p_email: pitch.artist_email,
          p_amount: pitch.credits_charged,
        });

        // Fallback if RPC doesn't exist: direct UPDATE
        if (creditError) {
          const { data: artist } = await supabase
            .from('artists')
            .select('credits')
            .eq('email', pitch.artist_email)
            .maybeSingle();

          if (artist) {
            await supabase
              .from('artists')
              .update({
                credits: artist.credits + pitch.credits_charged,
                updated_at: new Date().toISOString(),
              })
              .eq('email', pitch.artist_email);
          }
        }
      }

      // 2. Mark pitch as expired
      const { error: updateError } = await supabase
        .from('pitches')
        .update({
          status: 'expired',
          refunded_at: new Date().toISOString(),
          refund_credits: pitch.credits_charged,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pitch.id);

      if (!updateError) {
        results.push({
          pitch_id: pitch.id,
          artist_email: pitch.artist_email,
          credits_returned: pitch.credits_charged,
          curator: pitch.curator_name,
        });
      }
    }

    console.log(`[cron] Processed ${results.length} expired pitches`, results);

    return Response.json({
      message: `Processed ${results.length} expired pitches`,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error('[cron] Error processing expired pitches:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
