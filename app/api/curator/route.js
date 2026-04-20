import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { Resend } from 'resend';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';

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

    const supabase = getServiceSupabase();

    // 重複メールチェック
    const { data: existingCurator } = await supabase
      .from('curators')
      .select('id')
      .eq('email', form.email.toLowerCase().trim())
      .limit(1);

    if (existingCurator && existingCurator.length > 0) {
      return NextResponse.json({
        error: 'already_registered',
        message: 'This email is already registered. Please log in instead.\nこのメールアドレスは既に登録されています。ログインしてください。',
      }, { status: 409 });
    }

    // 1. Supabaseに保存
    const id = `${form.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}-${Date.now()}`;

    const validTier = Math.min(5, Math.max(1, parseInt(form.tier) || 2));

    const { data, error } = await supabase
      .from('curators')
      .insert({
        id,
        name: form.name,
        email: form.email.toLowerCase().trim(),
        type: form.type || 'blog',
        playlist: form.outletName,
        url: form.url || null,
        genres: form.genres || [],
        bio: form.bio || null,
        followers: parseInt(form.followers) || 0,
        region: form.region || 'Global',
        payment_method: form.paymentMethod || (form.paypalEmail ? 'paypal' : null),
        payment_info: form.paymentInfo || form.paypalEmail || null,
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
        open_to_all_genres: form.openToAllGenres || false,
        tags: ['pending_review'],
        tier: validTier,
        is_seed: false,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Generate verification token
    const verificationToken = crypto.randomUUID();
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('curators').update({
      email_verified: false,
      verification_token: verificationToken,
      verification_expires_at: verificationExpiresAt,
    }).eq('id', data.id);

    // 1b. パスワードをハッシュ化して curator_auth に保存
    if (form.password) {
      const hash = await bcrypt.hash(form.password, 10);
      await setCuratorPasswordHash(form.email, hash);
    }

    // No JWT at registration — email verification required first

    // 2. Satoshiへの通知メール (non-fatal) — DEBUG INSTRUMENTED
    console.log('[ADMIN-NOTIFY] reach block', JSON.stringify({
      name: form.name,
      email: form.email,
      hasKey: !!process.env.RESEND_API_KEY,
      keyPrefix: (process.env.RESEND_API_KEY || '').substring(0, 10),
      keyLen: (process.env.RESEND_API_KEY || '').length,
      from: FROM,
      to: safeEmail,
      testMode,
      emailTestRedirectSet: !!process.env.EMAIL_TEST_REDIRECT,
    }));
    try {
    const adminSubject = (testMode ? '[TEST] ' : '') + `【OTONAMI】新規キュレーター登録: ${form.name}`;
    const adminSendResult = await resend.emails.send({
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
                <td style="padding:8px;color:#666;">支払い方法</td>
                <td style="padding:8px;">${form.paymentMethod || form.paypalEmail ? 'paypal' : '未設定'} / ${form.paymentInfo || form.paypalEmail || '未設定'}</td></tr>
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
    console.log('[ADMIN-NOTIFY] resend.send returned', JSON.stringify({
      dataId: adminSendResult?.data?.id ?? null,
      error: adminSendResult?.error ?? null,
    }));
    if (adminSendResult?.error) {
      console.error('[ADMIN-NOTIFY] resend returned error field:', JSON.stringify(adminSendResult.error));
    } else {
      console.log('[ADMIN-NOTIFY] sent OK for:', form.name, 'id=', adminSendResult?.data?.id);
    }
    } catch (notifyErr) {
      console.error('[ADMIN-NOTIFY] threw exception', JSON.stringify({
        type: notifyErr?.constructor?.name,
        name: notifyErr?.name,
        message: notifyErr?.message,
        statusCode: notifyErr?.statusCode,
        stack: notifyErr?.stack,
      }));
    }

    // 3. Send verification email (instead of Welcome email)
    const verifyUrl = `${APP_URL}/api/verify-email?token=${verificationToken}&type=curator`;
    const curatorTo = testMode ? safeEmail : data.email;
    const verifySubject = (testMode ? `[TEST] (→${data.email}) ` : '') +
      'OTONAMIへようこそ — メールアドレスを認証してください / Verify your email';
    try {
      await resend.emails.send({
        from: FROM,
        to: curatorTo,
        reply_to: 'info@otonami.io',
        subject: verifySubject,
        html: `
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
            <h1 style="font-size:28px;text-align:center;color:#1a1a1a;margin-bottom:32px;">OTONAMI</h1>
            <h2 style="font-size:20px;color:#1a1a1a;margin-bottom:12px;">${data.name}さん、OTONAMIへの登録ありがとうございます。</h2>
            <p style="color:#6b6560;font-size:15px;line-height:1.7;margin-bottom:8px;">以下のボタンをクリックしてメールアドレスを認証してください。</p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${verifyUrl}" style="background:#c4956a;color:#fff;padding:16px 48px;border-radius:9999px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">メールアドレスを認証する / Verify Email</a>
            </div>
            <p style="color:#9b9590;font-size:13px;line-height:1.6;text-align:center;">このリンクは24時間有効です。<br/>This link expires in 24 hours.</p>
            <hr style="border:none;border-top:1px solid #e5e2dc;margin:32px 0;" />
            <p style="color:#9b9590;font-size:14px;line-height:1.7;">Hi ${data.name}, thank you for signing up for OTONAMI. Please click the button above to verify your email address.</p>
            <p style="color:#9b9590;font-size:12px;margin-top:24px;text-align:center;">心当たりがない場合はこのメールを無視してください。<br/>If you didn't request this, please ignore this email.</p>
          </div>
        `,
        text: `${data.name}さん、OTONAMIへの登録ありがとうございます。\n\n認証リンク: ${verifyUrl}\n\nこのリンクは24時間有効です。`,
        headers: { 'List-Unsubscribe': '<mailto:info@otonami.io?subject=unsubscribe>' },
      });
    } catch (welcomeErr) {
      console.error('Verification email failed (non-fatal):', welcomeErr);
    }

    return NextResponse.json({ success: true, needsVerification: true, message: 'verification_email_sent', curator: data });
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
      'name', 'type', 'playlist', 'url', 'region', 'bio', 'followers',
      'genres', 'accepts', 'preferred_moods', 'opportunities',
      'similar_artists', 'playlist_url', 'icon_url',
      'rejected_genres', 'response_time', 'social_links',
      'submission_guidelines', 'featured_track_url', 'open_to_all_genres',
      'payment_method', 'payment_info', 'tier',
    ];
    const updateData = {};
    for (const key of ALLOWED) {
      if (body[key] !== undefined) updateData[key] = body[key];
    }
    if (updateData.name !== undefined) {
      const trimmed = (updateData.name || '').trim();
      if (!trimmed || trimmed.length > 100) {
        return NextResponse.json({ error: 'Name must be 1–100 characters' }, { status: 400 });
      }
      updateData.name = trimmed;
    }
    if (updateData.followers !== undefined) {
      updateData.followers = parseInt(updateData.followers) || 0;
    }
    if (updateData.tier !== undefined) {
      updateData.tier = Math.min(5, Math.max(1, parseInt(updateData.tier) || 2));
    }

    const { data, error } = await supabase
      .from('curators')
      .update(updateData)
      .eq('id', payload.id)
      .select('id, name, email, type, playlist, url, genres, followers, region, accepts, icon, bio, icon_url, preferred_moods, opportunities, similar_artists, playlist_url, rejected_genres, response_time, social_links, submission_guidelines, featured_track_url, open_to_all_genres, payment_method, payment_info, tier')
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ curator: data });
  } catch (e) {
    console.error('Curator update error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
