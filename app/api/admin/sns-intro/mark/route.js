// app/api/admin/sns-intro/mark/route.js
// SNS自動紹介 Phase 2b-1: 下書きメールの「投稿済みにする」リンク用ワンタップ確定エンドポイント。
// GET /api/admin/sns-intro/mark?curator=<id>&token=<token>          → introduced_at を確定
// GET /api/admin/sns-intro/mark?curator=<id>&token=<token>&undo=1   → 確定を取り消し（誤タップ救済）
// 認証は token 自体（64桁ランダム hex）が担う。Bearer 不要。

import { markCuratorIntroduced, undoCuratorIntroduced } from '@/lib/db';
import { escapeHtml } from '@/lib/html-escape';

export const dynamic = 'force-dynamic';

function page(title, bodyHtml, status = 200) {
  const html = `<!DOCTYPE html><html lang="ja"><head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)} — OTONAMI</title>
  </head>
  <body style="margin:0;padding:0;background:#f0ede6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:48px 16px;"><tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border:1px solid #e8e6e0;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:18px 24px;border-bottom:1px solid #e8e6e0;">
          <span style="color:#c4956a;">◆</span>
          <span style="font-size:12px;letter-spacing:0.15em;font-weight:600;margin-left:6px;color:#1a1612;">OTONAMI — SNS紹介</span>
        </td></tr>
        <tr><td style="padding:32px 24px;">${bodyHtml}</td></tr>
      </table>
    </td></tr></table>
  </body></html>`;
  return new Response(html, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

async function handle(request) {
  const { searchParams } = new URL(request.url);
  const curatorId = searchParams.get('curator');
  const token = searchParams.get('token');
  const isUndo = searchParams.get('undo') === '1';

  if (!curatorId || !token) {
    return page(
      '無効なリンク',
      `<p style="margin:0;font-size:16px;line-height:1.7;color:#1a1612;">無効なリンクです。下書きメール内のリンクをそのままお使いください。</p>`,
      400
    );
  }

  try {
    if (isUndo) {
      const res = await undoCuratorIntroduced(curatorId, token);
      if (!res.ok) {
        return page(
          '取り消しできません',
          `<p style="margin:0;font-size:16px;line-height:1.7;color:#1a1612;">取り消しできませんでした。すでに取り消し済みか、リンクが無効です。</p>`,
          400
        );
      }
      // 取り消し成功 → token は再アーム済み。再度「投稿済みにする」できるリンクを提示。
      const markUrl = `/api/admin/sns-intro/mark?curator=${encodeURIComponent(
        curatorId
      )}&token=${encodeURIComponent(token)}`;
      return page(
        '取り消しました',
        `<p style="margin:0 0 6px;font-size:13px;color:#6b665d;">取り消し完了</p>
         <p style="margin:0 0 18px;font-size:20px;font-weight:600;color:#1a1612;">${escapeHtml(
           res.curator.name
         )} を未掲載に戻しました。</p>
         <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#6b665d;">次回の紹介対象に戻ります。改めて掲載済みにする場合は下のリンクをタップしてください。</p>
         <a href="${escapeHtml(markUrl)}" style="display:inline-block;background:#c4956a;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 22px;border-radius:8px;">投稿済みにする</a>`
      );
    }

    const res = await markCuratorIntroduced(curatorId, token);
    if (!res.ok) {
      return page(
        '無効なリンク',
        `<p style="margin:0;font-size:16px;line-height:1.7;color:#1a1612;">無効なリンクです。リンクの有効期限が切れているか、すでに別の操作が行われています。</p>`,
        400
      );
    }
    // 確定成功（または冪等な再タップ）。誤タップ救済の「取り消す」リンクを同 token で提示。
    const undoUrl = `/api/admin/sns-intro/mark?curator=${encodeURIComponent(
      curatorId
    )}&token=${encodeURIComponent(token)}&undo=1`;
    const lead = res.already ? 'この紹介はすでに掲載済みです。' : `${res.curator.name} を掲載済みにしました。`;
    return page(
      '掲載済みにしました',
      `<p style="margin:0 0 6px;font-size:13px;color:#6b665d;">確定完了</p>
       <p style="margin:0 0 18px;font-size:20px;font-weight:600;color:#1a1612;">${escapeHtml(
         lead
       )}</p>
       <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#6b665d;">次回の紹介対象から自動で外れます。</p>
       <a href="${escapeHtml(undoUrl)}" style="font-size:13px;color:#9b9590;text-decoration:underline;">取り消す</a>`
    );
  } catch (e) {
    console.error('SNS intro mark error:', e);
    return page(
      'エラー',
      `<p style="margin:0;font-size:16px;line-height:1.7;color:#1a1612;">処理中にエラーが発生しました。時間をおいて再度お試しください。</p>`,
      500
    );
  }
}

export async function GET(request) {
  return handle(request);
}
