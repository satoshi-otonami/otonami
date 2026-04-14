import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 'placeholder');
const FROM = `OTONAMI <${process.env.EMAIL_FROM || 'info@otonami.io'}>`;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://otonami.vercel.app';
const testMode = process.env.EMAIL_TEST_MODE === 'true';
const safeEmail = process.env.EMAIL_TEST_REDIRECT || 'satoshiy339@gmail.com';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const type = searchParams.get('type');
  // Use request.url as redirect base so domain always matches the user's browser
  const baseUrl = new URL(request.url).origin;

  if (!token || !['artist', 'curator'].includes(type)) {
    console.error('verify-email: invalid params', { token: !!token, type });
    return NextResponse.redirect(new URL('/verify-error?reason=invalid', baseUrl));
  }

  const supabase = getServiceSupabase();
  const table = type === 'artist' ? 'artists' : 'curators';

  // First try exact token match
  let record = null;
  let queryError = null;

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('verification_token', token)
    .maybeSingle();

  record = data;
  queryError = error;

  if (queryError) {
    console.error('verify-email: DB query error', queryError);
    return NextResponse.redirect(new URL(`/verify-error?reason=not_found&type=${type}`, baseUrl));
  }

  if (!record) {
    // Token not found — might be already verified (token cleared)
    console.error('verify-email: token not found in', table, '— may be already used');
    return NextResponse.redirect(new URL(`/verify-error?reason=not_found&type=${type}`, baseUrl));
  }

  if (record.email_verified) {
    // Already verified — redirect to success
    return NextResponse.redirect(new URL(`/verify-success?type=${type}`, baseUrl));
  }

  if (record.verification_expires_at && new Date(record.verification_expires_at) < new Date()) {
    return NextResponse.redirect(new URL(`/verify-error?reason=expired&type=${type}`, baseUrl));
  }

  // Mark as verified
  const { error: updateError } = await supabase.from(table).update({
    email_verified: true,
    verification_token: null,
    verification_expires_at: null,
  }).eq('id', record.id);

  if (updateError) {
    console.error('verify-email: update failed', updateError);
    return NextResponse.redirect(new URL(`/verify-error?reason=not_found&type=${type}`, baseUrl));
  }

  // Send Welcome email now (moved from registration)
  const name = record.name;
  const email = record.email;
  const recipientEmail = testMode ? safeEmail : email;

  try {
    if (type === 'artist') {
      const welcomeSubject = (testMode ? `[TEST] (→${email}) ` : '') +
        'Welcome to OTONAMI! あなたの音楽を世界へ';
      await resend.emails.send({
        from: FROM,
        to: recipientEmail,
        reply_to: 'info@otonami.io',
        subject: welcomeSubject,
        html: `
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
            <h1 style="font-size:28px;text-align:center;color:#1a1a1a;margin-bottom:8px;">OTONAMI</h1>
            <h2 style="font-size:22px;color:#1a1a1a;margin-top:32px;">ようこそ、${name}さん！</h2>
            <p style="color:#6b6560;font-size:15px;line-height:1.7;">メール認証が完了しました。OTONAMIへのご登録ありがとうございます。あなたの音楽を世界中のキュレーターに届けましょう。</p>
            <div style="background:#f8f7f4;border-radius:12px;padding:24px;margin:24px 0;">
              <p style="font-weight:600;color:#1a1a1a;margin:0 0 12px;">はじめの3ステップ:</p>
              <ol style="color:#6b6560;font-size:14px;line-height:2;margin:0;padding-left:20px;">
                <li>プロフィールを完成させる（Bio、リンク、ジャンル）</li>
                <li>楽曲を登録する（YouTube、Spotify、SoundCloud、Bandcamp）</li>
                <li>AIマッチングでキュレーターを見つけてピッチを送る</li>
              </ol>
            </div>
            <p style="text-align:center;color:#c4956a;font-weight:600;font-size:15px;">初回 <span style="color:#e85d3a;">3クレジット</span> をプレゼント中！</p>
            <div style="text-align:center;margin:28px 0;">
              <a href="${APP_URL}/artist/dashboard" style="background:#c4956a;color:#fff;padding:14px 40px;border-radius:9999px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">ダッシュボードへ →</a>
            </div>
            <hr style="border:none;border-top:1px solid #e5e2dc;margin:32px 0;" />
            <h2 style="font-size:18px;color:#9b9590;">Welcome, ${name}!</h2>
            <p style="color:#9b9590;font-size:14px;line-height:1.7;">Your email has been verified. Thank you for joining OTONAMI. Let's connect your music with curators around the world.</p>
            <p style="text-align:center;color:#9b9590;font-size:12px;margin-top:32px;">Questions? Reply to this email — we'd love to hear from you.<br/>ご質問はこのメールに返信してください。</p>
          </div>
        `,
        text: `ようこそ、${name}さん！\n\nメール認証が完了しました。OTONAMIへのご登録ありがとうございます。\n\nダッシュボード: ${APP_URL}/artist/dashboard\n\n---\n\nWelcome, ${name}!\n\nYour email has been verified. Thank you for joining OTONAMI.\n\nDashboard: ${APP_URL}/artist/dashboard`,
      });
    } else {
      const curatorSubject = (testMode ? `[TEST] (→${email}) ` : '') +
        `Welcome to OTONAMI! Your curator profile is ready`;
      await resend.emails.send({
        from: FROM,
        to: recipientEmail,
        reply_to: 'info@otonami.io',
        subject: curatorSubject,
        html: `
          <div style="max-width:600px;margin:0 auto;font-family:'Helvetica Neue',Arial,sans-serif;background:#1a1a1a;color:#f0ede6;padding:0;">
            <div style="background:#232323;padding:24px 32px;border-bottom:1px solid #3a3a3a;text-align:center;">
              <span style="font-size:28px;font-weight:700;color:#f0ede6;letter-spacing:1px;">OTONAMI</span>
            </div>
            <div style="padding:40px 32px;">
              <h1 style="font-size:24px;font-weight:700;color:#f0ede6;margin:0 0 8px;">Welcome, ${name}!</h1>
              <p style="color:#b8b0a3;font-size:15px;margin:0 0 28px;">Your email has been verified. Thank you for joining OTONAMI's curator network.</p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${APP_URL}/curator" style="display:inline-block;background-color:#c4956a;color:#1a1a1a;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">
                  Go to Your Dashboard →
                </a>
              </div>
            </div>
            <div style="background:#141414;padding:20px 32px;border-top:1px solid #3a3a3a;text-align:center;">
              <p style="color:#666;font-size:12px;margin:0;">OTONAMI — Connecting Japanese Music to the World</p>
            </div>
          </div>
        `,
        text: `Welcome to OTONAMI, ${name}!\n\nYour email has been verified. Thank you for joining our curator network.\n\nLog in: ${APP_URL}/curator`,
      });
    }
  } catch (e) {
    console.error('Welcome email after verification failed (non-fatal):', e);
  }

  return NextResponse.redirect(new URL(`/verify-success?type=${type}`, baseUrl));
}
