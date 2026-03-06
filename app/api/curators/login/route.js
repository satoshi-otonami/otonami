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

      // まずpw_hashなしでselectしてキュレーターが存在するか確認
      const { data: basicCheck, error: basicErr } = await db
        .from('curators')
        .select('id, name, email')
        .eq('email', email)
        .single();

      if (basicErr || !basicCheck) {
        return NextResponse.json({
          error: 'Curator not found. Please register first.',
          debug: { email_searched: email, supabase_error: basicErr?.message || 'no match' }
        }, { status: 404 });
      }

      // pw_hashを含めてselect
      const { data: curator, error: pwErr } = await db
        .from('curators')
        .select('id, name, email, type, playlist, url, genres, followers, region, icon, pw_hash')
        .eq('email', email)
        .single();

      if (pwErr) {
        return NextResponse.json({
          error: 'Failed to fetch curator with pw_hash',
          debug: { supabase_error: pwErr.message, curator_exists: true, curator_id: basicCheck.id }
        }, { status: 500 });
      }

      if (!curator.pw_hash) {
        return NextResponse.json({ error: 'Password not set. Please register to set your password.', needsPasswordSetup: true }, { status: 403 });
      }

      const valid = await bcrypt.compare(password, curator.pw_hash);
      if (!valid) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
      }

      const token = await signToken({ id: curator.id, email, name: curator.name, role: 'curator' });
      const { pw_hash, ...curatorData } = curator;
      return NextResponse.json({ curator: curatorData, token });
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

      // 既存チェック（pw_hashなしで検索）
      const { data: existing, error: existErr } = await db
        .from('curators')
        .select('id, name, email')
        .eq('email', email)
        .single();

      if (existing) {
        // pw_hashを別途取得
        const { data: pwData } = await db
          .from('curators')
          .select('pw_hash')
          .eq('id', existing.id)
          .single();

        const hasPw = pwData && pwData.pw_hash;

        // パスワード未設定 → 設定
        if (!hasPw) {
          const hash = await bcrypt.hash(password, 10);
          const { error: updateErr } = await db
            .from('curators')
            .update({ pw_hash: hash, updated_at: new Date().toISOString() })
            .eq('id', existing.id);

          if (updateErr) {
            return NextResponse.json({
              error: 'Failed to set password',
              debug: { supabase_error: updateErr.message }
            }, { status: 500 });
          }

          const token = await signToken({ id: existing.id, email, name: existing.name, role: 'curator' });
          return NextResponse.json({
            message: 'Password set successfully. Welcome!',
            curator: { id: existing.id, name: existing.name, email },
            token,
          });
        }

        // パスワード設定済み
        return NextResponse.json({ error: 'This email is already registered. Please log in.' }, { status: 409 });
      }

      // 完全新規登録
      const hash = await bcrypt.hash(password, 10);
      const { data: newCurator, error: insertErr } = await db
        .from('curators')
        .insert({
          name, email, pw_hash: hash,
          type: type || 'playlist', playlist: playlist || '', url: url || '',
          genres: genres || [], bio: bio || '', followers: followers || 0,
          region: region || '', icon: '🎵', accepts: [], tags: ['new'], tier: 2, is_seed: false,
        })
        .select('id, name, email, type')
        .single();

      if (insertErr) {
        return NextResponse.json({ error: insertErr.message, debug: { step: 'insert' } }, { status: 500 });
      }

      const token = await signToken({ id: newCurator.id, email, name: newCurator.name, role: 'curator' });
      return NextResponse.json({ message: 'Registration successful!', curator: newCurator, token });
    }

    return NextResponse.json({ error: 'Invalid action. Use "login" or "register"' }, { status: 400 });
  } catch (error) {
    console.error('Curator login error:', error);
    return NextResponse.json({ error: error.message, debug: { stack: error.stack?.slice(0, 200) } }, { status: 500 });
  }
}

// GET /api/curators/login
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
