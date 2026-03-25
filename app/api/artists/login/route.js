import { NextResponse } from 'next/server';
import { signToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { getArtistByEmail } from '@/lib/db';

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

    const artist = await getArtistByEmail(email);
    if (!artist) {
      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, artist.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    const token = await signToken({
      artistId: artist.id,
      email: artist.email,
      role: 'artist',
    });

    return NextResponse.json({
      success: true,
      token,
      artist: {
        id: artist.id,
        name: artist.name,
        email: artist.email,
        avatar_url: artist.avatar_url,
      },
    });
  } catch (e) {
    console.error('Artist login error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
