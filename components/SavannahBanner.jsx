'use client';

/**
 * 期間限定の公募告知バー（MBT presents: Savannah）。
 * 締切（JST 2026-10-15 23:59:59）を過ぎたら自動で消えるので撤去作業は不要。
 * LP は ISR（1時間）なので、締切後は最初の再生成タイミングで消える（最大1時間の誤差は許容）。
 */
const DEADLINE = Date.parse('2026-10-15T23:59:59+09:00');

/* 応募フォームには直リンクせず、募集要項をまとめた中継ページ /savannah を経由させる。 */
const DETAIL_URL = '/savannah';

const COPY = {
  ja: {
    text: '公募受付中: MBT presents: Savannah — 日本を拠点に活動するアーティスト1組を選抜（締切 10/15）',
    cta: '詳細・応募 →',
    label: '公募のお知らせ',
  },
  en: {
    text: 'Open call: MBT presents: Savannah — one Japan-based artist will be selected (deadline Oct 15)',
    cta: 'Apply →',
    label: 'Open call announcement',
  },
};

export default function SavannahBanner({ lang = 'ja' }) {
  if (Date.now() > DEADLINE) return null;

  const t = COPY[lang === 'en' ? 'en' : 'ja'];

  return (
    <div className="sv-banner" role="region" aria-label={t.label}>
      <div className="sv-banner__inner">
        <span className="sv-banner__text">{t.text}</span>
        <a className="sv-banner__cta" href={DETAIL_URL}>
          {t.cta}
        </a>
      </div>

      {/* CSS 内のクォートが SSR で &#x27; にエスケープされ hydration mismatch になるため、
          dangerouslySetInnerHTML で流し込む（LegalPageLayout / SavannahPageClient と同じ方式）。 */}
      <style dangerouslySetInnerHTML={{ __html: `
        .sv-banner {
          background: #FBF3E7;
          border-bottom: 1px solid rgba(196, 149, 106, 0.38);
          font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        /* Inline flow (not flex) so the CTA can sit on the same line as the end of
           the notice text instead of being pushed onto a line of its own. */
        .sv-banner__inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 9px 24px;
          text-align: center;
        }
        .sv-banner__text {
          font-size: 13px;
          font-weight: 500;
          line-height: 1.5;
          color: #1a1a1a;
          letter-spacing: 0.01em;
        }
        .sv-banner__cta {
          margin-left: 12px;
          font-size: 13px;
          font-weight: 700;
          line-height: 1.5;
          color: #c23f24;
          text-decoration: underline;
          text-underline-offset: 2px;
          white-space: nowrap;
        }
        .sv-banner__cta:hover { opacity: 0.75; }
        @media (max-width: 768px) {
          .sv-banner__inner { padding: 8px 16px; text-align: left; }
          .sv-banner__text { font-size: 12px; line-height: 1.45; }
          .sv-banner__cta { font-size: 12px; line-height: 1.45; margin-left: 8px; }
        }
      ` }} />
    </div>
  );
}
