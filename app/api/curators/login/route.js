import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-otonami-secret-change-me'
);

async function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

// ── Direct SQL via Supabase SQL endpoint (bypasses PostgREST cache completely) ──
async function runSQL(sql, params = []) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Use the curator_auth function via PostgREST /rpc/ endpoint with service role key
  // This is a direct HTTP call, NOT using the Supabase JS client
  const res = await fetch(`${url}/rest/v1/rpc/curator_auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || err.error || `SQL error: ${res.status}`);
  }

  return res.json();
}

async function callCuratorAuth(action, email, passwordHash, name) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const res = await fetch(`${url}/rest/v1/rpc/curator_auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      p_action: action,
      p_email: email,
      p_password_hash: passwordHash || null,
      p_name: name || null,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `RPC error: ${res.status}`);
  }

  return res.json();
}

// POST /api/curators/login
export async function POST(request) {
  try {
    const body = await request.json();
    const { action, email, password } = body;
    const db = getServiceSupabase();

    // ── ログイン ──
    if (action === 'login') {
      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
      }

      const info = await callCuratorAuth('get', email);

      if (!info || !info.found) {
        return NextResponse.json({ error: 'Curator not found. Please register first.' }, { status: 404 });
      }

      if (!info.hash) {
        return NextResponse.json({
          error: 'password_not_set',
          message: 'Your account exists but no password has been set yet. Please use Set Password to create your password.',
        }, { status: 409 });
      }

      const valid = await bcrypt.compare(password, info.hash);
      if (!valid) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
      }

      // Check email verification for curators with verification_token set
      const { data: curatorCheck } = await db.from('curators').select('email_verified, verification_token').eq('id', info.id).single();
      if (curatorCheck && curatorCheck.email_verified === false && curatorCheck.verification_token) {
        return NextResponse.json({
          error: 'email_not_verified',
          message: 'メール認証が完了していません。',
        }, { status: 403 });
      }

      // Cleanup old OTPs
      await db.from('login_otps')
        .delete()
        .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // Generate and send OTP
      const otp = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
      const otpHash = await bcrypt.hash(otp, 10);

      const { data: otpData, error: otpInsertError } = await db.from('login_otps').insert({
        email,
        user_type: 'curator',
        otp_code: otpHash,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        used: false,
        attempts: 0,
      }).select().single();

      if (otpInsertError) {
        console.error('Curator OTP INSERT error:', JSON.stringify(otpInsertError));
        return NextResponse.json({ error: 'Failed to generate OTP', details: otpInsertError.message }, { status: 500 });
      }

      // Send OTP email
      const resend = new (await import('resend')).Resend(process.env.RESEND_API_KEY || 'placeholder');
      const FROM_EMAIL = `OTONAMI <${process.env.EMAIL_FROM || 'info@otonami.io'}>`;
      const isTestMode = process.env.EMAIL_TEST_MODE === 'true';
      const testEmail = process.env.EMAIL_TEST_REDIRECT || 'satoshiy339@gmail.com';
      const recipientEmail = isTestMode ? testEmail : email;
      const otpSubject = (isTestMode ? `[TEST] (→${email}) ` : '') + 'OTONAMI ログイン認証コード / Your login code';

      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: recipientEmail,
          reply_to: 'info@otonami.io',
          subject: otpSubject,
          html: `
            <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
              <h1 style="font-size:28px;text-align:center;color:#1a1a1a;margin-bottom:32px;">OTONAMI</h1>
              <h2 style="font-size:20px;color:#1a1a1a;margin-bottom:8px;">ログイン認証コード / Login Code</h2>
              <p style="color:#6b6560;font-size:14px;margin-bottom:24px;">ログインの認証コードです。</p>
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
      } catch (e) {
        console.error('OTP email failed:', e);
      }

      // Mask email for response
      const [local, domain] = email.split('@');
      const maskedEmail = local[0] + '***@' + domain;

      return NextResponse.json({
        success: true,
        step: 'otp_required',
        email: maskedEmail,
      });
    }

    // ── 新規登録 / パスワード設定 ──
    if (action === 'register') {
      const { name } = body;

      if (!email || !password || !name) {
        return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
      }
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      }

      // 既存チェック (direct HTTP)
      const existing = await callCuratorAuth('get', email);

      // シードキュレーター（パスワード未設定）→ パスワードを設定
      if (existing && existing.found && !existing.hash) {
        const hash = await bcrypt.hash(password, 10);
        await callCuratorAuth('set', email, hash);

        const token = await signToken({ id: existing.id, email, name: existing.name, role: 'curator' });
        return NextResponse.json({
          message: 'Password set successfully. Welcome!',
          curator: { id: existing.id, name: existing.name, email },
          token,
        });
      }

      // 既にパスワード設定済み
      if (existing && existing.found && existing.hash) {
        return NextResponse.json({ error: 'This email is already registered. Please log in.' }, { status: 409 });
      }

      // 完全新規登録
      const hash = await bcrypt.hash(password, 10);
      const newResult = await callCuratorAuth('create', email, hash, name);

      const token = await signToken({ id: newResult.id, email, name: newResult.name, role: 'curator' });
      return NextResponse.json({
        message: 'Registration successful!',
        curator: { id: newResult.id, name: newResult.name, email },
        token,
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use "login" or "register"' }, { status: 400 });
  } catch (error) {
    console.error('Curator login error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/curators/login — トークン検証
export async function GET(request) {
  try {
    const auth = request.headers.get('authorization');
    if (!auth?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    const payload = await verifyToken(auth.slice(7));
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const db = getServiceSupabase();
    const { data: curator } = await db
      .from('curators')
      .select('id, name, email, type, playlist, url, genres, followers, region, accepts, icon, bio, icon_url, preferred_moods, opportunities, similar_artists, playlist_url')
      .eq('id', payload.id)
      .single();

    if (!curator) {
      return NextResponse.json({ error: 'Curator not found' }, { status: 404 });
    }
    return NextResponse.json({ curator });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
