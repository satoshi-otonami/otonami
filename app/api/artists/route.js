import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyToken, signToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Resend } from 'resend';
import {
  createArtist,
  getArtistByEmail,
  getArtistById,
  updateArtist,
  getArtistTracks,
} from '@/lib/db';

const resend = new Resend(process.env.RESEND_API_KEY || 'placeholder');
const FROM = `OTONAMI <${process.env.EMAIL_FROM || 'info@otonami.io'}>`;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://otonami.vercel.app';
const testMode = process.env.EMAIL_TEST_MODE === 'true';
const safeEmail = process.env.EMAIL_TEST_REDIRECT || 'satoshiy339@gmail.com';

// POST /api/artists — 新規登録
export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, password, ...rest } = body;

    if (!name || !email || !password) {
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

    // メール重複チェック
    const existing = await getArtistByEmail(email.toLowerCase().trim());
    if (existing) {
      return NextResponse.json({
        error: 'already_registered',
        message: 'This email is already registered. Please log in instead.\nこのメールアドレスは既に登録されています。ログインしてください。',
      }, { status: 409 });
    }

    // パスワードハッシュ化
    const password_hash = await bcrypt.hash(password, 10);

    // Generate verification token
    const verification_token = crypto.randomUUID();
    const verification_expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // INSERT
    const artist = await createArtist({
      name,
      email,
      password_hash,
      email_verified: false,
      verification_token,
      verification_expires_at,
      artist_type: rest.artist_type || 'solo',
      bio: rest.bio || null,
      hot_news: rest.hot_news || null,
      avatar_url: rest.avatar_url || null,
      cover_url: rest.cover_url || null,
      region: rest.region || 'JP',
      label_name: rest.label_name || null,
      genres: rest.genres || [],
      moods: rest.moods || [],
      influences: rest.influences || [],
      spotify_url: rest.spotify_url || null,
      youtube_url: rest.youtube_url || null,
      instagram_url: rest.instagram_url || null,
      twitter_url: rest.twitter_url || null,
      facebook_url: rest.facebook_url || null,
      website_url: rest.website_url || null,
    });

    // Send verification email instead of Welcome email
    const verifyUrl = `${APP_URL}/api/verify-email?token=${verification_token}&type=artist`;
    const verifyTo = testMode ? safeEmail : email;
    const verifySubject = (testMode ? `[TEST] (→${email}) ` : '') +
      'OTONAMIへようこそ — メールアドレスを認証してください / Verify your email';
    try {
      await resend.emails.send({
        from: FROM,
        to: verifyTo,
        reply_to: 'info@otonami.io',
        subject: verifySubject,
        html: `
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
            <h1 style="font-size:28px;text-align:center;color:#1a1a1a;margin-bottom:32px;">OTONAMI</h1>
            <h2 style="font-size:20px;color:#1a1a1a;margin-bottom:12px;">${name}さん、OTONAMIへの登録ありがとうございます。</h2>
            <p style="color:#6b6560;font-size:15px;line-height:1.7;margin-bottom:8px;">以下のボタンをクリックしてメールアドレスを認証してください。</p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${verifyUrl}" style="background:#c4956a;color:#fff;padding:16px 48px;border-radius:9999px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">メールアドレスを認証する / Verify Email</a>
            </div>
            <p style="color:#9b9590;font-size:13px;line-height:1.6;text-align:center;">このリンクは24時間有効です。<br/>This link expires in 24 hours.</p>
            <hr style="border:none;border-top:1px solid #e5e2dc;margin:32px 0;" />
            <p style="color:#9b9590;font-size:14px;line-height:1.7;">Hi ${name}, thank you for signing up for OTONAMI. Please click the button above to verify your email address.</p>
            <p style="color:#9b9590;font-size:12px;margin-top:24px;text-align:center;">心当たりがない場合はこのメールを無視してください。<br/>If you didn't request this, please ignore this email.</p>
          </div>
        `,
        text: `${name}さん、OTONAMIへの登録ありがとうございます。\n\n以下のリンクをクリックしてメールアドレスを認証してください:\n${verifyUrl}\n\nこのリンクは24時間有効です。\n\n---\n\nHi ${name}, thank you for signing up for OTONAMI.\nPlease verify your email: ${verifyUrl}\n\nThis link expires in 24 hours.`,
      });
    } catch (e) {
      console.error('Verification email failed (non-fatal):', e);
    }

    // Admin notification email
    try {
      const adminSubject = (testMode ? '[TEST] ' : '') +
        `【OTONAMI】新規アーティスト登録: ${name}`;
      await resend.emails.send({
        from: FROM,
        to: testMode ? safeEmail : 'info@otonami.io',
        reply_to: 'info@otonami.io',
        subject: adminSubject,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:#c4956a;">新規アーティスト登録通知</h2>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:8px;color:#666;width:140px;">名前</td>
                  <td style="padding:8px;font-weight:bold;">${name}</td></tr>
              <tr style="background:#f9f9f9;">
                  <td style="padding:8px;color:#666;">メール</td>
                  <td style="padding:8px;">${email}</td></tr>
              <tr><td style="padding:8px;color:#666;">タイプ</td>
                  <td style="padding:8px;">${rest.artist_type || 'solo'}</td></tr>
              <tr style="background:#f9f9f9;">
                  <td style="padding:8px;color:#666;">リージョン</td>
                  <td style="padding:8px;">${rest.region || 'JP'}</td></tr>
              <tr><td style="padding:8px;color:#666;">ジャンル</td>
                  <td style="padding:8px;">${(rest.genres || []).join(', ') || '-'}</td></tr>
              <tr style="background:#f9f9f9;">
                  <td style="padding:8px;color:#666;">メール認証</td>
                  <td style="padding:8px;">⏳ 未認証</td></tr>
            </table>
            <p style="margin-top:24px;color:#888;font-size:13px;">
              Supabaseで確認:
              <a href="https://supabase.com/dashboard/project/jygnerjbzjvdyyjucqbd/editor">テーブルを開く</a>
            </p>
          </div>
        `,
        text: `新規アーティスト登録\n\n名前: ${name}\nメール: ${email}\nタイプ: ${rest.artist_type || 'solo'}\nリージョン: ${rest.region || 'JP'}\nジャンル: ${(rest.genres || []).join(', ') || '-'}\nメール認証: 未認証`,
      });
    } catch (e) {
      console.error('Admin notification failed (non-fatal):', e);
    }

    // Don't issue JWT yet - email verification required first
    const { password_hash: _, verification_token: _vt, ...safeArtist } = artist;
    return NextResponse.json({ success: true, needsVerification: true, message: 'verification_email_sent', artist: safeArtist });
  } catch (e) {
    console.error('Artist registration error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET /api/artists — プロフィール取得（JWT認証必須）
export async function GET(request) {
  try {
    const payload = await verifyToken(request);
    if (!payload || payload.role !== 'artist') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const artist = await getArtistById(payload.artistId);
    if (!artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }

    const tracks = await getArtistTracks(payload.artistId);

    // Fetch pitches by artist_email and artist_name separately
    // Use select('*') to avoid column-not-found errors on varying schemas
    const supabase = getServiceSupabase();

    let pitches1 = [], pitches2 = [];
    try {
      const r1 = await supabase.from('pitches').select('*').eq('artist_email', artist.email);
      if (r1.error) console.error('Pitch query (email) error:', r1.error);
      else pitches1 = r1.data || [];
    } catch (e) { console.error('Pitch query (email) exception:', e); }

    try {
      const r2 = await supabase.from('pitches').select('*').eq('artist_name', artist.name);
      if (r2.error) console.error('Pitch query (name) error:', r2.error);
      else pitches2 = r2.data || [];
    } catch (e) { console.error('Pitch query (name) exception:', e); }

    // Deduplicate and merge
    const seenIds = new Set();
    const pitchList = [];
    for (const p of [...pitches1, ...pitches2]) {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        pitchList.push(p);
      }
    }
    pitchList.sort((a, b) => new Date(b.sent_at || b.created_at || 0) - new Date(a.sent_at || a.created_at || 0));
    const pitchStats = {
      total_sent: pitchList.length,
      responded: pitchList.filter(p => p.feedback_message || p.status === 'feedback' || p.status === 'interested' || p.status === 'accepted' || p.status === 'declined').length,
      interested: pitchList.filter(p => p.status === 'interested' || p.status === 'accepted').length,
      opened: pitchList.filter(p => ['opened', 'listened', 'feedback', 'interested', 'accepted'].includes(p.status)).length,
      listened: pitchList.filter(p => ['listened', 'feedback', 'interested', 'accepted'].includes(p.status)).length,
    };

    const { password_hash, ...safeArtist } = artist;
    return NextResponse.json({
      artist: { ...safeArtist, tracks },
      pitchStats,
      recentPitches: pitchList.slice(0, 20),
    });
  } catch (e) {
    console.error('Artist GET error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/artists — プロフィール更新（JWT認証必須）
export async function PATCH(request) {
  try {
    const payload = await verifyToken(request);
    if (!payload || payload.role !== 'artist') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const ALLOWED = [
      'name', 'bio', 'hot_news', 'avatar_url', 'cover_url',
      'region', 'label_name', 'genres', 'moods', 'influences',
      'spotify_url', 'youtube_url', 'instagram_url',
      'twitter_url', 'facebook_url', 'website_url',
    ];
    const updateData = {};
    for (const key of ALLOWED) {
      if (body[key] !== undefined) updateData[key] = body[key];
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await updateArtist(payload.artistId, updateData);
    const { password_hash, ...safeArtist } = updated;
    return NextResponse.json({ success: true, artist: safeArtist });
  } catch (e) {
    console.error('Artist PATCH error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
