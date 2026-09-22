// Closing an expired pitch, used by app/api/cron/check-expired-pitches.
// Two steps, both conditional so they are safe to repeat and safe when the
// Vercel Cron and GitHub Actions triggers overlap:
//   claimPitch      — status 'sent' → 'expired' while still unanswered
//   finalizeRefund  — stamp refunded_at, then return the credits
// See lib/pitch-closure.js for how the curator side reads the result.

export const PITCH_FIELDS = 'id, artist_id, artist_email, artist_name, credits_charged, curator_id, subject, curator_name';

// Close the pitch to curators before any credit moves. Conditional on the row
// still being unanswered, so a curator response that landed after the cron's
// SELECT wins and nothing is refunded. Returns true when this call claimed it.
export async function claimPitch(supabase, pitchId) {
  const { data, error } = await supabase
    .from('pitches')
    .update({ status: 'expired' })
    .eq('id', pitchId)
    .eq('status', 'sent')
    .is('refunded_at', null)
    .is('responded_at', null)
    .is('placement_url', null)
    .is('feedback_message', null)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

// Second half of closing a pitch: stamp refunded_at, then return the credits.
// Runs only on a pitch this run (or an earlier one) has claimed, i.e. already
// status='expired' and closed to curators. The stamp is taken first and only
// while refunded_at is still NULL, so of two overlapping runs (Vercel Cron +
// GitHub Actions) exactly one refunds. A curator response saved after the
// claim does not stop the refund — closing is irreversible.
export async function finalizeRefund(supabase, pitch, { onRefunded } = {}) {
  // Refunds must land on the artist that was actually charged, so the only
  // trustworthy key is pitches.artist_id. The old artist_email fallback is
  // gone: with label accounts several artists share one contact address, so
  // an email lookup either credits the wrong artist or (on .maybeSingle()
  // seeing two rows) returns null and silently drops the refund.
  const artistId = pitch.artist_id || null;
  const planned = artistId && pitch.credits_charged > 0 ? pitch.credits_charged : 0;
  if (!artistId && pitch.credits_charged > 0) {
    console.error(
      `[cron] Pitch ${pitch.id} has no artist_id — cannot refund ${pitch.credits_charged} credit(s) safely. Needs manual review.`
    );
  }

  const { data: stamped, error: stampError } = await supabase
    .from('pitches')
    .update({ refunded_at: new Date().toISOString(), refund_credits: planned })
    .eq('id', pitch.id)
    .is('refunded_at', null)
    .select('id')
    .maybeSingle();
  if (stampError) {
    console.error(`[cron] Mark-refunded failed for pitch ${pitch.id}:`, stampError.message);
    return null;
  }
  if (!stamped) return null; // another run got here first

  let refundOk = false;
  if (planned > 0) {
    const { error: rpcErr } = await supabase.rpc('increment_artist_credits', {
      p_artist_id: artistId,
      p_amount: planned,
    });
    if (rpcErr) {
      // Keep the stamp (avoid retry storms, as before) but record that
      // nothing went back.
      console.error(`[cron] Refund RPC failed for pitch ${pitch.id}:`, rpcErr);
      const { error: zeroErr } = await supabase
        .from('pitches')
        .update({ refund_credits: 0 })
        .eq('id', pitch.id);
      if (zeroErr) console.error(`[cron] refund_credits reset failed for pitch ${pitch.id}:`, zeroErr.message);
    } else {
      refundOk = true;
      const { error: txErr } = await supabase.from('credit_transactions').insert({
        artist_id: artistId,
        amount: planned,
        type: 'expiry_refund',
        description: 'Expired pitch refund',
        metadata: { pitch_id: pitch.id, curator_id: pitch.curator_id },
      });
      if (txErr) {
        console.warn('[cron] credit_transactions log failed (non-fatal):', txErr.message);
      }
    }
  }
  const refundCredits = refundOk ? planned : 0;

  // Notify the artist — only when credits were actually returned. The stamp
  // is already set, so a failed send cannot cause a double email, and a
  // thrown error here must not roll back the (already-committed) refund.
  if (refundOk && refundCredits > 0 && onRefunded) {
    try {
      await onRefunded({ pitch, artistId, refundCredits });
    } catch (e) {
      console.error('[cron] refund notification failed', { pitchId: pitch.id, error: e?.message || e });
    }
  }

  return {
    pitch_id: pitch.id,
    artist_id: artistId,
    artist_email: pitch.artist_email,
    credits_returned: refundCredits,
    refund_ok: refundOk,
    curator: pitch.curator_name,
  };
}
