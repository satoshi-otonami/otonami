import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { escapeHtml } from '@/lib/html-escape';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY || 'placeholder');
const FROM = `OTONAMI <${process.env.EMAIL_FROM || 'info@otonami.io'}>`;
const EMAIL_TEST_MODE = process.env.EMAIL_TEST_MODE === 'true';
const EMAIL_TEST_REDIRECT = process.env.EMAIL_TEST_REDIRECT || 'satoshiy339@gmail.com';

// Bilingual (JA/EN), emoji-free refund notification. Sent only when credits
// were actually returned (credits_charged > 0). Layout mirrors the existing
// artist welcome email (light theme) for visual consistency.
function refundEmailHtml({ artistName, curatorName, credits, newBalance }) {
  const nameJa = escapeHtml(artistName) || 'アーティスト';
  const nameEn = escapeHtml(artistName) || 'there';
  const curatorJa = escapeHtml(curatorName) || 'キュレーター';
  const curatorEn = escapeHtml(curatorName) || 'the curator';
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://otonami.io').trim();
  const balanceJa = newBalance != null
    ? `<p style="color:#6b6560;font-size:15px;line-height:1.7;margin:0 0 4px;">現在の残高は <strong>${newBalance}</strong> クレジットです。</p>`
    : '';
  const balanceEn = newBalance != null
    ? `<p style="color:#9b9590;font-size:14px;line-height:1.7;margin:0 0 4px;">Your current balance is <strong>${newBalance}</strong> credits.</p>`
    : '';
  return `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
      <h1 style="font-size:28px;text-align:center;color:#1a1a1a;margin-bottom:8px;">OTONAMI</h1>
      <h2 style="font-size:20px;color:#1a1a1a;margin-top:32px;">${nameJa} 様</h2>
      <p style="color:#6b6560;font-size:15px;line-height:1.7;margin:0 0 16px;">OTONAMI事務局です。<br/>${curatorJa} さんへのピッチについて、7日間の回答期限内にご返答がありませんでした。</p>
      <p style="color:#6b6560;font-size:15px;line-height:1.7;margin:0 0 8px;">OTONAMIの7日間回答保証に基づき、<strong>${credits}</strong> クレジットを返還いたしました。ご確認・再ピッチはダッシュボードから行っていただけます。</p>
      ${balanceJa}
      <div style="text-align:center;margin:28px 0;">
        <a href="${appUrl}/artist/dashboard" style="background:#c4956a;color:#fff;padding:14px 40px;border-radius:9999px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">ダッシュボードへ →</a>
      </div>
      <p style="color:#6b6560;font-size:14px;line-height:1.7;margin:0;">今後ともよろしくお願いいたします。<br/>OTONAMI事務局</p>
      <hr style="border:none;border-top:1px solid #e5e2dc;margin:32px 0;" />
      <h2 style="font-size:17px;color:#9b9590;">Hi ${nameEn},</h2>
      <p style="color:#9b9590;font-size:14px;line-height:1.7;margin:0 0 14px;">This is the OTONAMI team. Your pitch to ${curatorEn} did not receive a response within the 7-day window.</p>
      <p style="color:#9b9590;font-size:14px;line-height:1.7;margin:0 0 8px;">Under OTONAMI's 7-day response guarantee, we have returned <strong>${credits}</strong> credit(s) to your account. You can review or re-pitch from your dashboard.</p>
      ${balanceEn}
      <p style="text-align:center;color:#9b9590;font-size:12px;margin-top:28px;">Questions? Reply to this email. ご質問はこのメールに返信してください。</p>
    </div>
  `;
}

function refundEmailText({ artistName, curatorName, credits, newBalance }) {
  const nameJa = artistName || 'アーティスト';
  const nameEn = artistName || 'there';
  const curatorJa = curatorName || 'キュレーター';
  const curatorEn = curatorName || 'the curator';
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://otonami.io').trim();
  const balJa = newBalance != null ? `現在の残高は ${newBalance} クレジットです。\n` : '';
  const balEn = newBalance != null ? `Your current balance is ${newBalance} credits.\n` : '';
  return `${nameJa} 様\n\nOTONAMI事務局です。${curatorJa} さんへのピッチについて、7日間の回答期限内にご返答がありませんでした。\nOTONAMIの7日間回答保証に基づき、${credits} クレジットを返還いたしました。\n${balJa}ダッシュボード: ${appUrl}/artist/dashboard\n\n---\n\nHi ${nameEn},\n\nYour pitch to ${curatorEn} did not receive a response within the 7-day window. Under OTONAMI's 7-day response guarantee, we have returned ${credits} credit(s) to your account.\n${balEn}Dashboard: ${appUrl}/artist/dashboard`;
}

async function sendRefundEmail({ to, artistName, curatorName, credits, newBalance }) {
  const baseSubject = '回答期限切れにつきクレジットを返還しました / Your OTONAMI pitch expired — credits returned';
  const subject = (EMAIL_TEST_MODE ? `[TEST] (→${to}) ` : '') + baseSubject;
  const recipient = EMAIL_TEST_MODE ? EMAIL_TEST_REDIRECT : to;
  await resend.emails.send({
    from: FROM,
    to: recipient,
    reply_to: 'info@otonami.io',
    subject,
    html: refundEmailHtml({ artistName, curatorName, credits, newBalance }),
    text: refundEmailText({ artistName, curatorName, credits, newBalance }),
  });
}

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
      .select('id, artist_id, artist_email, artist_name, credits_charged, curator_id, subject, curator_name')
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
     try {
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
          const { error: txErr } = await supabase.from('credit_transactions').insert({
            artist_id: artistId,
            amount: pitch.credits_charged,
            type: 'expiry_refund',
            description: 'Expired pitch refund',
            metadata: { pitch_id: pitch.id, curator_id: pitch.curator_id },
          });
          if (txErr) {
            console.warn('[cron] credit_transactions log failed (non-fatal):', txErr.message);
          }
        }
      }

      // 3. Mark pitch as expired (regardless of refund success — avoid retry storms).
      const { error: updateError } = await supabase
        .from('pitches')
        .update({
          status: 'expired',
          refunded_at: new Date().toISOString(),
          refund_credits: refundOk ? pitch.credits_charged : 0,
        })
        .eq('id', pitch.id);

      if (!updateError) {
        const refundCredits = refundOk ? pitch.credits_charged : 0;
        results.push({
          pitch_id: pitch.id,
          artist_id: artistId,
          artist_email: pitch.artist_email,
          credits_returned: refundCredits,
          refund_ok: refundOk,
          curator: pitch.curator_name,
        });

        // Notify the artist — only when credits were actually returned.
        // Placed AFTER refunded_at is set, so this pitch is never re-selected
        // by the WHERE clause again: a failed send cannot cause a double email,
        // and a thrown error here must not roll back the (already-committed)
        // refund. Hence email failures are logged, never rethrown.
        if (refundOk && refundCredits > 0 && pitch.artist_email) {
          try {
            let newBalance = null;
            if (artistId) {
              const { data: a } = await supabase
                .from('artists')
                .select('credits')
                .eq('id', artistId)
                .maybeSingle();
              newBalance = a?.credits ?? null;
            }
            await sendRefundEmail({
              to: pitch.artist_email,
              artistName: pitch.artist_name || null,
              curatorName: pitch.curator_name || null,
              credits: refundCredits,
              newBalance,
            });
          } catch (e) {
            console.error('[cron] refund email failed', {
              pitchId: pitch.id,
              artist_email: pitch.artist_email,
              error: e?.message || e,
            });
          }
        }
      } else {
        console.error(`[cron] Mark-expired failed for pitch ${pitch.id}:`, updateError.message);
      }
     } catch (pitchErr) {
       console.error(`[cron] Unexpected error processing pitch ${pitch.id}:`, pitchErr?.message || pitchErr);
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
