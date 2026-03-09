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

      // Direct HTTP call to curator_auth (bypasses PostgREST schema cache)
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

      // キュレーター情報取得（pw_hashを含まないselect — これはPostgRESTで問題ない）
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
