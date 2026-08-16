'use client';
import { useState, useEffect } from 'react';
import { DT as D } from '@/lib/design-tokens';
import { COPY } from '@/components/savannah-copy';

/**
 * /savannah — MBT presents: Savannah Showcase 2027 の応募中継ページ。
 * SavannahBanner から遷移し、募集要項の要点を読んでから応募フォームへ進む導線。
 *
 * 締切（JST 2026-10-15 23:59:59）は SavannahBanner.jsx と同じ判定。
 * 締切後もページ自体は残し、応募期間行と CTA だけを隠して終了表示に切り替える
 * （MBT 紹介と公式 Instagram への導線は失効後も表示したまま）。
 */
const DEADLINE = Date.parse('2026-10-15T23:59:59+09:00');

const FORM_URL = 'https://forms.gle/VS7D1bcoAbZ4vAb36';
const MBT_INSTAGRAM_URL = 'https://www.instagram.com/p/DcAf7sKDdMV/';

export default function SavannahPageClient() {
  const [lang, setLang] = useState('ja');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('otonami_locale');
      if (saved === 'ja' || saved === 'en') { setLang(saved); return; }
      setLang(navigator.language?.startsWith('ja') ? 'ja' : 'en');
    } catch {}
  }, []);

  const switchLang = (l) => { setLang(l); try { localStorage.setItem('otonami_locale', l); } catch {} };

  const t = COPY[lang];
  const isExpired = Date.now() > DEADLINE;

  const langBtn = (l, label) => (
    <button
      type="button"
      onClick={() => switchLang(l)}
      style={{
        fontFamily: D.fBody, fontSize: 13, fontWeight: 600, padding: '7px 15px',
        borderRadius: 9999, border: 'none', cursor: 'pointer',
        background: lang === l ? '#fff' : 'transparent',
        color: lang === l ? '#1a1a1a' : 'rgba(255,255,255,0.6)',
        transition: 'all 0.2s ease',
      }}
    >
      {label}
    </button>
  );

  return (
    <main className="sv-page">
      {/* ── Top bar ── */}
      <header className="sv-top">
        <div className="sv-top__inner">
          <a href="/" className="sv-logo">
            <svg width="30" height="30" viewBox="0 0 40 40" style={{ flexShrink: 0 }} aria-hidden="true"><circle cx="20" cy="20" r="16" fill="none" stroke="#FF6B4A" strokeWidth="5"/><g style={{ clipPath: 'circle(32.5% at 50% 50%)' }} fill="#FF6B4A"><rect x="8" y="17" width="2" height="6" rx="1"/><rect x="12" y="14" width="2" height="12" rx="1"/><rect x="16" y="11" width="2" height="18" rx="1"/><rect x="20" y="8" width="2" height="24" rx="1"/><rect x="24" y="11" width="2" height="18" rx="1"/><rect x="28" y="14" width="2" height="12" rx="1"/><rect x="32" y="17" width="2" height="6" rx="1"/></g></svg>
            <span className="sv-logo__text">OTONAMI</span>
          </a>
          <div className="sv-lang">
            {langBtn('en', 'EN')}
            {langBtn('ja', 'JP')}
          </div>
        </div>
      </header>

      <div className="sv-wrap">
        {/* ── Hero ── */}
        <section className="sv-hero">
          <span className="sv-eyebrow">{t.eyebrow}</span>
          <h1 className="sv-h1">{t.h1}</h1>
          <p className="sv-sub">{t.sub}</p>
          {isExpired && <p className="sv-closed">{t.closed}</p>}
        </section>

        {/* ── About MBT ── */}
        <section className="sv-section">
          <h2 className="sv-h2">{t.aboutTitle}</h2>
          {t.aboutBody.map((p, i) => (
            <p key={i} className="sv-p">{p}</p>
          ))}
        </section>

        {/* ── Details ── */}
        <section className="sv-section">
          <h2 className="sv-h2">{t.detailsTitle}</h2>
          <dl className="sv-rows">
            {t.rows.map((row) => (
              <div key={row.label} className="sv-row">
                <dt className="sv-row__label">{row.label}</dt>
                <dd className="sv-row__value">
                  {row.value.length === 1 ? (
                    <span>{row.value[0]}</span>
                  ) : (
                    <ul className="sv-list">
                      {row.value.map((v) => <li key={v}>{v}</li>)}
                    </ul>
                  )}
                </dd>
              </div>
            ))}
            {!isExpired && (
              <div className="sv-row">
                <dt className="sv-row__label">{t.periodLabel}</dt>
                <dd className="sv-row__value"><span>{t.periodValue}</span></dd>
              </div>
            )}
          </dl>
          <p className="sv-note">{t.resultNote}</p>
        </section>

        {/* ── Official info ── */}
        <section className="sv-section">
          <h2 className="sv-h2">{t.officialTitle}</h2>
          <p className="sv-p">{t.officialBody}</p>
          <a className="sv-link" href={MBT_INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
            {t.officialLink} →
          </a>
        </section>

        {/* ── CTA ── */}
        {!isExpired && (
          <section className="sv-cta-block">
            <p className="sv-cta-note">{t.ctaNote}</p>
            <a className="sv-cta" href={FORM_URL} target="_blank" rel="noopener noreferrer">
              {t.cta} →
            </a>
          </section>
        )}

        <p className="sv-role">{t.role}</p>
        <a href="/" className="sv-back">{t.back}</a>
      </div>

      {/* 文字列内のクォートが SSR でエスケープされ hydration mismatch になるため、
          CSS は dangerouslySetInnerHTML で流し込む（LegalPageLayout と同じ方式）。 */}
      <style dangerouslySetInnerHTML={{ __html: `
        .sv-page {
          min-height: 100vh;
          background: ${D.bg};
          color: ${D.text};
          font-family: ${D.fBody};
        }
        .sv-top {
          border-bottom: 1px solid ${D.border};
          background: rgba(26, 26, 26, 0.9);
        }
        .sv-top__inner {
          max-width: 820px;
          margin: 0 auto;
          padding: 12px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .sv-logo { display: flex; align-items: center; gap: 8px; text-decoration: none; }
        .sv-logo__text {
          font-family: 'Sora', sans-serif;
          font-weight: 700;
          font-size: 17px;
          letter-spacing: 3px;
          color: #ffffff;
        }
        .sv-lang {
          display: flex;
          background: rgba(255,255,255,0.08);
          border-radius: 9999px;
          padding: 3px;
          gap: 2px;
        }

        .sv-wrap { max-width: 820px; margin: 0 auto; padding: 44px 20px 96px; }

        .sv-hero { margin-bottom: 44px; }
        .sv-eyebrow {
          display: inline-block;
          padding: 6px 14px;
          border-radius: 9999px;
          background: ${D.accentLight};
          border: 1px solid ${D.accentBorder};
          color: ${D.accent};
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          margin-bottom: 20px;
        }
        .sv-h1 {
          font-family: ${D.fHead};
          font-size: 32px;
          font-weight: 500;
          line-height: 1.35;
          letter-spacing: -0.01em;
          margin: 0 0 16px;
          color: ${D.text};
        }
        .sv-sub {
          margin: 0;
          font-size: 15px;
          line-height: 1.75;
          color: ${D.textSec};
        }
        .sv-closed {
          margin: 20px 0 0;
          padding: 12px 16px;
          border-radius: ${D.radiusSm};
          background: rgba(255,255,255,0.05);
          border: 1px solid ${D.borderStrong};
          font-size: 14px;
          font-weight: 600;
          color: ${D.text};
        }

        .sv-section {
          padding: 28px 0;
          border-top: 1px solid ${D.border};
        }
        .sv-h2 {
          font-family: 'Sora', sans-serif;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.01em;
          margin: 0 0 16px;
          color: ${D.text};
        }
        .sv-p {
          margin: 0 0 14px;
          font-size: 15px;
          line-height: 1.9;
          color: ${D.textSec};
        }
        .sv-p:last-child { margin-bottom: 0; }

        .sv-rows { margin: 0; }
        .sv-row {
          display: grid;
          grid-template-columns: 150px 1fr;
          gap: 16px;
          padding: 14px 0;
          border-bottom: 1px solid ${D.border};
        }
        .sv-row:first-child { padding-top: 0; }
        .sv-row:last-child { border-bottom: none; }
        .sv-row__label {
          margin: 0;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: ${D.accent};
          line-height: 1.7;
        }
        .sv-row__value {
          margin: 0;
          font-size: 15px;
          line-height: 1.8;
          color: ${D.text};
        }
        .sv-list { margin: 0; padding-left: 18px; }
        .sv-list li { margin: 0 0 4px; }
        .sv-list li:last-child { margin-bottom: 0; }

        .sv-note {
          margin: 18px 0 0;
          font-size: 13px;
          line-height: 1.8;
          color: ${D.textMuted};
        }

        .sv-link {
          display: inline-block;
          margin-top: 4px;
          font-size: 15px;
          font-weight: 600;
          color: ${D.accent};
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .sv-link:hover { opacity: 0.78; }

        .sv-cta-block {
          margin-top: 36px;
          padding: 32px 24px;
          border: 1px solid ${D.accentBorder};
          border-radius: ${D.radius};
          background: ${D.surface};
          text-align: center;
        }
        .sv-cta-note {
          margin: 0 0 14px;
          font-size: 13px;
          color: ${D.textMuted};
        }
        .sv-cta {
          display: inline-block;
          box-sizing: border-box;
          padding: 15px 34px;
          border-radius: 9999px;
          background: ${D.cta};
          color: #ffffff;
          font-size: 16px;
          font-weight: 700;
          text-decoration: none;
          box-shadow: 0 4px 20px rgba(232, 93, 58, 0.28);
          transition: background 0.2s ease, transform 0.2s ease;
        }
        .sv-cta:hover { background: ${D.ctaHover}; transform: translateY(-1px); }

        .sv-role {
          margin: 36px 0 0;
          font-size: 12.5px;
          line-height: 1.8;
          color: ${D.textMuted};
        }
        .sv-back {
          display: inline-block;
          margin-top: 24px;
          font-size: 14px;
          color: ${D.textSec};
          text-decoration: none;
        }
        .sv-back:hover { color: ${D.text}; }

        @media (max-width: 640px) {
          .sv-wrap { padding: 32px 18px 72px; }
          .sv-h1 { font-size: 25px; line-height: 1.4; }
          .sv-sub { font-size: 14px; }
          .sv-row { grid-template-columns: 1fr; gap: 6px; }
          .sv-cta-block { padding: 26px 18px; }
          .sv-cta { width: 100%; padding: 15px 20px; font-size: 15px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .sv-cta { transition: none; }
          .sv-cta:hover { transform: none; }
        }
      ` }} />
    </main>
  );
}
