import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');

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

// POST: Register or Login
export async function POST(request) {
  try {
    const { action, email, password, name, role } = await request.json();
    const db = getServiceSupabase();

    if (action === 'register') {
      if (!email || !password || !name) {
        return NextResponse.json({ error: 'email, password, name required' }, { status: 400 });
      }
      // Check existing
      const { data: existing } = await db.from('users').select('id').eq('email', email).single();
      if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 409 });

      const hash = await bcrypt.hash(password, 10);
      const { data: user, error } = await db.from('users').insert({
        email, password_hash: hash, name, role: role || 'artist', credits: 10,
      }).select().single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      const token = await signToken({ id: user.id, email, role: user.role, name });
      return NextResponse.json({ user: { id: user.id, email, name, role: user.role, credits: user.credits }, token });
    }

    if (action === 'login') {
      if (!email || !password) {
        return NextResponse.json({ error: 'email and password required' }, { status: 400 });
      }
      const { data: user } = await db.from('users').select('*').eq('email', email).single();
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return NextResponse.json({ error: 'Invalid password' }, { status: 401 });

      const token = await signToken({ id: user.id, email, role: user.role, name: user.name });
      return NextResponse.json({
        user: { id: user.id, email: user.email, name: user.name, role: user.role, credits: user.credits },
        token,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET: Verify token & get user
export async function GET(request) {
  try {
    const auth = request.headers.get('authorization');
    if (!auth?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token' }, { status: 401 });
    }
    const payload = await verifyToken(auth.slice(7));
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const db = getServiceSupabase();
    const { data: user } = await db.from('users').select('id, email, name, role, credits').eq('id', payload.id).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
