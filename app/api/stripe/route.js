import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_placeholder');

// Credit packages (mirror frontend)
const PACKAGES = {
  trial:    { credits: 5,   price: 800,   label: 'Trial' },
  starter:  { credits: 15,  price: 2000,  label: 'Starter' },
  standard: { credits: 30,  price: 3800,  label: 'Standard' },
  pro:      { credits: 60,  price: 7000,  label: 'Pro' },
  label:    { credits: 120, price: 12000, label: 'Label' },
};

// Create Stripe Checkout Session
export async function POST(request) {
  try {
    const { packageId, userId, userEmail } = await request.json();
    const pkg = PACKAGES[packageId];
    if (!pkg) return NextResponse.json({ error: 'Invalid package' }, { status: 400 });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'jpy',
          product_data: {
            name: `OTONAMI ${pkg.label} — ${pkg.credits} Credits`,
            description: `${pkg.credits}クレジット（キュレーターへのピッチ送信用）`,
          },
          unit_amount: pkg.price,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}?payment=cancel`,
      metadata: {
        userId,
        packageId,
        credits: String(pkg.credits),
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
      description: `${PACKAGES[packageId]?.label} package — ${creditAmount} credits`,
      stripe_payment_id: session.payment_intent,
    });

    return NextResponse.json({ success: true, credits: newCredits });
  } catch (error) {
    console.error('Payment verify error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
