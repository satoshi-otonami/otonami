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

    // Welcomeメール送信（日英併記、失敗してもエラーにしない）
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
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
            <h1 style="font-size:28px;text-align:center;color:#1a1a1a;margin-bottom:8px;">OTONAMI</h1>
            <h2 style="font-size:22px;color:#1a1a1a;margin-top:32px;">ようこそ、${name}さん！</h2>
            <p style="color:#6b6560;font-size:15px;line-height:1.7;">OTONAMIへのご登録ありがとうございます。あなたの音楽を世界中のキュレーターに届けましょう。</p>
            <div style="background:#f8f7f4;border-radius:12px;padding:24px;margin:24px 0;">
              <p style="font-weight:600;color:#1a1a1a;margin:0 0 12px;">はじめの3ステップ:</p>
              <ol style="color:#6b6560;font-size:14px;line-height:2;margin:0;padding-left:20px;">
                <li>プロフィールを完成させる（Bio、リンク、ジャンル）</li>
                <li>楽曲を登録する（YouTube、Spotify、SoundCloud、Bandcamp）</li>
                <li>AIマッチングでキュレーターを見つけてピッチを送る</li>
              </ol>
            </div>
            <p style="text-align:center;color:#c4956a;font-weight:600;font-size:15px;">🎁 初回 <span style="color:#e85d3a;">3クレジット</span> をプレゼント中！</p>
            <div style="text-align:center;margin:28px 0;">
              <a href="${APP_URL}/artist/dashboard" style="background:#c4956a;color:#fff;padding:14px 40px;border-radius:9999px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">ダッシュボードへ →</a>
            </div>
            <hr style="border:none;border-top:1px solid #e5e2dc;margin:32px 0;" />
            <h2 style="font-size:18px;color:#9b9590;">Welcome, ${name}!</h2>
            <p style="color:#9b9590;font-size:14px;line-height:1.7;">Thank you for joining OTONAMI. Let's connect your music with curators around the world.</p>
            <div style="background:#f8f7f4;border-radius:12px;padding:24px;margin:24px 0;">
              <p style="font-weight:600;color:#9b9590;margin:0 0 12px;">Here's how to get started:</p>
              <ol style="color:#9b9590;font-size:13px;line-height:2;margin:0;padding-left:20px;">
                <li>Complete your artist profile with bio, links, and genres</li>
                <li>Add your tracks — YouTube, Spotify, SoundCloud, or Bandcamp</li>
                <li>Pitch your music to curators matched by our AI system</li>
              </ol>
            </div>
            <p style="text-align:center;color:#9b9590;font-size:13px;">🎁 You have <strong>3 free credits</strong> to start pitching!</p>
            <p style="text-align:center;color:#9b9590;font-size:12px;margin-top:32px;">Questions? Reply to this email — we'd love to hear from you.<br/>ご質問はこのメールに返信してください。</p>
          </div>
        `,
        text: `ようこそ、${name}さん！\n\nOTONAMIへのご登録ありがとうございます。あなたの音楽を世界中のキュレーターに届けましょう。\n\nはじめの3ステップ:\n1. プロフィールを完成させる（Bio、リンク、ジャンル）\n2. 楽曲を登録する（YouTube、Spotify、SoundCloud、Bandcamp）\n3. AIマッチングでキュレーターを見つけてピッチを送る\n\n🎁 初回3クレジットをプレゼント中！\n\nダッシュボード: ${APP_URL}/artist/dashboard\n\n---\n\nWelcome, ${name}!\n\nThank you for joining OTONAMI. Let's connect your music with curators around the world.\n\nHow to get started:\n1. Complete your artist profile with bio, links, and genres\n2. Add your tracks\n3. Pitch your music to curators\n\nYou have 3 free credits to start pitching!\n\nDashboard: ${APP_URL}/artist/dashboard\n\nOTONAMI — Connecting Japanese Music to the World\nhttps://otonami.io`,
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
