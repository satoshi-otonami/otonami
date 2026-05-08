import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_placeholder');

// Credit packages — flat ¥160 base with volume discount (mirror frontend CREDIT_PACKAGES).
const PACKAGES = {
  trial:    { credits: 5,   price: 800,   label: 'Trial' },
  light:    { credits: 10,  price: 1500,  label: 'Light' },
  standard: { credits: 20,  price: 2800,  label: 'Standard' },
  pro:      { credits: 40,  price: 5200,  label: 'Pro' },
  business: { credits: 100, price: 12000, label: 'Business' },
};
const CREDIT_PRICE = 160; // JPY per credit (custom packages)

// Create Stripe Checkout Session
export async function POST(request) {
  try {
    const { packageId, credits: customCredits, userId, userEmail } = await request.json();

    let credits, price, label;
    if (packageId === 'custom') {
      const n = parseInt(customCredits, 10);
      if (!Number.isInteger(n) || n < 1 || n > 500) {
        return NextResponse.json({ error: 'Custom credits must be between 1 and 500' }, { status: 400 });
      }
      credits = n;
      price = n * CREDIT_PRICE;
      label = `Custom (${n} credits)`;
    } else {
      const pkg = PACKAGES[packageId];
      if (!pkg) return NextResponse.json({ error: 'Invalid package' }, { status: 400 });
      credits = pkg.credits;
      price = pkg.price;
      label = pkg.label;
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
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}?payment=cancel`,
      metadata: {
        userId,
        packageId,
        credits: String(credits),
      },
      customer_email: userEmail,
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Stripe error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Verify payment and add credits (called after redirect)
export async function PUT(request) {
  try {
    const { sessionId } = await request.json();
    if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    const { userId, packageId, credits } = session.metadata;
    const creditAmount = parseInt(credits);
    const db = getServiceSupabase();

    // Check if already processed (idempotency)
    const { data: existing } = await db
      .from('credit_transactions')
      .select('id')
      .eq('stripe_payment_id', session.payment_intent)
      .single();

    if (existing) {
      return NextResponse.json({ message: 'Already processed', credits: creditAmount });
    }

    // Add credits
    const { data: user } = await db
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single();

    const newCredits = (user?.credits || 0) + creditAmount;
    await db.from('users').update({ credits: newCredits }).eq('id', userId);

    // Log transaction
    await db.from('credit_transactions').insert({
      user_id: userId,
      amount: creditAmount,
      type: 'purchase',
      description: `${PACKAGES[packageId]?.label || (packageId === 'custom' ? 'Custom' : packageId)} package — ${creditAmount} credits`,
      stripe_payment_id: session.payment_intent,
    });

    return NextResponse.json({ success: true, credits: newCredits });
  } catch (error) {
    console.error('Payment verify error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
