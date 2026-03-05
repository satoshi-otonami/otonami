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
        return NextResponse.json(
          { error: 'Email and password are required' },
          { status: 400 }
        );
      }

      const { data: curator, error } = await db
        .from('curators')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !curator) {
        return NextResponse.json(
          { error: 'Curator not found. Please register first.' },
          { status: 404 }
        );
      }

      if (!curator.password_hash) {
        return NextResponse.json(
          {
            error: 'Password not set. Please use the registration form to set your password.',
            needsPasswordSetup: true,
            curatorId: curator.id,
          },
          { status: 403 }
        );
      }

      const valid = await bcrypt.compare(password, curator.password_hash);
      if (!valid) {
        return NextResponse.json(
          { error: 'Invalid password' },
          { status: 401 }
        );
      }

      const token = await signToken({
        id: curator.id,
        email: curator.email,
        name: curator.name,
        role: 'curator',
      });

      await db.from('sessions').insert({
        curator_id: curator.id,
        token: token.slice(-16),
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      });

      return NextResponse.json({
        curator: {
          id: curator.id,
          name: curator.name,
          email: curator.email,
          type: curator.type,
          playlist: curator.playlist,
          url: curator.url,
          genres: curator.genres,
          followers: curator.followers,
          region: curator.region,
        },
        token,
      });
    }

    // ── 新規登録 ──
    if (action === 'register') {
      const { name, type, playlist, url, genres, bio, followers, region, accepts } = body;

      if (!email || !password || !name) {
        return NextResponse.json(
          { error: 'Name, email, and password are required' },
          { status: 400 }
        );
      }

      if (password.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters' },
          { status: 400 }
        );
      }

      // 既存チェック
      const { data: existing } = await db
        .from('curators')
        .select('id, password_hash, name')
        .eq('email', email)
        .single();

      // シードキュレーターがパスワード未設定 → パスワードを設定
      if (existing && !existing.password_hash) {
        const hash = await bcrypt.hash(password, 10);
        await db
          .from('curators')
          .update({ password_hash: hash, updated_at: new Date().toISOString() })
          .eq('id', existing.id);

        const token = await signToken({
          id: existing.id,
          email,
          name: existing.name,
          role: 'curator',
        });

        return NextResponse.json({
          message: 'Password set successfully. Welcome!',
          curator: { id: existing.id, email, name: existing.name },
          token,
        });
      }

      // 既にパスワード設定済み
      if (existing && existing.password_hash) {
        return NextResponse.json(
          { error: 'This email is already registered. Please log in.' },
          { status: 409 }
        );
      }

      // 完全新規登録
      const hash = await bcrypt.hash(password, 10);
      const { data: newCurator, error: insertErr } = await db
        .from('curators')
        .insert({
          name,
          email,
          password_hash: hash,
          type: type || 'playlist',
          playlist: playlist || '',
          url: url || '',
          genres: genres || [],
          bio: bio || '',
          followers: followers || 0,
          region: region || '',
          icon: '🎵',
          accepts: accepts || [],
          tags: ['new'],
          tier: 2,
          is_seed: false,
        })
        .select()
        .single();

      if (insertErr) {
        return NextResponse.json(
          { error: insertErr.message },
          { status: 500 }
        );
      }

      const token = await signToken({
        id: newCurator.id,
        email: newCurator.email,
        name: newCurator.name,
        role: 'curator',
      });

      await db.from('sessions').insert({
        curator_id: newCurator.id,
        token: token.slice(-16),
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      });

      return NextResponse.json({
        message: 'Registration successful!',
        curator: {
          id: newCurator.id,
          name: newCurator.name,
          email: newCurator.email,
          type: newCurator.type,
        },
        token,
      });
    }

    // ── パスワード設定（シードキュレーター用）──
    if (action === 'set_password') {
      const { curatorId } = body;

      if (!curatorId || !password) {
        return NextResponse.json(
          { error: 'Curator ID and password required' },
          { status: 400 }
        );
      }

      const hash = await bcrypt.hash(password, 10);
      const { data: updated, error: updateErr } = await db
        .from('curators')
        .update({ password_hash: hash, updated_at: new Date().toISOString() })
        .eq('id', curatorId)
        .select('id, name, email')
        .single();

      if (updateErr || !updated) {
        return NextResponse.json(
          { error: 'Curator not found' },
          { status: 404 }
        );
      }

      const token = await signToken({
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: 'curator',
      });

      return NextResponse.json({
        message: 'Password set successfully!',
        curator: updated,
        token,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
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
