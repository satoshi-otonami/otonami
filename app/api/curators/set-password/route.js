import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { Resend } from 'resend';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-otonami-secret-change-me'
);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://otonami.io';
const FROM    = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const resend  = new Resend(process.env.RESEND_API_KEY || 'placeholder');

// ── callCuratorAuth helper (same pattern as login route) ──
async function callCuratorAuth(action, email, passwordHash) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(`${url}/rest/v1/rpc/curator_auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      p_action: action,
      p_email: email,
      p_password_hash: passwordHash || null,
      p_name: null,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `RPC error: ${res.status}`);
  }
  return res.json();
}

// POST /api/curators/set-password — メール送信（トークン生成）
export async function POST(request) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

    // キュレーター存在確認
    const info = await callCuratorAuth('get', email);
    if (!info || !info.found) {
      // セキュリティのため: 存在しなくても同じレスポンスを返す
      return NextResponse.json({ success: true, message: 'Password setup email sent if the account exists.' });
    }

    // JWTをリセットトークンとして生成（1時間有効）
    const token = await new SignJWT({ email, purpose: 'password_reset' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(JWT_SECRET);

    const link = `${APP_URL}/curator/set-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

    // メール送信
    const testMode = process.env.EMAIL_TEST_MODE === 'true';
    const toEmail  = testMode ? (process.env.EMAIL_TEST_REDIRECT || 'satoshiy339@gmail.com') : email;
    const subjectPrefix = testMode ? '[TEST] ' : '';

    console.log(`[set-password] Sending to: ${toEmail} (testMode=${testMode}, originalEmail=${email})`);

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `OTONAMI <${FROM}>`,
      to: [toEmail],
      reply_to: 'info@otonami.io',
      subject: `${subjectPrefix}OTONAMI — Set Your Password / パスワード設定`,
      text: `Hi ${info.name || email},\n\nClick the link below to set your OTONAMI curator password. This link is valid for 1 hour.\n\n${link}\n\nIf you didn't request this, you can safely ignore this email.\n\nOTONAMI — Connecting Japanese Music to the World`,
      headers: {
        'List-Unsubscribe': '<mailto:info@otonami.io?subject=unsubscribe>',
      },
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;color:#334155;">
          ${testMode ? `<div style="background:#fef3c7;padding:10px 14px;border-radius:8px;margin-bottom:16px;font-size:12px;color:#92400e;">TEST MODE — Original recipient: <strong>${email}</strong></div>` : ''}
          <div style="text-align:center;margin-bottom:28px;">
            <span style="font-size:24px;font-weight:900;color:#0ea5e9;letter-spacing:2px;">OTONAMI</span>
          </div>
          <h2 style="font-size:20px;font-weight:700;color:#0f172a;margin:0 0 12px;">
            Set Your Password / パスワード設定
          </h2>
          <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 8px;">
            Hi ${info.name || email},
          </p>
          <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 24px;">
            Click the button below to set your OTONAMI curator password. This link is valid for <strong>1 hour</strong>.<br>
            <span style="color:#94a3b8;font-size:12px;">下のボタンをクリックしてパスワードを設定してください。リンクの有効期限は1時間です。</span>
          </p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${link}"
               style="display:inline-block;padding:14px 32px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">
              Set Password / パスワードを設定 →
            </a>
          </div>
          <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:24px 0 0;">
            If you didn't request this, you can safely ignore this email.<br>
            このメールに心当たりがない場合は無視してください。<br><br>
            <a href="${APP_URL}" style="color:#0ea5e9;text-decoration:none;">OTONAMI</a> — Connecting Japanese Music to the World
          </p>
        </div>
      `,
    });

    if (emailError) {
      console.error(`[set-password] Resend error:`, emailError);
      return NextResponse.json({ error: `Failed to send email: ${emailError.message || JSON.stringify(emailError)}` }, { status: 500 });
    }

    console.log(`[set-password] Email sent OK. resend_id=${emailData?.id}`);
    return NextResponse.json({ success: true, message: 'Password setup email sent.' });
  } catch (error) {
    console.error('Set-password POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/curators/set-password — パスワード設定（トークン検証）
export async function PUT(request) {
  try {
    const { email, token, password } = await request.json();
    if (!email || !token || !password) {
      return NextResponse.json({ error: 'email, token, and password are required' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // JWTトークンを検証
    let payload;
    try {
      const result = await jwtVerify(token, JWT_SECRET);
      payload = result.payload;
    } catch {
      return NextResponse.json({ error: 'Invalid or expired reset link. Please request a new one.' }, { status: 401 });
    }

    // purposeとemailの一致確認
    if (payload.purpose !== 'password_reset' || payload.email !== email) {
      return NextResponse.json({ error: 'Invalid reset token.' }, { status: 401 });
    }

    // キュレーター存在確認
    const info = await callCuratorAuth('get', email);
    if (!info || !info.found) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    }

    // パスワードをハッシュ化して保存
    const hash = await bcrypt.hash(password, 10);
    await callCuratorAuth('set', email, hash);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Set-password PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
