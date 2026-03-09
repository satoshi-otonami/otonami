'use client';
import { useState, useEffect, useRef } from 'react';
import { T } from '@/lib/design-tokens';

/* ── i18n copy ── */
const COPY = {
  en: {
    navHow: 'How It Works', navCurators: 'Find Curators', navArtists: 'For Artists',
    navCta: 'Join as Curator',
    heroTag: '♪ Curator Network — AI-Powered Matching',
    heroH1a: "Japan's indie music,", heroH1b: "to the world's curators",
    heroSub: "OTONAMI connects handpicked Japanese indie artists with curators worldwide. Get paid to review. No spam — only quality pitches matched to your taste.",
    ctaPrimary: 'Join as Curator →', ctaGhost: 'See How It Works',

    stat1n: '3,449', stat1l: 'Curators & Pros',
    stat2n: '70+',   stat2l: 'Japanese Labels',
    stat3n: '93%',   stat3l: 'Response Rate',
    stat4n: '10yr',  stat4l: 'SXSW Track Record',

    whyLabel: 'Why OTONAMI', whyTitle: 'Built for Curators Who Value Quality',
    whySub: 'We filter the noise so you only hear music that genuinely fits your audience.',
    why1ic: '🎯', why1t: 'AI-Matched Pitches',
    why1d: "Our Match Score engine compares each artist's audio features, genre, and mood against your profile. Only high-match submissions reach your inbox.",
    why2ic: '💰', why2t: 'Get Paid to Listen',
    why2d: 'Earn $3–5 per review, paid directly via PayPal. Transparent, guaranteed compensation for your time and expertise.',
    why3ic: '🇯🇵', why3t: "Japan's Hidden Gems",
    why3d: "Access 70+ independent labels through ILCJ, Japan's largest indie label coalition. Discover artists before they go global.",

    howTitle: 'How OTONAMI Works',
    step1ic: '🎵', step1s: '01', step1t: 'Submit Your Track',
    step1d: 'Add your Spotify or YouTube link. Our AI analyzes your sound profile and generates an English pitch automatically.',
    step2ic: '🎯', step2s: '02', step2t: 'Find Matching Curators',
    step2d: 'Browse 3,400+ curators with AI match scores. Filter by genre, country, and type to find your perfect fit.',
    step3ic: '💬', step3s: '03', step3t: 'Get Real Feedback',
    step3d: 'Curators listen and respond within 7 days. Get playlist placements, blog features, or constructive feedback.',

    artLabel: 'For Artists & Labels', artTitle: 'Are you a Japanese artist or label?',
    artBody: 'OTONAMI helps you reach international curators with AI-generated English pitches. Input your track, get a professional pitch email, and submit to curators who match your sound — in minutes.',
    artCta: 'Submit Your Music →',

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

    whyLabel: 'なぜOTONAMI？', whyTitle: 'クオリティを重視するキュレーターのために',
    whySub: 'ノイズをフィルタリングし、あなたのオーディエンスに本当に合う音楽だけをお届けします。',
    why1ic: '🎯', why1t: 'AIマッチングピッチ',
    why1d: 'Match Scoreエンジンがアーティストの音響特性・ジャンル・ムードをあなたのプロファイルと比較。高マッチのピッチだけが届きます。ランダムな投稿は届きません。',
    why2ic: '💰', why2t: '聴いて報酬を獲得',
    why2d: '1件のレビューで$3〜5をPayPalで直接受け取れます。透明性があり、保証された報酬体系。あなたの時間と専門性に見合った対価です。',
    why3ic: '🇯🇵', why3t: '日本の隠れた名曲',
    why3d: '日本最大のインディーレーベル連合ILCJを通じて70以上のレーベルにアクセス。世界進出前のアーティストをいち早く発見しましょう。',

    howTitle: 'How OTONAMI Works',
    step1ic: '🎵', step1s: '01', step1t: '楽曲を送信',
    step1d: 'SpotifyまたはYouTubeのリンクを追加。AIが音楽プロファイルを分析し、英語ピッチを自動生成します。',
    step2ic: '🎯', step2s: '02', step2t: 'マッチするキュレーターを探す',
    step2d: 'AIマッチスコア付きで3,400以上のキュレーターを閲覧。ジャンル・国・タイプで絞り込めます。',
    step3ic: '💬', step3s: '03', step3t: 'リアルなフィードバックを獲得',
    step3d: 'キュレーターが7日以内にリスニング・返信。プレイリスト掲載、ブログ記事、または建設的なフィードバックを受け取れます。',

    artLabel: 'アーティスト・レーベルの方へ', artTitle: '日本のアーティスト・レーベルの方へ',
    artBody: 'OTONAMIはAI生成の英語ピッチメールで、日本のアーティストが海外キュレーターにリーチするお手伝いをします。楽曲を入力してプロのピッチメールを生成、相性の良いキュレーターに数分で送信できます。',
    artCta: '楽曲を投稿する →',

    ctaBannerTitle: 'Ready to reach the world?',
    ctaBannerSub: 'すでに70以上の日本のレーベルが利用中',
    ctaBannerBtn: '最初のピッチを始める →',
    footerCopy: 'OTONAMI — Connecting Japanese Music to the World',
    footerBy: 'TYCompany LLC / ILCJ',
  },
};

export default function HomePage() {
  const [lang, setLang] = useState('ja');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('otonami_locale');
      if (saved === 'ja' || saved === 'en') { setLang(saved); return; }
      if (navigator.language?.startsWith('ja')) setLang('ja');
      else setLang('en');
    } catch {}
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // Prevent body scroll when menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const switchLang = (l) => {
    setLang(l);
    try { localStorage.setItem('otonami_locale', l); } catch {}
  };

  const t = COPY[lang];

  const navItems = [
    { href: '#how-it-works', label: t.navHow },
    { href: '/curators',     label: t.navCurators },
    { href: '/studio',       label: t.navArtists },
  ];

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: T.font }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: ${T.bg}; overflow-x: hidden; }
        ::selection { background: ${T.accentLight}; color: ${T.accent}; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }

        /* ── Desktop defaults ── */
        .hamburger-btn { display: none; }
        .mobile-menu-overlay { display: none; }

        /* ── Mobile breakpoint ── */
        @media (max-width: 768px) {
          body { overflow-x: hidden; }

          /* Header */
          .nav-links-center { display: none !important; }
          .hamburger-btn {
            display: flex !important;
            align-items: center; justify-content: center;
            background: none; border: 1px solid ${T.border};
            border-radius: 8px; width: 40px; height: 40px;
            font-size: 20px; cursor: pointer; color: ${T.text};
            flex-shrink: 0;
          }
          .logo-text { font-size: 18px !important; }
          .header-pad { padding: 0 16px !important; }
          .nav-cta-label { display: none; }
          .nav-cta-short { display: inline !important; }
          .lang-btn { padding: 5px 8px !important; font-size: 11px !important; }
          .header-cta { padding: 7px 10px !important; font-size: 12px !important; }

          /* Mobile menu overlay */
          .mobile-menu-overlay {
            display: flex !important;
            position: fixed; inset: 0; z-index: 200;
            background: #fff;
            flex-direction: column;
          }

          /* Hero */
          .hero-section { padding: 72px 18px 56px !important; }
          .hero-h1 { font-size: 30px !important; }
          .hero-sub { font-size: 15px !important; max-width: 100% !important; }
          .hero-tag { font-size: 12px !important; padding: 5px 14px !important; }
          .hero-cta-group {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
          }
          .hero-cta-a {
            width: 100% !important;
            min-height: 48px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            text-align: center !important;
            padding: 14px 20px !important;
            font-size: 15px !important;
          }

          /* Stats */
          .stats-inner {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 20px 16px !important;
            justify-items: center;
          }
          .stat-num { font-size: 24px !important; }

          /* Why / How cards */
          .three-col { grid-template-columns: 1fr !important; }
          .step-card { padding: 24px !important; }
          .why-card { padding: 24px 20px !important; }

          /* Artist / Industry sections */
          .artist-grid { grid-template-columns: 1fr !important; gap: 32px !important; }

          /* CTA banner */
          .cta-banner { padding: 48px 18px !important; }
          .cta-banner-title { font-size: 24px !important; }
          .cta-banner-sub { font-size: 14px !important; }
          .cta-banner-btn {
            display: block !important;
            width: 100% !important;
            min-height: 48px !important;
            line-height: 48px !important;
            padding: 0 20px !important;
            font-size: 15px !important;
          }

          /* Footer */
          .footer-inner {
            display: flex; flex-direction: column; gap: 4px;
            font-size: 12px !important;
          }
          .footer-sep { display: block !important; visibility: hidden; height: 0; }

          /* Section headings */
          .section-h2 { font-size: 26px !important; }
          .section-pad { padding: 56px 18px !important; }

          /* Images */
          img { max-width: 100%; height: auto; }
        }
      `}</style>

      {/* ── Mobile Menu Overlay ── */}
      {menuOpen && (
        <div className="mobile-menu-overlay" ref={menuRef}>
          {/* Overlay header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 16px', height: 64, borderBottom: `1px solid ${T.border}`, flexShrink: 0,
          }}>
            <a href="/" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: T.accentGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16 }}>O</div>
              <span style={{ fontFamily: T.fontDisplay, fontSize: 18, fontWeight: 700, color: T.accent }}>OTONAMI</span>
            </a>
            <button onClick={() => setMenuOpen(false)} style={{
              background: 'none', border: `1px solid ${T.border}`, borderRadius: 8,
              width: 40, height: 40, fontSize: 20, cursor: 'pointer', color: T.text,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✕</button>
          </div>
          {/* Nav links */}
          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 0' }}>
            {navItems.map(item => (
              <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)} style={{
                display: 'block', padding: '16px 24px',
                fontSize: 16, fontWeight: 600, color: T.text,
                textDecoration: 'none', borderBottom: `1px solid ${T.borderLight}`,
                fontFamily: T.font,
              }}>{item.label}</a>
            ))}
            <a href="/curator" onClick={() => setMenuOpen(false)} style={{
              display: 'block', margin: '20px 24px 0',
              padding: '14px 20px', fontSize: 15, fontWeight: 600,
              background: T.accent, color: '#fff', borderRadius: T.radius,
              textDecoration: 'none', fontFamily: T.font, textAlign: 'center',
              minHeight: 48, lineHeight: '20px',
            }}>{t.navCta}</a>
          </nav>
        </div>
      )}

      {/* ── Header ── */}
      <header className="header-pad" style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${T.border}`,
        padding: '0 24px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontFamily: T.font,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: T.accentGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 17 }}>O</div>
            <span className="logo-text" style={{ fontFamily: T.fontDisplay, fontSize: 22, fontWeight: 700, color: T.accent, letterSpacing: -0.3 }}>OTONAMI</span>
          </a>
          <nav className="nav-links-center" style={{ display: 'flex', gap: 4 }}>
            {navItems.map(item => (
              <a key={item.href} href={item.href} style={{
                background: 'transparent', color: T.textSub,
                padding: '8px 14px', borderRadius: 8, fontSize: 14, fontWeight: 500,
                textDecoration: 'none', transition: 'all 0.15s', fontFamily: T.font,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = T.accentLight; e.currentTarget.style.color = T.accent; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textSub; }}
              >{item.label}</a>
            ))}
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1px solid ${T.border}` }}>
            {['EN', 'JP'].map(l => (
              <button key={l} className="lang-btn" onClick={() => switchLang(l === 'JP' ? 'ja' : 'en')} style={{
                padding: '6px 12px', fontSize: 12, fontWeight: 600,
                fontFamily: T.font, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: (l === 'JP' ? lang === 'ja' : lang === 'en') ? T.text : 'transparent',
                color:      (l === 'JP' ? lang === 'ja' : lang === 'en') ? '#fff' : T.textSub,
              }}>{l === 'JP' ? '日本語' : l}</button>
            ))}
          </div>
          <a href="/curator" className="header-cta" style={{
            padding: '8px 16px', fontSize: 13, fontWeight: 600,
            background: T.accent, color: '#fff', borderRadius: T.radius,
            textDecoration: 'none', fontFamily: T.font, transition: 'background 0.15s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => e.currentTarget.style.background = T.accentDark}
          onMouseLeave={e => e.currentTarget.style.background = T.accent}
          >
            <span className="nav-cta-label">{t.navCta}</span>
            <span className="nav-cta-short" style={{ display: 'none' }}>登録</span>
          </a>
          {/* Hamburger — mobile only */}
          <button className="hamburger-btn" onClick={() => setMenuOpen(true)} aria-label="メニューを開く">☰</button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="hero-section" style={{
        position: 'relative', overflow: 'hidden',
        textAlign: 'center', padding: '120px 24px 100px',
        backgroundImage: "linear-gradient(180deg, rgba(15,23,42,0.68) 0%, rgba(15,23,42,0.78) 100%), url('/images/hero-sxsw-crowd.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#0f172a',
      }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 100%, rgba(14,165,233,0.12) 0%, transparent 60%)', zIndex: 1 }}/>
        <div style={{ maxWidth: 740, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div className="hero-tag" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 18px',
            background: 'rgba(14,165,233,0.15)', borderRadius: 24, fontSize: 13,
            fontWeight: 600, color: '#7dd3fc', marginBottom: 28,
            border: '1px solid rgba(14,165,233,0.3)', backdropFilter: 'blur(8px)',
          }}>{t.heroTag}</div>
          <h1 className="hero-h1" style={{
            fontFamily: T.fontDisplay, fontSize: 50, fontWeight: 700,
            color: '#fff', lineHeight: 1.18, marginBottom: 24, letterSpacing: -0.5,
          }}>
            {t.heroH1a}<br/>
            <span style={{ color: '#38bdf8' }}>{t.heroH1b}</span>
          </h1>
          <p className="hero-sub" style={{ fontSize: 17, color: 'rgba(255,255,255,0.75)', lineHeight: 1.75, maxWidth: 560, margin: '0 auto 44px', fontFamily: T.font }}>
            {t.heroSub}
          </p>
          <div className="hero-cta-group" style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/curator" className="hero-cta-a" style={{
              padding: '16px 36px', fontSize: 16, fontWeight: 600, background: '#10b981', color: '#fff',
              borderRadius: T.radius, textDecoration: 'none', fontFamily: T.font,
              boxShadow: '0 4px 20px rgba(16,185,129,0.35)', transition: 'transform 0.15s, box-shadow 0.15s', display: 'inline-block',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(16,185,129,0.45)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(16,185,129,0.35)'; }}
            >{t.ctaPrimary}</a>
            <a href="#how-it-works" className="hero-cta-a" style={{
              padding: '16px 32px', fontSize: 16, fontWeight: 600, color: '#fff',
              borderRadius: T.radius, textDecoration: 'none', fontFamily: T.font,
              border: '1.5px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)',
              display: 'inline-block', transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >{t.ctaGhost}</a>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section style={{ padding: '36px 24px', background: T.white, borderBottom: `1px solid ${T.border}` }}>
        <div className="stats-inner" style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'center', gap: 64, flexWrap: 'wrap' }}>
          {[
            { n: t.stat1n, l: t.stat1l },
            { n: t.stat2n, l: t.stat2l },
            { n: t.stat3n, l: t.stat3l },
            { n: t.stat4n, l: t.stat4l },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div className="stat-num" style={{ fontFamily: T.fontDisplay, fontSize: 32, fontWeight: 700, color: T.accent }}>{s.n}</div>
              <div style={{ fontSize: 13, color: T.textMuted, fontFamily: T.font, marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Why OTONAMI ── */}
      <section className="section-pad" style={{ padding: '80px 24px', background: T.white }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8, fontFamily: T.font }}>{t.whyLabel}</div>
          <h2 className="section-h2" style={{ fontFamily: T.fontDisplay, fontSize: 32, fontWeight: 700, color: T.text, marginBottom: 12 }}>{t.whyTitle}</h2>
          <p style={{ fontSize: 16, color: T.textSub, lineHeight: 1.7, maxWidth: 520, marginBottom: 48, fontFamily: T.font }}>{t.whySub}</p>
          <div className="three-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              { ic: t.why1ic, title: t.why1t, desc: t.why1d, bg: 'rgba(99,102,241,0.08)' },
              { ic: t.why2ic, title: t.why2t, desc: t.why2d, bg: 'rgba(16,185,129,0.08)' },
              { ic: t.why3ic, title: t.why3t, desc: t.why3d, bg: 'rgba(14,165,233,0.08)' },
            ].map((card, i) => (
              <div key={i} className="why-card" style={{
                background: T.bg, borderRadius: T.radiusLg, padding: '32px 28px',
                border: `1px solid ${T.border}`, transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = T.shadowMd; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ width: 52, height: 52, borderRadius: 14, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 20 }}>{card.ic}</div>
                <h3 style={{ fontFamily: T.font, fontSize: 17, fontWeight: 700, color: T.text, marginBottom: 10 }}>{card.title}</h3>
                <p style={{ fontSize: 14, color: T.textSub, lineHeight: 1.75, fontFamily: T.font }}>{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="section-pad" style={{ padding: '80px 24px', background: T.bg }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <h2 className="section-h2" style={{ fontFamily: T.fontDisplay, fontSize: 32, fontWeight: 700, color: T.text, textAlign: 'center', marginBottom: 56 }}>{t.howTitle}</h2>
          <div className="three-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28 }}>
            {[
              { ic: t.step1ic, s: t.step1s, title: t.step1t, desc: t.step1d },
              { ic: t.step2ic, s: t.step2s, title: t.step2t, desc: t.step2d },
              { ic: t.step3ic, s: t.step3s, title: t.step3t, desc: t.step3d },
            ].map((item, i) => (
              <div key={i} className="step-card" style={{
                background: T.white, borderRadius: T.radiusLg, padding: 36,
                border: `1px solid ${T.border}`, position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: T.accentGrad }}/>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: T.accentLight, border: `1px solid ${T.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 20 }}>{item.ic}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, marginBottom: 8, fontFamily: T.font, letterSpacing: 1.5 }}>STEP {item.s}</div>
                <h3 style={{ fontFamily: T.font, fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 12 }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: T.textSub, lineHeight: 1.75, fontFamily: T.font }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── From Japan to the World Stage ── */}
      <section className="section-pad" style={{ padding: '80px 24px', background: T.white }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8, fontFamily: T.font }}>
            {lang === 'ja' ? 'トラックレコード' : 'Track Record'}
          </div>
          <h2 className="section-h2" style={{ fontFamily: T.fontDisplay, fontSize: 32, fontWeight: 700, color: T.text, marginBottom: 48 }}>
            {lang === 'ja' ? '日本から世界のステージへ' : 'From Japan to the World Stage'}
          </h2>
          <div className="three-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { src: '/images/sxsw-trumpet.jpg', caption: 'SXSW 2025 — Tokyo Night' },
              { src: '/images/outdoor-live.jpg', caption: lang === 'ja' ? '国際ツアー' : 'International Tour' },
              { src: '/images/stage-performance.jpg', caption: 'ROUTE14 × OTONAMI' },
            ].map((img, i) => (
              <div key={i} style={{ borderRadius: T.radiusLg, overflow: 'hidden', aspectRatio: '4/3', position: 'relative' }}>
                <img src={img.src} alt={img.caption} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  padding: '28px 16px 14px',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.72), transparent)',
                  color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: T.font,
                }}>{img.caption}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── For Artists ── */}
      <section id="for-artists" className="section-pad" style={{ padding: '80px 24px', background: T.bg }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div className="artist-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8, fontFamily: T.font }}>{t.artLabel}</div>
              <h2 className="section-h2" style={{ fontFamily: T.fontDisplay, fontSize: 28, fontWeight: 700, color: T.text, marginBottom: 16, lineHeight: 1.25 }}>{t.artTitle}</h2>
              <p style={{ fontSize: 15, color: T.textSub, lineHeight: 1.75, marginBottom: 32, fontFamily: T.font }}>{t.artBody}</p>
              <a href="/studio" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 28px', fontSize: 15, fontWeight: 600,
                background: '#10b981', color: '#fff', borderRadius: T.radius,
                textDecoration: 'none', fontFamily: T.font,
                boxShadow: '0 4px 16px rgba(16,185,129,0.28)', transition: 'transform 0.15s, box-shadow 0.15s',
                minHeight: 48,
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(16,185,129,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 16px rgba(16,185,129,0.28)'; }}
              >{t.artCta}</a>
            </div>
            {/* Live performance photo */}
            <div style={{ borderRadius: T.radiusXl, overflow: 'hidden', aspectRatio: '4/3', boxShadow: T.shadowLg }}>
              <img
                src="/images/outdoor-live.jpg"
                alt="Live performance"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Backed by the Industry ── */}
      <section className="section-pad" style={{ padding: '80px 24px', background: T.white }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div className="artist-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <div style={{ borderRadius: T.radiusXl, overflow: 'hidden', aspectRatio: '16/10', boxShadow: T.shadowLg }}>
              <img
                src="/images/hero-sxsw-crowd.jpg"
                alt="SXSW performance"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8, fontFamily: T.font }}>
                {lang === 'ja' ? '業界の信頼' : 'Industry Backing'}
              </div>
              <h2 className="section-h2" style={{ fontFamily: T.fontDisplay, fontSize: 28, fontWeight: 700, color: T.text, marginBottom: 16, lineHeight: 1.25 }}>
                {lang === 'ja' ? '業界に支持されたネットワーク' : 'Backed by the Industry'}
              </h2>
              <p style={{ fontSize: 15, color: T.textSub, lineHeight: 1.75, marginBottom: 28, fontFamily: T.font }}>
                {lang === 'ja'
                  ? 'SXSW連続10年出演、ILCJ加盟70以上のレーベル。業界の第一線で培った信頼が、アーティストの国際展開を加速します。'
                  : '10 consecutive years at SXSW. 70+ labels through ILCJ. A decade of trust built on the frontlines of the international music industry.'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: lang === 'ja' ? 'SXSW 連続10年出演' : '10 Years at SXSW', sub: 'Austin, Texas' },
                  { label: lang === 'ja' ? 'ILCJ加盟レーベル70以上' : '70+ ILCJ Member Labels', sub: lang === 'ja' ? '日本最大インディー連合' : "Japan's largest indie coalition" },
                  { label: lang === 'ja' ? 'キュレーター・プロ 3,449名' : '3,449 Curators & Pros', sub: lang === 'ja' ? '世界各国のメディア・プレイリスト' : 'Global media & playlists' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: T.bg, borderRadius: T.radius, border: `1px solid ${T.border}` }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.accent, flexShrink: 0 }}/>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: T.font }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: T.textMuted, fontFamily: T.font }}>{item.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="cta-banner" style={{ padding: '64px 24px', background: T.accentGrad, textAlign: 'center' }}>
        <h2 className="cta-banner-title" style={{ fontFamily: T.fontDisplay, fontSize: 32, fontWeight: 700, color: '#fff', marginBottom: 16 }}>{t.ctaBannerTitle}</h2>
        <p className="cta-banner-sub" style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', marginBottom: 36, fontFamily: T.font }}>{t.ctaBannerSub}</p>
        <a href="/studio" className="cta-banner-btn" style={{
          padding: '16px 36px', fontSize: 16, fontWeight: 600,
          background: '#fff', color: T.accent, borderRadius: T.radius,
          textDecoration: 'none', fontFamily: T.font, display: 'inline-block',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)', transition: 'box-shadow 0.15s, transform 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = ''; }}
        >{t.ctaBannerBtn}</a>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding: '32px 24px', background: T.white, borderTop: `1px solid ${T.border}`, textAlign: 'center', fontFamily: T.font, fontSize: 13, color: T.textMuted }}>
        <div className="footer-inner">
          <span>{t.footerCopy}</span>
          <span>{t.footerBy}</span>
        </div>
      </footer>
    </div>
  );
}
