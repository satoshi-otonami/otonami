import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyToken, signToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';
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
    const existing = await getArtistByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 409 }
      );
    }

    // パスワードハッシュ化
    const password_hash = await bcrypt.hash(password, 10);

    // INSERT
    const artist = await createArtist({
      name,
      email,
      password_hash,
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

    // JWT生成
    const token = await signToken({
      artistId: artist.id,
      email: artist.email,
      role: 'artist',
    });

    // Welcomeメール送信（非同期、失敗してもエラーにしない）
    const artistTo = testMode ? safeEmail : email;
    const welcomeSubject = (testMode ? `[TEST] (→${email}) ` : '') +
      'Welcome to OTONAMI! あなたの音楽を世界へ';
    try {
      await resend.emails.send({
        from: FROM,
        to: artistTo,
        reply_to: 'info@otonami.io',
        subject: welcomeSubject,
        html: `
          <div style="max-width:600px;margin:0 auto;font-family:'Helvetica Neue',Arial,sans-serif;background:#faf9f7;color:#1a1a1a;padding:0;">
            <div style="background:#fff;padding:24px 32px;border-bottom:1px solid #e8e5e0;text-align:center;">
              <span style="font-size:28px;font-weight:700;color:#1a1a1a;letter-spacing:1px;">OTONAMI</span>
            </div>
            <div style="padding:40px 32px;">
              <h1 style="font-size:24px;font-weight:700;color:#1a1a1a;margin:0 0 8px;">Welcome, ${name}!</h1>
              <p style="color:#666;font-size:15px;margin:0 0 28px;">OTONAMIへようこそ。あなたの音楽を世界中のキュレーターに届けましょう。</p>
              <div style="background:#fff;border:1px solid #e8e5e0;border-radius:12px;padding:24px;margin:0 0 28px;">
                <p style="color:#1a1a1a;font-size:15px;margin:0 0 16px;">Here's how to get started:</p>
                <table style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td style="padding:8px 12px 8px 0;color:#c4956a;font-weight:bold;vertical-align:top;width:28px;">1.</td>
                    <td style="padding:8px 0;color:#1a1a1a;font-size:14px;">Complete your artist profile with bio, links, and genres</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 12px 8px 0;color:#c4956a;font-weight:bold;vertical-align:top;">2.</td>
                    <td style="padding:8px 0;color:#1a1a1a;font-size:14px;">Add your tracks — YouTube, Spotify, SoundCloud, or Bandcamp</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 12px 8px 0;color:#c4956a;font-weight:bold;vertical-align:top;">3.</td>
                    <td style="padding:8px 0;color:#1a1a1a;font-size:14px;">Pitch your music to curators matched by our AI system</td>
                  </tr>
                </table>
              </div>
              <p style="color:#666;font-size:14px;text-align:center;margin:0 0 8px;">
                You have <strong style="color:#c4956a;">3 free credits</strong> to start pitching!
              </p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${APP_URL}/artist" style="display:inline-block;background-color:#c4956a;color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">
                  Go to Your Dashboard →
                </a>
              </div>
              <p style="color:#999;font-size:13px;text-align:center;margin:24px 0 0;">
                Questions? Reply to this email — we'd love to hear from you.
              </p>
            </div>
            <div style="background:#f0ede6;padding:20px 32px;border-top:1px solid #e8e5e0;text-align:center;">
              <p style="color:#999;font-size:12px;margin:0;">
                OTONAMI — Connecting Japanese Music to the World<br>
                <a href="https://otonami.io" style="color:#c4956a;text-decoration:none;">otonami.io</a>
              </p>
            </div>
          </div>
        `,
        text: `Welcome to OTONAMI, ${name}!\n\nOTONAMIへようこそ。あなたの音楽を世界中のキュレーターに届けましょう。\n\nHow to get started:\n1. Complete your artist profile\n2. Add your tracks\n3. Pitch your music to curators\n\nYou have 3 free credits to start pitching!\n\nDashboard: ${APP_URL}/artist\n\nOTONAMI — Connecting Japanese Music to the World\nhttps://otonami.io`,
      });
    } catch (e) {
      console.error('Artist welcome email failed (non-fatal):', e);
    }

    // 管理者通知メール
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
            </table>
            <p style="margin-top:24px;color:#888;font-size:13px;">
              Supabaseで確認:
              <a href="https://supabase.com/dashboard/project/jygnerjbzjvdyyjucqbd/editor">テーブルを開く</a>
            </p>
          </div>
        `,
        text: `新規アーティスト登録\n\n名前: ${name}\nメール: ${email}\nタイプ: ${rest.artist_type || 'solo'}\nリージョン: ${rest.region || 'JP'}\nジャンル: ${(rest.genres || []).join(', ') || '-'}`,
      });
    } catch (e) {
      console.error('Admin notification failed (non-fatal):', e);
    }

    // password_hash を返さない
    const { password_hash: _, ...safeArtist } = artist;
    return NextResponse.json({ success: true, token, artist: safeArtist });
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

    const { password_hash, ...safeArtist } = artist;
    return NextResponse.json({ artist: { ...safeArtist, tracks } });
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
