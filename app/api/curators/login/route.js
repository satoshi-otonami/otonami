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

      const { data: pwData, error: pwErr } = await db.rpc('get_curator_password', { curator_email: email });
      if (pwErr || !pwData || pwData.length === 0) {
        return NextResponse.json({ error: 'Curator not found. Please register first.' }, { status: 404 });
      }

      const { curator_id, curator_name, hash } = pwData[0];
      if (!hash) {
        return NextResponse.json({ error: 'Password not set. Please register to set your password.', needsPasswordSetup: true }, { status: 403 });
      }

      const valid = await bcrypt.compare(password, hash);
      if (!valid) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
      }

      const { data: curator } = await db
        .from('curators')
        .select('id, name, email, type, playlist, url, genres, followers, region, icon')
        .eq('id', curator_id)
        .single();

      const token = await signToken({ id: curator_id, email, name: curator_name, role: 'curator' });
      return NextResponse.json({ curator, token });
    }

    // ── 新規登録 / パスワード設定 ──
    if (action === 'register') {
      const { name, type, playlist, url, genres, bio, followers, region } = body;

      if (!email || !password || !name) {
        return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
      }
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      }

      // 既存チェック（RPC経由）
      const { data: existing } = await db.rpc('get_curator_password', { curator_email: email });

      // シードキュレーター（パスワード未設定）→ パスワードを設定
      if (existing && existing.length > 0 && !existing[0].hash) {
        const hash = await bcrypt.hash(password, 10);
        await db.rpc('set_curator_password', { curator_email: email, new_hash: hash });

        const token = await signToken({
          id: existing[0].curator_id, email, name: existing[0].curator_name, role: 'curator',
        });

        return NextResponse.json({
          message: 'Password set successfully. Welcome!',
          curator: { id: existing[0].curator_id, name: existing[0].curator_name, email },
          token,
        });
      }

      // 既にパスワード設定済み
      if (existing && existing.length > 0 && existing[0].hash) {
        return NextResponse.json({ error: 'This email is already registered. Please log in.' }, { status: 409 });
      }

      // 完全新規登録（RPC経由 — password_hashカラムへの直接アクセスなし）
      const hash = await bcrypt.hash(password, 10);
      const { data: newData, error: insertErr } = await db.rpc('insert_curator_with_password', {
        p_name: name,
        p_email: email,
        p_hash: hash,
        p_type: type || 'playlist',
        p_playlist: playlist || '',
        p_url: url || '',
        p_genres: genres || [],
        p_bio: bio || '',
        p_followers: followers || 0,
        p_region: region || '',
      });

      if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }

      const newCurator = newData && newData[0] ? newData[0] : { curator_id: 'unknown', curator_name: name, curator_email: email, curator_type: type || 'playlist' };

      const token = await signToken({
        id: newCurator.curator_id, email, name: newCurator.curator_name, role: 'curator',
      });

      return NextResponse.json({
        message: 'Registration successful!',
        curator: { id: newCurator.curator_id, name: newCurator.curator_name, email: newCurator.curator_email, type: newCurator.curator_type },
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
