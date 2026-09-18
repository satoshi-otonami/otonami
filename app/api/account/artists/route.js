import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { verifyToken, signArtistSession } from '@/lib/auth';
import { Resend } from 'resend';
import {
  getAccountById,
  getArtistsByAccountId,
  countArtistsByAccountId,
  resolveAccountId,
  normalizeEmail,
  MAX_ARTISTS_PER_ACCOUNT,
} from '@/lib/db';

const resend = new Resend(process.env.RESEND_API_KEY || 'placeholder');
const FROM = `OTONAMI <${process.env.EMAIL_FROM || 'info@otonami.io'}>`;
const testMode = process.env.EMAIL_TEST_MODE === 'true';
const safeEmail = process.env.EMAIL_TEST_REDIRECT || 'satoshiy339@gmail.com';

// Fields an account owner may set on a new artist. Deliberately the same shape
// PATCH /api/artists allows, minus anything that grants value (credits,
// is_founding, founding_number) or identity (account_id, password_hash).
const ALLOWED = [
  'artist_type', 'bio', 'hot_news', 'avatar_url', 'cover_url',
  'region', 'label_name', 'genres', 'moods', 'influences',
  'spotify_url', 'youtube_url', 'instagram_url',
  'twitter_url', 'facebook_url', 'website_url',
];

async function requireAccount(request) {
  const payload = await verifyToken(request);
  if (!payload || payload.role !== 'artist') return { error: 'Unauthorized', status: 401 };
  const accountId = await resolveAccountId(payload);
  if (!accountId) return { error: 'Unauthorized', status: 401 };
  return { payload, accountId };
}

// GET /api/account/artists — このアカウント配下のアーティスト一覧
export async function GET(request) {
  try {
    const auth = await requireAccount(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const artists = await getArtistsByAccountId(auth.accountId);
    return NextResponse.json({
      artists: artists.map((a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        avatar_url: a.avatar_url,
        credits: a.credits,
        created_at: a.created_at,
        is_active: a.id === auth.payload.artistId,
      })),
      active_artist_id: auth.payload.artistId,
      max_artists: MAX_ARTISTS_PER_ACCOUNT,
    });
  } catch (e) {
    console.error('Account artists GET error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/account/artists — ログイン済みアカウントにアーティストを追加
export async function POST(request) {
  try {
    const auth = await requireAccount(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const account = await getAccountById(auth.accountId);
    if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'アーティスト名を入力してください' }, { status: 400 });
    }

    const current = await countArtistsByAccountId(auth.accountId);
    if (current >= MAX_ARTISTS_PER_ACCOUNT) {
      return NextResponse.json({
        error: 'limit_reached',
        message: `1アカウントで管理できるアーティストは${MAX_ARTISTS_PER_ACCOUNT}組までです。追加が必要な場合は info@otonami.io までご連絡ください。`,
      }, { status: 409 });
    }

    // Contact address: per-artist override, falling back to the account's.
    // This is a notification destination only — it is not an identity, so it
    // may repeat across artists on the same account.
    const contactEmail = body.email ? normalizeEmail(body.email) : normalizeEmail(account.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return NextResponse.json({ error: '連絡先メールアドレスの形式が正しくありません' }, { status: 400 });
    }

    const insertData = {
      account_id: auth.accountId,
      name,
      email: contactEmail,
      // Credentials live on the account. artists.password_hash is legacy and
      // NOT NULL, so mirror the account's hash rather than inventing one —
      // nothing authenticates against this column any more.
      password_hash: account.password_hash,
      // The account already proved control of its inbox; an added artist does
      // not re-run verification.
      email_verified: true,
      verification_token: null,
      verification_expires_at: null,
      // 山下さん決定 2026-09-16: 初回クレジットの自動付与は親アカウント作成時の
      // 1組目のみ。追加アーティストは0クレジットで始まり、レーベル向けの付与は
      // 手動で個別対応する。Founding 枠も同じ理由で対象外（締切も経過済み）。
      credits: 0,
      is_founding: false,
      founding_number: null,
      founding_show_on_lp: false,
      artist_type: body.artist_type || 'solo',
      region: body.region || 'JP',
      genres: body.genres || [],
      moods: body.moods || [],
      influences: body.influences || [],
    };
    for (const key of ALLOWED) {
      if (body[key] !== undefined) insertData[key] = body[key];
    }

    const db = getServiceSupabase();
    const { data: artist, error } = await db
      .from('artists')
      .insert(insertData)
      .select()
      .single();

    if (error || !artist) {
      console.error('Add artist insert error:', error);
      return NextResponse.json(
        { error: error?.message || 'Failed to create artist' },
        { status: 500 }
      );
    }

    // Ledger row for the zero grant, so the balance history of an added artist
    // starts explicitly at 0 rather than with a gap. Non-fatal by design, the
    // same as the signup grant write.
    const { error: txError } = await db.from('credit_transactions').insert({
      artist_id: artist.id,
      amount: 0,
      type: 'initial_grant',
      description: 'Added to existing account — no signup grant',
      metadata: { account_id: auth.accountId, added_by_artist_id: auth.payload.artistId },
    });
    if (txError) {
      console.warn('[account/artists] initial_grant ledger write failed (non-fatal):', txError.message);
    }

    // Admin notification. Signup (POST /api/artists) has always sent one; this
    // route never did, so the 蜷川べに row added on 9/17 went unnoticed and its
    // credits were not granted until the next day. Added artists start at 0 by
    // design, which only works if someone is told they exist — hence the
    // subject says "レーベル" and the body states the balance outright.
    // Non-fatal, like every other notification: a Resend outage must not cost
    // the account owner the artist they just created.
    try {
      const subject = (testMode ? '[TEST] ' : '') +
        `【OTONAMI】アーティスト追加（レーベル）: ${name}`;
      const rows = [
        ['アーティスト名', name],
        ['連絡先メール', contactEmail],
        ['アカウント', account.email],
        ['account_id', auth.accountId],
        ['artist_id', artist.id],
        ['クレジット', '0（付与なし — 必要なら手動で付与してください）'],
        ['このアカウントのアーティスト数', `${current + 1} / ${MAX_ARTISTS_PER_ACCOUNT}`],
      ];
      await resend.emails.send({
        from: FROM,
        to: testMode ? safeEmail : 'info@otonami.io',
        reply_to: 'info@otonami.io',
        subject,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:#c4956a;">アーティスト追加通知（レーベルアカウント経由）</h2>
            <p style="color:#666;font-size:13px;">既存アカウント配下への追加です。新規サインアップではありません。</p>
            <table style="width:100%;border-collapse:collapse;">
              ${rows.map(([k, v], i) => `
              <tr${i % 2 ? ' style="background:#f9f9f9;"' : ''}>
                  <td style="padding:8px;color:#666;width:200px;">${k}</td>
                  <td style="padding:8px;">${v}</td></tr>`).join('')}
            </table>
            <p style="margin-top:24px;color:#888;font-size:13px;">
              Supabaseで確認:
              <a href="https://supabase.com/dashboard/project/jroudvjksouqnmlhzhzr/editor">テーブルを開く</a>
            </p>
          </div>
        `,
        text: `アーティスト追加（レーベルアカウント経由）\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}`,
      });
    } catch (e) {
      console.error('[account/artists] admin notification failed (non-fatal):', e);
    }

    // Switch the session to the artist that was just created — the UI lands on
    // the new artist's dashboard, which is what "add an artist" implies.
    const token = await signArtistSession({
      accountId: auth.accountId,
      artistId: artist.id,
      email: account.email,
    });

    const { password_hash, verification_token, ...safeArtist } = artist;
    return NextResponse.json({ success: true, artist: safeArtist, token });
  } catch (e) {
    console.error('Account artists POST error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
