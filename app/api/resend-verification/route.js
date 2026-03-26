import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { Resend } from 'resend';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY || 'placeholder');
const FROM = `OTONAMI <${process.env.EMAIL_FROM || 'info@otonami.io'}>`;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://otonami.vercel.app';
const testMode = process.env.EMAIL_TEST_MODE === 'true';
const safeEmail = process.env.EMAIL_TEST_REDIRECT || 'satoshiy339@gmail.com';

function buildVerificationEmail(name, token, type) {
  const verifyUrl = `${APP_URL}/api/verify-email?token=${token}&type=${type}`;
  return {
    subject: (testMode ? '[TEST] ' : '') + 'OTONAMIへようこそ — メールアドレスを認証してください / Verify your email',
    html: `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
        <h1 style="font-size:28px;text-align:center;color:#1a1a1a;margin-bottom:32px;">OTONAMI</h1>
        <h2 style="font-size:20px;color:#1a1a1a;margin-bottom:12px;">${name}さん、OTONAMIへの登録ありがとうございます。</h2>
        <p style="color:#6b6560;font-size:15px;line-height:1.7;margin-bottom:8px;">以下のボタンをクリックしてメールアドレスを認証してください。</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${verifyUrl}" style="background:#c4956a;color:#fff;padding:16px 48px;border-radius:9999px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">メールアドレスを認証する / Verify Email</a>
        </div>
        <p style="color:#9b9590;font-size:13px;line-height:1.6;text-align:center;">このリンクは24時間有効です。<br/>This link expires in 24 hours.</p>
        <hr style="border:none;border-top:1px solid #e5e2dc;margin:32px 0;" />
        <p style="color:#9b9590;font-size:14px;line-height:1.7;">Hi ${name}, thank you for signing up for OTONAMI. Please click the button above to verify your email address.</p>
        <p style="color:#9b9590;font-size:12px;margin-top:24px;text-align:center;">心当たりがない場合はこのメールを無視してください。<br/>If you didn't request this, please ignore this email.</p>
      </div>
    `,
    text: `${name}さん、OTONAMIへの登録ありがとうございます。\n\n以下のリンクをクリックしてメールアドレスを認証してください:\n${verifyUrl}\n\nこのリンクは24時間有効です。\n\n---\n\nHi ${name}, thank you for signing up for OTONAMI.\nPlease verify your email: ${verifyUrl}\n\nThis link expires in 24 hours.`,
  };
}

export { buildVerificationEmail };

export async function POST(request) {
  try {
    const { email, type } = await request.json();

    if (!email || !['artist', 'curator'].includes(type)) {
      return NextResponse.json({ error: 'Email and type are required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const table = type === 'artist' ? 'artists' : 'curators';

    const { data: record } = await supabase
      .from(table)
      .select('id, name, email, email_verified, verification_expires_at')
      .eq('email', email)
      .single();

    if (!record) {
      // Don't reveal if account exists
      return NextResponse.json({ success: true, message: 'If the account exists, a verification email has been sent.' });
    }

    if (record.email_verified) {
      return NextResponse.json({ error: 'already_verified', message: 'This email is already verified.' }, { status: 400 });
    }

    // Rate limit: 60 seconds
    if (record.verification_expires_at) {
      const expiresAt = new Date(record.verification_expires_at);
      const sentAt = new Date(expiresAt.getTime() - 24 * 60 * 60 * 1000);
      if (Date.now() - sentAt.getTime() < 60 * 1000) {
        return NextResponse.json({ error: 'rate_limited', message: 'Please wait 60 seconds before requesting again.' }, { status: 429 });
      }
    }

    // Generate new token
    const verificationToken = crypto.randomUUID();
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await supabase.from(table).update({
      verification_token: verificationToken,
      verification_expires_at: verificationExpiresAt,
    }).eq('id', record.id);

    // Send verification email
    const { subject, html, text } = buildVerificationEmail(record.name, verificationToken, type);
    const recipientEmail = testMode ? safeEmail : email;
    await resend.emails.send({
      from: FROM,
      to: recipientEmail,
      reply_to: 'info@otonami.io',
      subject,
      html,
      text,
    });

    return NextResponse.json({ success: true, message: 'Verification email sent.' });
  } catch (e) {
    console.error('Resend verification error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
