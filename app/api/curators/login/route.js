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

      // curator_auth RPC でパスワード取得
      const { data: authResult, error: authErr } = await db.rpc('curator_auth', {
        p_action: 'get',
        p_email: email,
      });

      if (authErr) {
        return NextResponse.json({ error: authErr.message }, { status: 500 });
      }

      const info = authResult;
      if (!info || !info.found) {
        return NextResponse.json({ error: 'Curator not found. Please register first.' }, { status: 404 });
      }

      if (!info.hash) {
        return NextResponse.json({ error: 'Password not set. Please register to set your password.', needsPasswordSetup: true }, { status: 403 });
      }

      const valid = await bcrypt.compare(password, info.hash);
      if (!valid) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
      }

      // キュレーター情報取得（pw_hashを含まないselect）
      const { data: curator } = await db
        .from('curators')
        .select('id, name, email, type, playlist, url, genres, followers, region, icon')
        .eq('id', info.id)
        .single();

      const token = await signToken({ id: info.id, email, name: info.name, role: 'curator' });
      return NextResponse.json({ curator, token });
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

      // 既存チェック
      const { data: existing } = await db.rpc('curator_auth', {
        p_action: 'get',
        p_email: email,
      });

      // シードキュレーター（パスワード未設定）→ パスワードを設定
      if (existing && existing.found && !existing.hash) {
        const hash = await bcrypt.hash(password, 10);
        await db.rpc('curator_auth', {
          p_action: 'set',
          p_email: email,
          p_password_hash: hash,
        });

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
      const { data: newResult } = await db.rpc('curator_auth', {
        p_action: 'create',
        p_email: email,
        p_password_hash: hash,
        p_name: name,
      });

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
      .select('id, name, email, type, playlist, url, genres, followers, region, accepts, icon')
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
