// app/api/admin/sns-intro/route.js
// SNS自動キュレーター紹介 Phase 2a: 手動トリガー。
// pick → 5媒体キャプション生成 → 下書きメールを山下さん宛に送信。
// この時点では introduced_at を更新しない（実投稿後にPhase 2bでワンタップ確定）。

import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { pickUnintroducedCurator, setIntroMarkToken } from '@/lib/db';
import { generateSnsIntroCaptions } from '@/lib/sns-intro-caption';
import { escapeHtml } from '@/lib/html-escape';

export const dynamic = 'force-dynamic';

const resend = new Resend(process.env.RESEND_API_KEY || 'placeholder');
const FROM = `OTONAMI <${process.env.EMAIL_FROM || 'info@otonami.io'}>`;
// 確定リンクの基底URL。末尾の改行/スラッシュ事故を防ぐため trim+strip（env未設定なら本番固定）。
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://otonami.io')
  .trim()
  .replace(/\/+$/, '');
// 下書きメールの宛先（山下さん受信用）。1箇所に集約。
const DRAFT_TO =
  process.env.SNS_INTRO_DRAFT_TO ||
  process.env.EMAIL_TEST_REDIRECT ||
  'satoshiy339@gmail.com';

const PLATFORM_LABELS = {
  x: 'X (Twitter)',
  instagram: 'Instagram',
  threads: 'Threads',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
};
const ORDER = ['x', 'instagram', 'threads', 'facebook', 'linkedin'];

function buildDraftEmail(curator, captions, audit, markUrl) {
  const sections = ORDER.map((k) => {
    const label = PLATFORM_LABELS[k];
    const body = escapeHtml(captions[k] || '(なし)').replace(/\n/g, '<br>');
    return `
      <div style="margin:0 0 22px;">
        <div style="font-size:12px;letter-spacing:0.1em;color:#6b665d;text-transform:uppercase;margin:0 0 6px;">${label}</div>
        <div style="white-space:pre-wrap;font-size:15px;line-height:1.7;color:#1a1612;background:#f9f7f2;border:1px solid #e8e6e0;border-radius:8px;padding:14px 16px;">${body}</div>
      </div>`;
  }).join('');

  const html = `<!DOCTYPE html><html lang="ja"><body style="margin:0;padding:0;background:#f0ede6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 16px;"><tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#fff;border:1px solid #e8e6e0;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:18px 24px;border-bottom:1px solid #e8e6e0;">
          <span style="color:#c4956a;">◆</span>
          <span style="font-size:12px;letter-spacing:0.15em;font-weight:600;margin-left:6px;">OTONAMI — SNS紹介 下書き</span>
        </td></tr>
        <tr><td style="padding:24px;">
          <p style="margin:0 0 6px;font-size:13px;color:#6b665d;">紹介対象キュレーター</p>
          <p style="margin:0 0 4px;font-size:20px;font-weight:600;color:#1a1612;">${escapeHtml(curator.name)}</p>
          <p style="margin:0 0 18px;font-size:13px;color:#6b665d;">
            ${escapeHtml(curator.platform || '-')}${curator.region ? ' / ' + escapeHtml(curator.region) : ''}${curator.type ? ' / ' + escapeHtml(curator.type) : ''}
          </p>
          <p style="margin:0 0 18px;font-size:12px;color:#9b9590;">そのままコピペして各SNSに貼ってください。ハッシュタグ総数: ${audit.hashtagCount} / 絵文字: ${audit.hasEmoji ? 'あり(要確認)' : 'なし'}</p>
          ${sections}
          <div style="margin:8px 0 0;padding:18px;background:#f9f7f2;border:1px solid #e8e6e0;border-radius:8px;">
            <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#1a1612;">この内容で各SNSに投稿したら、次のリンクをタップして掲載済みにしてください（次回の紹介対象から自動で外れます）。</p>
            <a href="${escapeHtml(markUrl)}" style="display:inline-block;background:#c4956a;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 22px;border-radius:8px;">投稿済みにする</a>
          </div>
          <p style="margin:18px 0 0;font-size:12px;color:#9b9590;">※ 投稿済みフラグ(introduced_at)はまだ更新していません。上のリンクをタップした時点で確定します（誤タップは確定画面の「取り消す」で戻せます）。</p>
        </td></tr>
      </table>
    </td></tr></table>
  </body></html>`;

  const text = [
    `OTONAMI — SNS紹介 下書き`,
    ``,
    `紹介対象: ${curator.name}`,
    `媒体/地域/種別: ${curator.platform || '-'} / ${curator.region || '-'} / ${curator.type || '-'}`,
    `ハッシュタグ総数: ${audit.hashtagCount} / 絵文字: ${audit.hasEmoji ? 'あり' : 'なし'}`,
    ``,
    ...ORDER.flatMap((k) => [`■ ${PLATFORM_LABELS[k]}`, captions[k] || '(なし)', '']),
    `各SNSに投稿したら、次のリンクをタップして掲載済みにしてください（次回の紹介対象から外れます）:`,
    markUrl,
    ``,
    `※ introduced_at は上のリンクをタップした時点で確定します（誤タップは確定画面の「取り消す」で戻せます）。`,
  ].join('\n');

  return { html, text };
}

async function handle(request) {
  // 認証: CRON_SECRET（管理用Bearer）。未設定なら誤ってオープンにしないよう拒否。
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured on the server' },
      { status: 503 }
    );
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1) pick
    const curator = await pickUnintroducedCurator();
    if (!curator) {
      return NextResponse.json({
        ok: true,
        picked: null,
        message: '未紹介の対象が0件です（introduced_at IS NULL かつ opt_out=false のキュレーターがいません）。',
      });
    }

    // 2) キャプション生成
    const { captions, audit } = await generateSnsIntroCaptions(curator);

    // 2.5) ワンタップ確定トークンを発行・保存（pick毎に上書き＝古い下書きリンクは無効化）。
    const markToken = crypto.randomBytes(32).toString('hex'); // 64 hex chars
    await setIntroMarkToken(curator.id, markToken);
    const markUrl = `${APP_URL}/api/admin/sns-intro/mark?curator=${encodeURIComponent(
      curator.id
    )}&token=${markToken}`;

    // 3) 下書きメール送信（Resend。SDKは4xxでthrowしないので result.error を明示チェック）
    const { html, text } = buildDraftEmail(curator, captions, audit, markUrl);
    const subject = `[OTONAMI SNS下書き] 新規キュレーター紹介: ${curator.name}`;
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [DRAFT_TO],
      reply_to: 'info@otonami.io',
      subject,
      html,
      text,
      headers: { 'List-Unsubscribe': '<mailto:info@otonami.io?subject=unsubscribe>' },
    });

    if (error) {
      console.error('SNS intro draft: Resend returned error:', JSON.stringify(error));
      return NextResponse.json(
        { ok: false, curator, captions, audit, emailError: error.message || error },
        { status: 502 }
      );
    }

    console.log('SNS intro draft sent for', curator.name, 'id=', data?.id);
    return NextResponse.json({
      ok: true,
      curator,
      captions,
      audit,            // { hasEmoji, hashtagCount, hashtags }
      emailId: data?.id || null,
      draftTo: DRAFT_TO,
      note: 'introduced_at is intentionally not updated in Phase 2a.',
    });
  } catch (e) {
    console.error('SNS intro error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  return handle(request);
}

// curlの利便性のためGETでも同じ処理を許可（認証は同一）。
export async function GET(request) {
  return handle(request);
}
