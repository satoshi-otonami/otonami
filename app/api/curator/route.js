import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { Resend } from 'resend';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-otonami-secret-change-me'
);

async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

async function setCuratorPasswordHash(email, hash) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  await fetch(`${url}/rest/v1/rpc/curator_auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      p_action: 'set',
      p_email: email,
      p_password_hash: hash,
      p_name: null,
    }),
  });
}

const resend = new Resend(process.env.RESEND_API_KEY || 'placeholder');
const FROM = `OTONAMI <${process.env.EMAIL_FROM || 'info@otonami.io'}>`;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://otonami.vercel.app';
const testMode = process.env.EMAIL_TEST_MODE === 'true';
const safeEmail = process.env.EMAIL_TEST_REDIRECT || 'satoshiy339@gmail.com';

export async function POST(request) {
  try {
    const form = await request.json();

    if (!form.name || !form.email || !form.outletName) {
      return NextResponse.json(
        { error: 'Name, email, and outlet name are required.' },
        { status: 400 }
      );
    }

    // 1. Supabaseに保存
    const supabase = getServiceSupabase();
    const id = `${form.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}-${Date.now()}`;

    const { data, error } = await supabase
      .from('curators')
      .insert({
        id,
        name: form.name,
        email: form.email,
        type: form.type || 'blog',
        playlist: form.outletName,
        url: form.url || null,
        genres: form.genres || [],
        bio: form.bio || null,
        followers: parseInt(form.followers) || 0,
        region: form.region || 'Global',
        paypal_email: form.paypalEmail || null,
        icon_url: form.iconUrl || null,
        accepts: form.accepts || [],
        preferred_moods: form.moods || [],
        opportunities: form.opportunities || [],
        similar_artists: form.similarArtists || [],
        playlist_url: form.playlistUrl || null,
        rejected_genres: form.rejectedGenres || [],
        response_time: form.responseTime || null,
        social_links: form.socialLinks || null,
        submission_guidelines: form.submissionGuidelines || null,
        featured_track_url: form.featuredTrackUrl || null,
        tags: ['pending_review'],
        tier: 3,
        is_seed: false,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // 1b. パスワードをハッシュ化して curator_auth に保存
    if (form.password) {
      const hash = await bcrypt.hash(form.password, 10);
      await setCuratorPasswordHash(form.email, hash);
    }

    // 1c. JWTトークン生成（登録後すぐダッシュボードに入れるように）
    const token = await new SignJWT({ id: data.id, email: data.email, name: data.name, role: 'curator' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('30d')
      .sign(JWT_SECRET);

    // 2. Satoshiへの通知メール
    const adminSubject = (testMode ? '[TEST] ' : '') + `【OTONAMI】新規キュレーター登録: ${form.name}`;
    await resend.emails.send({
      from: FROM,
      to: safeEmail,
      reply_to: 'info@otonami.io',
      subject: adminSubject,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#c4956a;">新規キュレーター登録通知</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px;color:#666;width:160px;">名前</td>
                <td style="padding:8px;font-weight:bold;">${form.name}</td></tr>
            <tr style="background:#f9f9f9;">
                <td style="padding:8px;color:#666;">メール</td>
                <td style="padding:8px;">${form.email}</td></tr>
            <tr><td style="padding:8px;color:#666;">媒体名</td>
                <td style="padding:8px;">${form.outletName}</td></tr>
            <tr style="background:#f9f9f9;">
                <td style="padding:8px;color:#666;">タイプ</td>
                <td style="padding:8px;">${form.type}</td></tr>
            <tr><td style="padding:8px;color:#666;">URL</td>
                <td style="padding:8px;">${form.url || '-'}</td></tr>
            <tr style="background:#f9f9f9;">
                <td style="padding:8px;color:#666;">フォロワー</td>
                <td style="padding:8px;">${form.followers || 0}</td></tr>
            <tr><td style="padding:8px;color:#666;">リージョン</td>
                <td style="padding:8px;">${form.region}</td></tr>
            <tr style="background:#f9f9f9;">
                <td style="padding:8px;color:#666;">ジャンル</td>
                <td style="padding:8px;">${(form.genres || []).join(', ') || '-'}</td></tr>
            <tr><td style="padding:8px;color:#666;">Bio</td>
                <td style="padding:8px;">${form.bio || '-'}</td></tr>
            <tr style="background:#f9f9f9;">
                <td style="padding:8px;color:#666;">PayPal</td>
                <td style="padding:8px;">${form.paypalEmail || '未設定'}</td></tr>
            ${(form.moods || []).length ? `<tr><td style="padding:8px;color:#666;">ムード</td><td style="padding:8px;">${form.moods.join(', ')}</td></tr>` : ''}
            ${(form.rejectedGenres || []).length ? `<tr style="background:#f9f9f9;"><td style="padding:8px;color:#666;">拒否ジャンル</td><td style="padding:8px;">${form.rejectedGenres.join(', ')}</td></tr>` : ''}
            ${(form.similarArtists || []).length ? `<tr><td style="padding:8px;color:#666;">類似アーティスト</td><td style="padding:8px;">${form.similarArtists.join(', ')}</td></tr>` : ''}
            ${(form.opportunities || []).length ? `<tr style="background:#f9f9f9;"><td style="padding:8px;color:#666;">提供可能</td><td style="padding:8px;">${form.opportunities.join(', ')}</td></tr>` : ''}
            ${form.responseTime ? `<tr><td style="padding:8px;color:#666;">回答時間</td><td style="padding:8px;">${form.responseTime}</td></tr>` : ''}
            ${form.playlistUrl ? `<tr style="background:#f9f9f9;"><td style="padding:8px;color:#666;">プレイリスト</td><td style="padding:8px;"><a href="${form.playlistUrl}">${form.playlistUrl}</a></td></tr>` : ''}
            ${form.submissionGuidelines ? `<tr><td style="padding:8px;color:#666;">ガイドライン</td><td style="padding:8px;">${form.submissionGuidelines}</td></tr>` : ''}
          </table>
          <p style="margin-top:24px;color:#888;font-size:13px;">
            Supabaseで確認:
            <a href="https://supabase.com/dashboard/project/jygnerjbzjvdyyjucqbd/editor">
              テーブルを開く
            </a>
          </p>
        </div>
      `,
      text: `新規キュレーター登録\n\n名前: ${form.name}\nメール: ${form.email}\n媒体名: ${form.outletName}\nタイプ: ${form.type}\nURL: ${form.url || '-'}\nフォロワー: ${form.followers || 0}\nリージョン: ${form.region}\nジャンル: ${(form.genres || []).join(', ') || '-'}\nBio: ${form.bio || '-'}`,
    });

    // 3. キュレーター本人へのWelcomeメール
    const curatorTo = testMode ? safeEmail : data.email;
    const curatorSubject = (testMode ? `[TEST] (→${data.email}) ` : '') + `Welcome to OTONAMI! Your curator profile is ready 🎵`;
    try {
      await resend.emails.send({
        from: FROM,
        to: curatorTo,
        reply_to: 'info@otonami.io',
        subject: curatorSubject,
        html: `
          <div style="max-width:600px;margin:0 auto;font-family:'Helvetica Neue',Arial,sans-serif;background:#1a1a1a;color:#f0ede6;padding:0;">
            <div style="background:#232323;padding:24px 32px;border-bottom:1px solid #3a3a3a;text-align:center;">
              <span style="font-size:28px;font-weight:700;color:#f0ede6;letter-spacing:1px;">🎵 OTONAMI</span>
            </div>
            <div style="padding:40px 32px;">
              <h1 style="font-size:24px;font-weight:700;color:#f0ede6;margin:0 0 8px;">Welcome, ${data.name}!</h1>
              <p style="color:#b8b0a3;font-size:15px;margin:0 0 28px;">Thank you for joining OTONAMI's curator network.</p>
              <div style="background:#2a2a2a;border:1px solid #3a3a3a;border-radius:12px;padding:24px;margin:0 0 28px;">
                <p style="color:#f0ede6;font-size:15px;margin:0 0 16px;">Your profile is now active. Here's what happens next:</p>
                <table style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td style="padding:8px 12px 8px 0;color:#c4956a;font-weight:bold;vertical-align:top;width:28px;">1.</td>
                    <td style="padding:8px 0;color:#f0ede6;font-size:14px;">Artists discover your profile through our AI matching system</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 12px 8px 0;color:#c4956a;font-weight:bold;vertical-align:top;">2.</td>
                    <td style="padding:8px 0;color:#f0ede6;font-size:14px;">You'll receive pitch notifications via email with a direct link to listen</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 12px 8px 0;color:#c4956a;font-weight:bold;vertical-align:top;">3.</td>
                    <td style="padding:8px 0;color:#f0ede6;font-size:14px;">Listen, review, and provide feedback — earn rewards for every response</td>
                  </tr>
                </table>
              </div>
              <div style="text-align:center;margin:32px 0;">
                <a href="${APP_URL}/curator" style="display:inline-block;background-color:#c4956a;color:#1a1a1a;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">
                  Go to Your Dashboard →
                </a>
              </div>
              <p style="color:#b8b0a3;font-size:13px;text-align:center;margin:24px 0 0;">
                Questions? Reply to this email — we'd love to hear from you.
              </p>
            </div>
            <div style="background:#141414;padding:20px 32px;border-top:1px solid #3a3a3a;text-align:center;">
              <p style="color:#666;font-size:12px;margin:0;">
                OTONAMI — Connecting Japanese Music to the World<br>
                <a href="https://otonami.io" style="color:#c4956a;text-decoration:none;">otonami.io</a>
              </p>
            </div>
          </div>
        `,
        text: `Welcome to OTONAMI, ${data.name}!\n\nThank you for joining our curator network. Your profile is now active.\n\nWhat happens next:\n1. Artists discover your profile through our AI matching system\n2. You'll receive pitch notifications via email\n3. Listen, review, and provide feedback — earn rewards for every response\n\nLog in to your dashboard: ${APP_URL}/curator\n\nOTONAMI — Connecting Japanese Music to the World\nhttps://otonami.io`,
        headers: {
          'List-Unsubscribe': '<mailto:info@otonami.io?subject=unsubscribe>',
        },
      });
    } catch (welcomeErr) {
      console.error('Welcome email failed (non-fatal):', welcomeErr);
    }

    return NextResponse.json({ success: true, curator: data, token });
  } catch (e) {
    console.error('Curator registration error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT /api/curator — プロフィール更新（JWT認証必須）
export async function PUT(request) {
  try {
    const auth = request.headers.get('authorization');
    if (!auth?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = await verifyToken(auth.slice(7));
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const body = await request.json();
    const supabase = getServiceSupabase();

    const ALLOWED = [
      'type', 'playlist', 'url', 'region', 'bio', 'followers',
      'genres', 'accepts', 'preferred_moods', 'opportunities',
      'similar_artists', 'playlist_url', 'icon_url',
      'rejected_genres', 'response_time', 'social_links',
      'submission_guidelines', 'featured_track_url',
    ];
    const updateData = {};
    for (const key of ALLOWED) {
      if (body[key] !== undefined) updateData[key] = body[key];
    }
    if (updateData.followers !== undefined) {
      updateData.followers = parseInt(updateData.followers) || 0;
    }

    const { data, error } = await supabase
      .from('curators')
      .update(updateData)
      .eq('id', payload.id)
      .select('id, name, email, type, playlist, url, genres, followers, region, accepts, icon, bio, icon_url, preferred_moods, opportunities, similar_artists, playlist_url, rejected_genres, response_time, social_links, submission_guidelines, featured_track_url')
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ curator: data });
  } catch (e) {
    console.error('Curator update error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
