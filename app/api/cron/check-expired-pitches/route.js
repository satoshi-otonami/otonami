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
      .select('id, artist_id, artist_email, credits_charged, curator_id, subject, curator_name')
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
      if (!(pitch.credits_charged > 0)) {
        // Nothing to refund — still mark expired below.
      }

      // 1. Resolve artist_id (legacy pitches may only have artist_email).
      let artistId = pitch.artist_id || null;
      if (!artistId && pitch.artist_email) {
        const { data: artist } = await supabase
          .from('artists')
          .select('id')
          .eq('email', pitch.artist_email)
          .maybeSingle();
        artistId = artist?.id || null;
      }

      // 2. Return credits to artist (atomic via RPC).
      let refundOk = false;
      if (artistId && pitch.credits_charged > 0) {
        const { error: rpcErr } = await supabase.rpc('increment_artist_credits', {
          p_artist_id: artistId,
          p_amount: pitch.credits_charged,
        });
        if (rpcErr) {
          console.error(`[cron] Refund RPC failed for pitch ${pitch.id}:`, rpcErr);
        } else {
          refundOk = true;
          await supabase.from('credit_transactions').insert({
            artist_id: artistId,
            amount: pitch.credits_charged,
            type: 'expiry_refund',
            description: 'Expired pitch refund',
            metadata: { pitch_id: pitch.id, curator_id: pitch.curator_id },
          }).catch(txErr => {
            console.warn('[cron] credit_transactions log failed (non-fatal):', txErr.message);
          });
        }
      }

      // 3. Mark pitch as expired (regardless of refund success — avoid retry storms).
      const { error: updateError } = await supabase
        .from('pitches')
        .update({
          status: 'expired',
          refunded_at: new Date().toISOString(),
          refund_credits: refundOk ? pitch.credits_charged : 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pitch.id);

      if (!updateError) {
        results.push({
          pitch_id: pitch.id,
          artist_id: artistId,
          artist_email: pitch.artist_email,
          credits_returned: refundOk ? pitch.credits_charged : 0,
          refund_ok: refundOk,
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
