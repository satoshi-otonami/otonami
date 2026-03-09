'use client';
import { useState, useEffect } from 'react';
import { T } from '@/lib/design-tokens';

/* ── i18n copy ── */
const COPY = {
  en: {
    navHow: 'How It Works', navCurators: 'Find Curators', navArtists: 'For Artists',
    navCta: 'Join as Curator',
    heroTag: '♪ Curator Network — AI-Powered Matching',
    heroH1a: "Japan's indie music,", heroH1b: 'to the world's curators',
    heroSub: "OTONAMI connects handpicked Japanese indie artists with curators worldwide. Get paid to review. No spam — only quality pitches matched to your taste.",
    ctaPrimary: 'Join as Curator →', ctaGhost: 'See How It Works',
    stat1n: '3,449', stat1l: 'Curators & Pros',
    stat2n: '70+',   stat2l: 'Japanese Labels',
    stat3n: '93%',   stat3l: 'Response Rate',
    stat4n: '10yr',  stat4l: 'SXSW Track Record',
    howTitle: 'How OTONAMI Works',
    step1ic: '🎵', step1s: '01', step1t: 'Submit Your Track',
    step1d: 'Add your Spotify or YouTube link. Our AI analyzes your sound profile and generates an English pitch automatically.',
    step2ic: '🎯', step2s: '02', step2t: 'Find Matching Curators',
    step2d: 'Browse 3,400+ curators with AI match scores. Filter by genre, country, and type to find your perfect fit.',
    step3ic: '💬', step3s: '03', step3t: 'Get Real Feedback',
    step3d: 'Curators listen and respond within 7 days. Get playlist placements, blog features, or constructive feedback.',
    ctaBannerTitle: 'Ready to reach the world?',
    ctaBannerSub: 'Join 70+ Japanese labels already using OTONAMI',
    ctaBannerBtn: 'Start Your First Pitch →',
    footerCopy: 'OTONAMI — Connecting Japanese Music to the World',
    footerBy: 'TYCompany LLC / ILCJ',
  },
  ja: {
    navHow: '使い方', navCurators: 'キュレーターを探す', navArtists: 'アーティストの方',
    navCta: 'キュレーター登録',
    heroTag: '♪ キュレーターネットワーク — AIマッチング搭載',
    heroH1a: '日本のインディー音楽を、', heroH1b: '世界のキュレーターへ',
    heroSub: 'OTONAMIは厳選された日本のインディーアーティストとキュレーターをつなぎます。レビューで報酬を獲得。スパムなし — あなたの好みにマッチした楽曲だけが届きます。',
    ctaPrimary: 'キュレーターとして参加 →', ctaGhost: '使い方を見る',
    stat1n: '3,449', stat1l: 'Curators & Pros',
    stat2n: '70+',   stat2l: '加盟レーベル',
    stat3n: '93%',   stat3l: '回答率',
    stat4n: '10yr',  stat4l: 'SXSW 連続出演',
    howTitle: 'How OTONAMI Works',
    step1ic: '🎵', step1s: '01', step1t: '楽曲を送信',
    step1d: 'SpotifyまたはYouTubeのリンクを追加。AIが音楽プロファイルを分析し、英語ピッチを自動生成します。',
    step2ic: '🎯', step2s: '02', step2t: 'マッチするキュレーターを探す',
    step2d: 'AIマッチスコア付きで3,400以上のキュレーターを閲覧。ジャンル・国・タイプで絞り込めます。',
    step3ic: '💬', step3s: '03', step3t: 'リアルなフィードバックを獲得',
    step3d: 'キュレーターが7日以内にリスニング・返信。プレイリスト掲載、ブログ記事、または建設的なフィードバックを受け取れます。',
    ctaBannerTitle: 'Ready to reach the world?',
    ctaBannerSub: 'すでに70以上の日本のレーベルが利用中',
    ctaBannerBtn: '最初のピッチを始める →',
    footerCopy: 'OTONAMI — Connecting Japanese Music to the World',
    footerBy: 'TYCompany LLC / ILCJ',
  },
};

export default function HomePage() {
  const [lang, setLang] = useState('ja');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('otonami_locale');
      if (saved === 'ja' || saved === 'en') { setLang(saved); return; }
      if (navigator.language?.startsWith('ja')) setLang('ja');
      else setLang('en');
    } catch {}
  }, []);

  const switchLang = (l) => {
    setLang(l);
    try { localStorage.setItem('otonami_locale', l); } catch {}
  };

  const t = COPY[lang];

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: T.font }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: ${T.bg}; }
        ::selection { background: ${T.accentLight}; color: ${T.accent}; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
        @media (max-width: 768px) {
          .hero-h1 { font-size: 32px !important; }
          .how-grid { grid-template-columns: 1fr !important; }
          .nav-links-center { display: none !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${T.border}`,
        padding: '0 24px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontFamily: T.font,
      }}>
        {/* Left: logo + nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: T.accentGrad,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: 17,
            }}>O</div>
            <span style={{ fontFamily: T.fontDisplay, fontSize: 22, fontWeight: 700, color: T.accent, letterSpacing: -0.3 }}>OTONAMI</span>
          </a>
          <nav className="nav-links-center" style={{ display: 'flex', gap: 4 }}>
            {[
              { href: '#how-it-works', label: t.navHow },
              { href: '/curator',      label: t.navCurators },
              { href: '/studio',       label: t.navArtists },
            ].map(item => (
              <a key={item.href} href={item.href} style={{
                background: 'transparent', color: T.textSub,
                padding: '8px 14px', borderRadius: 8,
                fontSize: 14, fontWeight: 500,
                textDecoration: 'none',
                transition: 'all 0.15s',
                fontFamily: T.font,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = T.accentLight; e.currentTarget.style.color = T.accent; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textSub; }}
              >{item.label}</a>
            ))}
          </nav>
        </div>

        {/* Right: lang toggle + CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1px solid ${T.border}` }}>
            {['EN', 'JP'].map(l => (
              <button key={l} onClick={() => switchLang(l === 'JP' ? 'ja' : 'en')} style={{
                padding: '6px 12px', fontSize: 12, fontWeight: 600,
                fontFamily: T.font, border: 'none', cursor: 'pointer',
                transition: 'all 0.15s',
                background: (l === 'JP' ? lang === 'ja' : lang === 'en') ? T.text : 'transparent',
                color:      (l === 'JP' ? lang === 'ja' : lang === 'en') ? '#fff' : T.textSub,
              }}>{l === 'JP' ? '日本語' : l}</button>
            ))}
          </div>
          <a href="/curator" style={{
            padding: '8px 16px', fontSize: 13, fontWeight: 600,
            background: T.accent, color: '#fff', borderRadius: T.radius,
            textDecoration: 'none', fontFamily: T.font,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = T.accentDark}
          onMouseLeave={e => e.currentTarget.style.background = T.accent}
          >{t.navCta}</a>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{
        position: 'relative', overflow: 'hidden',
        textAlign: 'center', padding: '120px 24px 100px',
        background: [
          'linear-gradient(180deg, rgba(15,23,42,0.72) 0%, rgba(15,23,42,0.82) 100%)',
          "url('/hero.jpg') center/cover no-repeat",
        ].join(', '),
        backgroundColor: '#0f172a',
      }}>
        {/* Fallback gradient shown when hero.jpg is absent (blends in as darker area) */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)',
          zIndex: 0,
        }}/>
        {/* Sky Blue glow */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 50% 80%, rgba(14,165,233,0.15) 0%, transparent 60%)',
          zIndex: 1,
        }}/>
        <div style={{ maxWidth: 740, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 18px',
            background: 'rgba(14,165,233,0.15)',
            borderRadius: 24, fontSize: 13, fontWeight: 600, color: '#7dd3fc',
            marginBottom: 28,
            border: '1px solid rgba(14,165,233,0.3)',
            backdropFilter: 'blur(8px)',
          }}>{t.heroTag}</div>

          {/* H1 */}
          <h1 className="hero-h1" style={{
            fontFamily: T.fontDisplay, fontSize: 50, fontWeight: 700,
            color: '#fff', lineHeight: 1.18, marginBottom: 24, letterSpacing: -0.5,
          }}>
            {t.heroH1a}<br/>
            <span style={{ color: '#38bdf8' }}>{t.heroH1b}</span>
          </h1>

          {/* Sub */}
          <p style={{
            fontSize: 17, color: 'rgba(255,255,255,0.75)', lineHeight: 1.75,
            maxWidth: 560, margin: '0 auto 44px', fontFamily: T.font,
          }}>{t.heroSub}</p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/curator" style={{
              padding: '16px 36px', fontSize: 16, fontWeight: 600,
              background: '#10b981', color: '#fff', borderRadius: T.radius,
              textDecoration: 'none', fontFamily: T.font,
              boxShadow: '0 4px 20px rgba(16,185,129,0.35)',
              transition: 'transform 0.15s, box-shadow 0.15s',
              display: 'inline-block',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(16,185,129,0.45)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(16,185,129,0.35)'; }}
            >{t.ctaPrimary}</a>
            <a href="#how-it-works" style={{
              padding: '16px 32px', fontSize: 16, fontWeight: 600,
              color: '#fff', borderRadius: T.radius,
              textDecoration: 'none', fontFamily: T.font,
              border: '1.5px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.05)',
              display: 'inline-block',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >{t.ctaGhost}</a>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section style={{
        padding: '36px 24px',
        background: T.white,
        borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{
          maxWidth: 900, margin: '0 auto',
          display: 'flex', justifyContent: 'center', gap: 64, flexWrap: 'wrap',
        }}>
          {[
            { n: t.stat1n, l: t.stat1l },
            { n: t.stat2n, l: t.stat2l },
            { n: t.stat3n, l: t.stat3l },
            { n: t.stat4n, l: t.stat4l },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: T.fontDisplay, fontSize: 32, fontWeight: 700, color: T.accent }}>{s.n}</div>
              <div style={{ fontSize: 13, color: T.textMuted, fontFamily: T.font, marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" style={{ padding: '88px 24px', background: T.bg }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <h2 style={{
            fontFamily: T.fontDisplay, fontSize: 36, fontWeight: 700,
            color: T.text, textAlign: 'center', marginBottom: 64,
          }}>{t.howTitle}</h2>
          <div className="how-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28 }}>
            {[
              { ic: t.step1ic, s: t.step1s, title: t.step1t, desc: t.step1d },
              { ic: t.step2ic, s: t.step2s, title: t.step2t, desc: t.step2d },
              { ic: t.step3ic, s: t.step3s, title: t.step3t, desc: t.step3d },
            ].map((item, i) => (
              <div key={i} style={{
                background: T.white, borderRadius: T.radiusLg,
                padding: 36, border: `1px solid ${T.border}`,
                position: 'relative', overflow: 'hidden',
              }}>
                {/* Top accent line */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                  background: T.accentGrad,
                }}/>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: T.accentLight, border: `1px solid ${T.accentBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26, marginBottom: 20,
                }}>{item.ic}</div>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: T.accent,
                  marginBottom: 8, fontFamily: T.font, letterSpacing: 1.5,
                }}>STEP {item.s}</div>
                <h3 style={{ fontFamily: T.font, fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 12 }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: T.textSub, lineHeight: 1.75, fontFamily: T.font }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{ padding: '64px 24px', background: T.accentGrad, textAlign: 'center' }}>
        <h2 style={{ fontFamily: T.fontDisplay, fontSize: 32, fontWeight: 700, color: '#fff', marginBottom: 16 }}>
          {t.ctaBannerTitle}
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', marginBottom: 36, fontFamily: T.font }}>
          {t.ctaBannerSub}
        </p>
        <a href="/studio" style={{
          padding: '16px 36px', fontSize: 16, fontWeight: 600,
          background: '#fff', color: T.accent, borderRadius: T.radius,
          textDecoration: 'none', fontFamily: T.font,
          display: 'inline-block',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          transition: 'box-shadow 0.15s, transform 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = ''; }}
        >{t.ctaBannerBtn}</a>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        padding: '32px 24px',
        background: T.white,
        borderTop: `1px solid ${T.border}`,
        textAlign: 'center',
        fontFamily: T.font, fontSize: 13, color: T.textMuted,
      }}>
        {t.footerCopy}&nbsp;|&nbsp;{t.footerBy}
      </footer>
    </div>
  );
}
