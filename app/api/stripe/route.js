import Stripe from 'stripe';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_placeholder');
const resend = new Resend(process.env.RESEND_API_KEY || 'placeholder');
const FROM = `OTONAMI <${process.env.EMAIL_FROM || 'info@otonami.io'}>`;

// Credit packages — flat ¥160 base with volume discount (mirror frontend CREDIT_PACKAGES).
const PACKAGES = {
  trial:    { credits: 5,   price: 800,   label: 'Trial' },
  light:    { credits: 10,  price: 1500,  label: 'Light' },
  standard: { credits: 20,  price: 2800,  label: 'Standard' },
  pro:      { credits: 40,  price: 5200,  label: 'Pro' },
  business: { credits: 100, price: 12000, label: 'Business' },
};
const CREDIT_PRICE = 160; // JPY per credit (custom packages)

// Create Stripe Checkout Session (artist must be authenticated)
export async function POST(request) {
  try {
    const payload = await verifyToken(request);
    if (!payload || payload.role !== 'artist') {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'ログインが必要です' },
        { status: 401 }
      );
    }

    const artistId = payload.artistId;
    const artistEmail = payload.email;

    const { packageId, credits: customCredits } = await request.json();

    let credits, price, label, packageName;
    if (packageId === 'custom') {
      const n = parseInt(customCredits, 10);
      if (!Number.isInteger(n) || n < 1 || n > 500) {
        return NextResponse.json({ error: 'Custom credits must be between 1 and 500' }, { status: 400 });
      }
      credits = n;
      price = n * CREDIT_PRICE;
      label = `Custom (${n} credits)`;
      packageName = 'custom';
    } else {
      const pkg = PACKAGES[packageId];
      if (!pkg) return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
      credits = pkg.credits;
      price = pkg.price;
      label = pkg.label;
      packageName = packageId;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'jpy',
          product_data: {
            name: `OTONAMI ${label} — ${credits} Credits`,
            description: `${credits}クレジット（キュレーターへのピッチ送信用）`,
          },
          unit_amount: price,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${(process.env.NEXT_PUBLIC_APP_URL || 'https://otonami.io').trim()}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${(process.env.NEXT_PUBLIC_APP_URL || 'https://otonami.io').trim()}?payment=cancel`,
      metadata: {
        artistId,
        credits: String(credits),
        packageName,
      },
      customer_email: artistEmail,
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Stripe POST error:', error);
    return NextResponse.json({ error: 'Internal error', detail: error.message }, { status: 500 });
  }
}

// Verify payment and add credits to artists.credits (called after Stripe redirect)
// Trust source: session.metadata (immutable after POST). No JWT required because
// the artistId is locked in at session creation; PUT cannot retarget another user.
export async function PUT(request) {
  try {
    const { sessionId } = await request.json();
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return NextResponse.json({
        error: 'Payment not completed',
        status: session.payment_status,
      }, { status: 400 });
    }

    const artistId = session.metadata?.artistId;
    const credits = parseInt(session.metadata?.credits || '0', 10);
    const packageName = session.metadata?.packageName || 'custom';
    const stripePaymentId = session.payment_intent;

    if (!artistId || !credits || credits <= 0 || !stripePaymentId) {
      return NextResponse.json({
        error: 'Invalid session metadata',
        debug: {
          hasArtistId: !!artistId,
          credits,
          hasStripePaymentId: !!stripePaymentId,
        },
      }, { status: 400 });
    }

    const db = getServiceSupabase();

    // Idempotency: try to INSERT credit_transactions first.
    // stripe_payment_id has a UNIQUE partial index — duplicates raise 23505.
    const { data: txData, error: txError } = await db
      .from('credit_transactions')
      .insert({
        artist_id: artistId,
        amount: credits,
        type: 'purchase',
        description: `Stripe purchase: ${packageName}`,
        stripe_payment_id: stripePaymentId,
        stripe_session_id: sessionId,
        metadata: {
          package: packageName,
          amount_total: session.amount_total,
          currency: session.currency,
        },
      })
      .select()
      .maybeSingle();

    if (txError) {
      if (txError.code === '23505') {
        // Already processed — return current balance.
        const { data: artist } = await db
          .from('artists')
          .select('credits')
          .eq('id', artistId)
          .maybeSingle();
        return NextResponse.json({
          success: true,
          credits: artist?.credits ?? null,
          added: 0,
          already_processed: true,
        });
      }
      console.error('credit_transactions insert error:', txError);
      return NextResponse.json({
        error: 'Database error',
        detail: txError.message,
      }, { status: 500 });
    }

    // Atomic increment via RPC (SET credits = credits + p_amount).
    const { data: newCredits, error: rpcError } = await db.rpc(
      'increment_artist_credits',
      { p_artist_id: artistId, p_amount: credits }
    );

    if (rpcError || newCredits === null || newCredits === undefined) {
      // Roll back the transaction row so retry can succeed.
      await db.from('credit_transactions').delete().eq('id', txData.id);
      console.error('increment_artist_credits error:', rpcError);
      return NextResponse.json({
        error: 'Failed to add credits',
        detail: rpcError?.message,
      }, { status: 500 });
    }

    // Send purchase receipt email (non-fatal — credits are already added).
    try {
      const { data: artist } = await db
        .from('artists')
        .select('email, name')
        .eq('id', artistId)
        .maybeSingle();
      const recipient = artist?.email || session.customer_email;
      if (recipient) {
        const name = artist?.name || 'アーティスト';
        const priceJpy = session.amount_total ?? credits * 160;
        const packageLabel = packageName === 'custom' ? `カスタム (${credits}cr)` : packageName;
        const { error: mailErr } = await resend.emails.send({
          from: FROM,
          to: recipient,
          reply_to: 'info@otonami.io',
          subject: `OTONAMI クレジット購入完了 — ${credits} クレジット / Purchase Confirmation`,
          html: `
            <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;color:#1a1a1a;">
              <h1 style="font-size:24px;text-align:center;margin-bottom:8px;">OTONAMI</h1>
              <h2 style="font-size:18px;color:#1a1a1a;margin-top:32px;">${name} さん、ご購入ありがとうございます！</h2>
              <p style="color:#6b6560;font-size:15px;line-height:1.7;">クレジットがアカウントに追加されました。</p>
              <div style="background:#f8f7f4;border-radius:12px;padding:24px;margin:24px 0;">
                <table style="width:100%;font-size:14px;color:#1a1a1a;">
                  <tr><td style="padding:6px 0;color:#6b6560;">パッケージ</td><td style="padding:6px 0;text-align:right;font-weight:600;">${packageLabel}</td></tr>
                  <tr><td style="padding:6px 0;color:#6b6560;">追加クレジット</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#c4956a;">+${credits} クレジット</td></tr>
                  <tr><td style="padding:6px 0;color:#6b6560;">現在の残高</td><td style="padding:6px 0;text-align:right;font-weight:600;">${newCredits} クレジット</td></tr>
                  <tr><td style="padding:6px 0;color:#6b6560;">お支払い金額</td><td style="padding:6px 0;text-align:right;font-weight:600;">¥${priceJpy.toLocaleString()}</td></tr>
                </table>
              </div>
              <div style="text-align:center;margin:28px 0;">
                <a href="${(process.env.NEXT_PUBLIC_APP_URL || 'https://otonami.io').trim()}/studio" style="background:#c4956a;color:#fff;padding:14px 40px;border-radius:9999px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">スタジオを開く →</a>
              </div>
              <hr style="border:none;border-top:1px solid #e5e2dc;margin:32px 0;" />
              <h2 style="font-size:16px;color:#9b9590;">Hi ${name},</h2>
              <p style="color:#9b9590;font-size:14px;line-height:1.7;">Thank you for your purchase. <strong style="color:#c4956a;">${credits} credits</strong> have been added to your account. Your new balance is <strong>${newCredits} credits</strong>. Payment: ¥${priceJpy.toLocaleString()}.</p>
              <p style="color:#9b9590;font-size:12px;text-align:center;margin-top:24px;">Receipt ID: ${stripePaymentId}<br/>Questions? Reply to this email.</p>
            </div>
          `,
          text: `${name} さん、ご購入ありがとうございます！\n\nパッケージ: ${packageLabel}\n追加クレジット: +${credits}\n現在の残高: ${newCredits}\nお支払い金額: ¥${priceJpy.toLocaleString()}\n\nスタジオ: ${(process.env.NEXT_PUBLIC_APP_URL || 'https://otonami.io').trim()}/studio\n\nReceipt ID: ${stripePaymentId}\n\n---\n\nHi ${name},\n\nThank you for your purchase. ${credits} credits added. New balance: ${newCredits}. Payment: ¥${priceJpy.toLocaleString()}.`,
        });
        if (mailErr) {
          console.error('[stripe] Receipt email send failed:', mailErr);
        }
      } else {
        console.warn('[stripe] No recipient email for receipt (artistId:', artistId, ')');
      }
    } catch (mailEx) {
      console.error('[stripe] Receipt email exception:', mailEx);
    }

    return NextResponse.json({
      success: true,
      credits: newCredits,
      added: credits,
      already_processed: false,
    });
  } catch (error) {
    console.error('Stripe PUT error:', error);
    return NextResponse.json({
      error: 'Internal error',
      detail: error.message,
    }, { status: 500 });
  }
}
