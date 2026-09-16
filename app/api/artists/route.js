import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyToken, signToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Resend } from 'resend';
import {
  getAccountByEmail,
  createAccount,
  getArtistById,
  getArtistsByAccountId,
  updateArtist,
  getArtistTracks,
  normalizeEmail,
} from '@/lib/db';

const resend = new Resend(process.env.RESEND_API_KEY || 'placeholder');
const FROM = `OTONAMI <${process.env.EMAIL_FROM || 'info@otonami.io'}>`;
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://otonami.io').trim();
const testMode = process.env.EMAIL_TEST_MODE === 'true';
const safeEmail = process.env.EMAIL_TEST_REDIRECT || 'satoshiy339@gmail.com';

// Signup credit grant — single source of truth. The same helper feeds the
// artists row and the credit_transactions ledger entry, so the balance and the
// ledger can never disagree about how much was granted.
const FOUNDING_GRANT = 10;
const DEFAULT_GRANT = 3;
const signupGrant = (isFounding) => (isFounding ? FOUNDING_GRANT : DEFAULT_GRANT);

// Pick the smallest unused founding_number in 1..limit (gap-filling), so a slot
// freed by a deleted founding artist is reused instead of colliding with an
// existing higher number (count-based numbering hit idx_artists_founding_number).
// Returns { eligible:false, foundingNumber:null } when all slots are taken, the
// deadline has passed, or the lookup fails.
async function pickFoundingSlot(adminDb, limit, deadline) {
  if (new Date() >= deadline) return { eligible: false, foundingNumber: null };

  const { data, error } = await adminDb
    .from('artists')
    .select('founding_number')
    .eq('is_founding', true)
    .not('founding_number', 'is', null);

  if (error) {
    console.error('Founding slot lookup error (falling back to non-founding):', error);
    return { eligible: false, foundingNumber: null };
  }

  const used = new Set((data || []).map((r) => r.founding_number));
  for (let n = 1; n <= limit; n++) {
    if (!used.has(n)) return { eligible: true, foundingNumber: n };
  }
  return { eligible: false, foundingNumber: null };
}

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

    // メール重複チェック — 一意性は accounts 側が担保する。
    // artists.email は連絡先であり、同一アカウント配下では重複しうる。
    const loginEmail = normalizeEmail(email);
    const existing = await getAccountByEmail(loginEmail);
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

    // === Founding Artist 判定（20組限定 / 2026-06-30 締切）===
    const FOUNDING_LIMIT = 20;
    const FOUNDING_DEADLINE = new Date('2026-06-30T23:59:59+09:00');
    const adminDb = getServiceSupabase();

    const { eligible: isFoundingEligible, foundingNumber } =
      await pickFoundingSlot(adminDb, FOUNDING_LIMIT, FOUNDING_DEADLINE);

    // アカウントを先に作る。ここで作られる accounts 行がログインの実体で、
    // artists 行はその配下の1組目になる。
    let account;
    try {
      account = await createAccount({
        email: loginEmail,
        password_hash,
        email_verified: false,
        verification_token,
        verification_expires_at,
      });
    } catch (e) {
      // The duplicate check above can lose a race (a double-submitted form is
      // the common case). The unique index is the real guard; translate its
      // violation into the same 409 rather than a 500.
      if (/duplicate key|accounts_email/i.test(e?.message || '')) {
        return NextResponse.json({
          error: 'already_registered',
          message: 'This email is already registered. Please log in instead.\nこのメールアドレスは既に登録されています。ログインしてください。',
        }, { status: 409 });
      }
      throw e;
    }

    const insertData = {
      account_id: account.id,
      name,
      email: loginEmail,
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
      credits: signupGrant(isFoundingEligible),
      is_founding: isFoundingEligible,
      founding_number: foundingNumber,
      founding_show_on_lp: false,
    };

    // Direct insert (bypassing createArtist) so we can read raw error.code and
    // retry on the founding_number unique-violation if two signups race.
    let { data: artist, error: insertError } = await adminDb
      .from('artists')
      .insert(insertData)
      .select()
      .single();

    if (
      insertError &&
      insertError.code === '23505' &&
      typeof insertError.message === 'string' &&
      insertError.message.includes('founding_number')
    ) {
      console.warn('Founding number collision, retrying with a fresh slot...');
      const retrySlot = await pickFoundingSlot(adminDb, FOUNDING_LIMIT, FOUNDING_DEADLINE);
      insertData.is_founding = retrySlot.eligible;
      insertData.founding_number = retrySlot.foundingNumber;
      insertData.credits = signupGrant(retrySlot.eligible);

      const retry = await adminDb
        .from('artists')
        .insert(insertData)
        .select()
        .single();
      artist = retry.data;
      insertError = retry.error;
    }

    if (insertError || !artist) {
      console.error('Artist insert error:', insertError);
      // Roll the account back. Without this the email stays claimed by an
      // accounts row that owns no artist, and the user can neither sign up
      // again (409) nor log in (no artist to act as).
      const { error: rollbackError } = await adminDb
        .from('accounts')
        .delete()
        .eq('id', account.id);
      if (rollbackError) {
        console.error(
          '[artists] CRITICAL: orphan account left behind after a failed signup — this email cannot sign up again until the row is removed.',
          { account_id: account.id, email: loginEmail, error: rollbackError }
        );
      }
      return NextResponse.json(
        { error: insertError?.message || 'Failed to create artist' },
        { status: 500 }
      );
    }

    // Record the signup grant in the credit ledger. artist.credits is the value
    // the DB actually stored (the founding_number retry path can change it), so
    // reading it back keeps the ledger row and the balance in lockstep.
    //
    // Non-fatal by design: registration is the primary function, the ledger is
    // an audit record — never fail a signup because the audit write failed.
    // Supabase .insert() resolves even on RLS/FK/CHECK failures, so the error
    // field must be read explicitly; .catch() would swallow it silently.
    const { error: grantTxError } = await adminDb
      .from('credit_transactions')
      .insert({
        artist_id: artist.id,
        amount: artist.credits,
        type: 'initial_grant',
        description: 'Initial signup grant',
        metadata: {
          is_founding: artist.is_founding,
          founding_number: artist.founding_number,
        },
      });
    if (grantTxError) {
      console.error(
        '[artists] CRITICAL: initial_grant ledger write failed — balance is correct but the ledger is now short a row.',
        { artist_id: artist.id, email: artist.email, amount: artist.credits, error: grantTxError }
      );
    }

    // Send verification email instead of Welcome email
    const verifyUrl = `${APP_URL}/api/verify-email?token=${verification_token}&type=artist`;
    const verifyTo = testMode ? safeEmail : loginEmail;
    const foundingTag = artist.is_founding ? `Founding Artist #${artist.founding_number} — ` : '';
    const verifySubject = (testMode ? `[TEST] (→${email}) ` : '') +
      `${foundingTag}OTONAMIへようこそ — メールアドレスを認証してください / Verify your email`;

    const foundingBlockHtml = artist.is_founding ? `
            <div style="margin:20px 0 28px;padding:22px 18px;background:linear-gradient(135deg,#c4956a 0%,#b8854a 100%);border-radius:12px;text-align:center;color:#fff;">
              <div style="font-size:11px;letter-spacing:0.18em;font-weight:600;opacity:0.92;">◆ FOUNDING ARTIST</div>
              <div style="font-size:34px;font-weight:700;margin:6px 0;letter-spacing:-0.5px;">#${artist.founding_number}</div>
              <div style="font-size:13px;line-height:1.6;opacity:0.96;">
                20組限定の特別枠として認定されました。<br/>
                通常3クレジットのところ、<strong>10クレジット</strong>が付与されます。<br/>
                <span style="font-size:11px;opacity:0.88;">（メール認証完了後に利用できます）</span>
              </div>
            </div>` : '';
    const foundingBlockText = artist.is_founding
      ? `\n\n◆ Founding Artist #${artist.founding_number} として認定されました。\n20組限定の特別枠です。通常3クレジットのところ、10クレジットが付与されます（メール認証完了後に利用可能）。\n`
      : '';

    try {
      await resend.emails.send({
        from: FROM,
        to: verifyTo,
        reply_to: 'info@otonami.io',
        subject: verifySubject,
        html: `
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
            <h1 style="font-size:28px;text-align:center;color:#1a1a1a;margin-bottom:32px;">OTONAMI</h1>
            <h2 style="font-size:20px;color:#1a1a1a;margin-bottom:12px;">${name}さん、OTONAMIへの登録ありがとうございます。</h2>${foundingBlockHtml}
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
        text: `${name}さん、OTONAMIへの登録ありがとうございます。${foundingBlockText}\n\n以下のリンクをクリックしてメールアドレスを認証してください:\n${verifyUrl}\n\nこのリンクは24時間有効です。\n\n---\n\nHi ${name}, thank you for signing up for OTONAMI.\nPlease verify your email: ${verifyUrl}\n\nThis link expires in 24 hours.`,
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
                  <td style="padding:8px;">未認証</td></tr>
            </table>
            <p style="margin-top:24px;color:#888;font-size:13px;">
              Supabaseで確認:
              <a href="https://supabase.com/dashboard/project/jroudvjksouqnmlhzhzr/editor">テーブルを開く</a>
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

    // Pitches are fetched by artist_id, never by artist_email / artist_name.
    // Under a label account several artists share one contact address, so an
    // email match would pull a sibling artist's pitches into this dashboard,
    // and a name match would do the same for any two artists with equal names.
    // artist_id is set on every pitch row (verified: 180/180 at migration time)
    // and is what POST /api/pitches writes from the session.
    const supabase = getServiceSupabase();

    let pitchList = [];
    try {
      const r = await supabase
        .from('pitches')
        .select('*')
        .eq('artist_id', artist.id)
        .order('sent_at', { ascending: false, nullsFirst: false });
      if (r.error) console.error('Pitch query (artist_id) error:', r.error);
      else pitchList = r.data || [];
    } catch (e) { console.error('Pitch query (artist_id) exception:', e); }

    pitchList.sort((a, b) => new Date(b.sent_at || b.created_at || 0) - new Date(a.sent_at || a.created_at || 0));
    const pitchStats = {
      total_sent: pitchList.length,
      responded: pitchList.filter(p => p.feedback_message || p.status === 'feedback' || p.status === 'interested' || p.status === 'accepted' || p.status === 'declined').length,
      interested: pitchList.filter(p => p.status === 'interested' || p.status === 'accepted').length,
      opened: pitchList.filter(p => ['opened', 'listened', 'feedback', 'interested', 'accepted'].includes(p.status)).length,
      listened: pitchList.filter(p => ['listened', 'feedback', 'interested', 'accepted'].includes(p.status)).length,
    };

    // The artist switcher needs every artist on this account, so the dashboard
    // can render the list without a second round trip on first paint.
    // The artist row is already loaded, so read account_id off it rather than
    // paying for resolveAccountId's extra lookup on legacy tokens.
    const accountId = payload.accountId || artist.account_id || null;
    const siblings = accountId ? await getArtistsByAccountId(accountId) : [artist];

    const { password_hash, ...safeArtist } = artist;
    return NextResponse.json({
      artist: { ...safeArtist, tracks },
      account: accountId ? { id: accountId, email: payload.email || artist.email } : null,
      artists: siblings.map((a) => ({
        id: a.id,
        name: a.name,
        avatar_url: a.avatar_url,
        credits: a.credits,
        is_active: a.id === artist.id,
      })),
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
      // Pitch-form self-intro fields, persisted so the next pitch prefills them
      // (last-used-wins; written by /api/pitch on successful generation). These
      // are distinct from `bio`, which stays reserved for the EPK fallback.
      'achievements', 'description',
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
