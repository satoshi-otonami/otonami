import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { signToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-otonami-secret-change-me'
);

export async function POST(request) {
  try {
    const { email, otp_code, type } = await request.json();

    if (!email || !otp_code || !['artist', 'curator'].includes(type)) {
      return NextResponse.json({ error: 'Email, OTP code, and type are required' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    // Cleanup old OTPs (24h+)
    await supabase.from('login_otps')
      .delete()
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    // Get latest OTP for this email
    const { data: otpRecord, error: otpError } = await supabase
      .from('login_otps')
      .select('*')
      .eq('email', email)
      .eq('user_type', type)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpRecord) {
      return NextResponse.json({ error: 'No valid OTP found. Please request a new code.' }, { status: 400 });
    }

    // Check expiry
    if (new Date(otpRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: 'OTP has expired. Please request a new code.' }, { status: 400 });
    }

    // Check attempts
    if (otpRecord.attempts >= 5) {
      return NextResponse.json({ error: 'Too many attempts. Please request a new code.', attemptsRemaining: 0 }, { status: 429 });
    }

    // Verify OTP
    const valid = await bcrypt.compare(otp_code, otpRecord.otp_code);
    if (!valid) {
      // Increment attempts
      await supabase.from('login_otps')
        .update({ attempts: otpRecord.attempts + 1 })
        .eq('id', otpRecord.id);

      const remaining = 4 - otpRecord.attempts;
      return NextResponse.json({
        error: 'Invalid OTP code.',
        attemptsRemaining: remaining > 0 ? remaining : 0,
      }, { status: 401 });
    }

    // Mark as used
    await supabase.from('login_otps').update({ used: true }).eq('id', otpRecord.id);

    // Get user and generate JWT
    if (type === 'artist') {
      const { data: artist } = await supabase
        .from('artists')
        .select('id, name, email, avatar_url, email_verified')
        .eq('email', email)
        .single();

      if (!artist) {
        return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
      }

      // Auto-verify email for existing users who pass OTP
      if (!artist.email_verified) {
        await supabase.from('artists').update({ email_verified: true }).eq('id', artist.id);
      }

      const token = await signToken({
        artistId: artist.id,
        email: artist.email,
        role: 'artist',
      });

      return NextResponse.json({
        success: true,
        token,
        artist: { id: artist.id, name: artist.name, email: artist.email, avatar_url: artist.avatar_url },
      });
    } else {
      // Curator
      const { data: curator } = await supabase
        .from('curators')
        .select('id, name, email, type, playlist, url, genres, followers, region, icon, bio, icon_url, preferred_moods, opportunities, similar_artists, playlist_url, accepts, email_verified')
        .eq('email', email)
        .single();

      if (!curator) {
        return NextResponse.json({ error: 'Curator not found' }, { status: 404 });
      }

      // Auto-verify email for existing users who pass OTP
      if (!curator.email_verified) {
        await supabase.from('curators').update({ email_verified: true }).eq('id', curator.id);
      }

      const token = await new SignJWT({ id: curator.id, email: curator.email, name: curator.name, role: 'curator' })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('30d')
        .sign(JWT_SECRET);

      const { email_verified, ...safeCurator } = curator;
      return NextResponse.json({ success: true, token, curator: safeCurator });
    }
  } catch (e) {
    console.error('OTP verification error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
