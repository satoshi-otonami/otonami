import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 'placeholder');
const FROM = `OTONAMI <${process.env.EMAIL_FROM || 'onboarding@resend.dev'}>`;
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
        tags: ['pending_review'],
        tier: 3,
        is_seed: false,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // 2. Satoshiへの通知メール
    const adminSubject = (testMode ? '[TEST] ' : '') + `【OTONAMI】新規キュレーター登録: ${form.name}`;
    await resend.emails.send({
      from: FROM,
      to: safeEmail,
      subject: adminSubject,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#7c3aed;">新規キュレーター登録通知</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px;color:#666;width:140px;">名前</td>
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
          </table>
          <p style="margin-top:24px;color:#888;font-size:13px;">
            Supabaseで確認:
            <a href="https://supabase.com/dashboard/project/jygnerjbzjvdyyjucqbd/editor">
              テーブルを開く
            </a>
          </p>
        </div>
      `,
    });

    // 3. 登録者への自動返信メール
    const curatorTo = testMode ? safeEmail : form.email;
    const curatorSubject = (testMode ? `[TEST] (→${form.email}) ` : '') + `Welcome to OTONAMI, ${form.name}! 🎵`;
    await resend.emails.send({
      from: FROM,
      to: curatorTo,
      subject: curatorSubject,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0d0d1a;color:#fff;padding:40px;border-radius:16px;">
          <h1 style="color:#a78bfa;font-size:28px;margin-bottom:8px;">Welcome to OTONAMI!</h1>
          <p style="color:#ccc;font-size:16px;line-height:1.7;">
            Hi ${form.name},<br><br>
            Thank you for registering as a curator on OTONAMI — the platform connecting
            Japanese indie artists with international tastemakers like yourself.
          </p>
          <div style="background:#1a1a3a;border-radius:12px;padding:24px;margin:24px 0;">
            <h3 style="color:#7c3aed;margin-top:0;">Your registration details:</h3>
            <p style="color:#ccc;margin:4px 0;">📻 Outlet: <strong style="color:#fff;">${form.outletName}</strong></p>
            <p style="color:#ccc;margin:4px 0;">🎵 Genres: <strong style="color:#fff;">${(form.genres || []).join(', ') || 'Not specified'}</strong></p>
            <p style="color:#ccc;margin:4px 0;">🌍 Region: <strong style="color:#fff;">${form.region}</strong></p>
          </div>
          <h3 style="color:#a78bfa;">What happens next?</h3>
          <ol style="color:#ccc;line-height:2;">
            <li>Our team will review your profile within <strong style="color:#fff;">2–3 business days</strong></li>
            <li>Once approved, Japanese indie artists can start pitching to you</li>
            <li>You'll receive curated pitch emails matching your genre preferences</li>
          </ol>
          <p style="color:#ccc;margin-top:24px;">
            In the meantime, feel free to explore OTONAMI:
          </p>
          <a href="https://otonami.vercel.app" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#7c3aed,#2563eb);border-radius:24px;color:#fff;text-decoration:none;font-weight:bold;margin-top:8px;">
            Visit OTONAMI →
          </a>
          <p style="color:#555;font-size:12px;margin-top:32px;">
            Questions? Reply to this email or contact us at info@otonami.jp<br>
            OTONAMI — Connecting Japanese Indie Artists with the World
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, curator: data });
  } catch (e) {
    console.error('Curator registration error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
