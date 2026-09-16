import { NextResponse } from 'next/server';
import { signToken } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { getAccountByEmail, getArtistsByAccountId, normalizeEmail } from '@/lib/db';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 'placeholder');
const FROM = `OTONAMI <${process.env.EMAIL_FROM || 'info@otonami.io'}>`;
const testMode = process.env.EMAIL_TEST_MODE === 'true';
const safeEmail = process.env.EMAIL_TEST_REDIRECT || 'satoshiy339@gmail.com';

function maskEmail(email) {
  const [local, domain] = email.split('@');
  return local[0] + '***@' + domain;
}

function generateOTP() {
  return String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
}

async function sendOTPEmail(email, name, otp) {
  const recipientEmail = testMode ? safeEmail : email;
  const subject = (testMode ? `[TEST] (→${email}) ` : '') +
    'OTONAMI ログイン認証コード / Your login code';
  await resend.emails.send({
    from: FROM,
    to: recipientEmail,
    reply_to: 'info@otonami.io',
    subject,
    html: `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
        <h1 style="font-size:28px;text-align:center;color:#1a1a1a;margin-bottom:32px;">OTONAMI</h1>
        <h2 style="font-size:20px;color:#1a1a1a;margin-bottom:8px;">ログイン認証コード / Login Code</h2>
        <p style="color:#6b6560;font-size:14px;margin-bottom:24px;">${name}さん、ログインの認証コードです。</p>
        <div style="background:#f5f3f0;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
          <div style="font-size:32px;font-weight:700;letter-spacing:0.15em;color:#1a1a1a;font-family:monospace;white-space:nowrap;display:inline-block;">${otp}</div>
        </div>
        <p style="color:#9b9590;font-size:13px;text-align:center;line-height:1.6;">
          このコードは10分間有効です。心当たりがない場合は無視してください。<br/>
          This code expires in 10 minutes. If you didn't request this, please ignore.
        </p>
      </div>
    `,
    text: `OTONAMI ログイン認証コード\n\nコード: ${otp}\n\nこのコードは10分間有効です。\n\n---\n\nYour OTONAMI login code: ${otp}\n\nThis code expires in 10 minutes.`,
  });
}

// POST /api/artists/login
export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Credentials live on `accounts`, not `artists` — one login can own several
    // artists. The OTP is still keyed on the login address, which is the
    // account's email.
    const loginEmail = normalizeEmail(email);
    const account = await getAccountByEmail(loginEmail);
    if (!account) {
      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, account.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    // Check email verification (for newly registered users)
    // Note: accounts backfilled from existing artists inherit their verified
    // state, so no established user is suddenly asked to re-verify.
    if (account.email_verified === false && account.verification_token) {
      return NextResponse.json({
        error: 'email_not_verified',
        message: 'メール認証が完了していません。登録時に送信された認証メールのリンクをクリックしてください。',
      }, { status: 403 });
    }

    // The OTP mail greets someone by name; use the account's first artist.
    // A label account with no artists yet still logs in (name falls back).
    const artists = await getArtistsByAccountId(account.id);
    const greetingName = artists[0]?.name || 'OTONAMI';

    const supabase = getServiceSupabase();

    // Cleanup old OTPs
    await supabase.from('login_otps')
      .delete()
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    // Generate and send OTP
    const otp = generateOTP();
    const otpHash = await bcrypt.hash(otp, 10);

    const { error: otpInsertError } = await supabase.from('login_otps').insert({
      email: loginEmail,
      user_type: 'artist',
      otp_code: otpHash,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });

    if (otpInsertError) {
      console.error('Artist OTP insert failed:', otpInsertError);
      return NextResponse.json({ error: 'Failed to generate verification code. Please try again.' }, { status: 500 });
    }

    await sendOTPEmail(loginEmail, greetingName, otp);

    return NextResponse.json({
      success: true,
      step: 'otp_required',
      email: maskEmail(loginEmail),
    });
  } catch (e) {
    console.error('Artist login error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
