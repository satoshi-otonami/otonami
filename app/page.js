'use client';
import { useState, useEffect, useRef } from 'react';
import AnimatedSection from '@/components/AnimatedSection';
import { DT as D } from '@/lib/design-tokens';

/* ─────────────────────────────────────────
   Bilingual copy
───────────────────────────────────────── */
const COPY = {
  en: {
    nav: {
      how: 'How It Works', curators: 'For Curators', artists: 'For Artists',
      cta: 'Join as Curator →', lang: 'JA',
    },
    hero: {
      tag: 'AI-POWERED MUSIC PITCH PLATFORM',
      h1: ["Connect Japanese", "indie artists with", "the world's curators"],
      sub: 'AI-matched pitches. Real music industry connections.\nTrusted by 70+ independent labels.',
      ctaPrimary: 'Start Pitching →',
      ctaGhost: 'Join as Curator',
    },
    stats: [
      { n: '3,449', l: 'Curators & Pros' },
      { n: '70+',   l: 'Japanese Labels' },
      { n: '11×',   l: 'SXSW Consecutive' },
      { n: '6',     l: 'Countries' },
    ],
    how: {
      label: 'HOW IT WORKS',
      title: 'From studio to playlist in three steps',
      steps: [
        { num: '1', t: 'Upload & Analyze', d: 'Add your Spotify or YouTube link. Our AI analyzes your sound profile and generates a professional English pitch automatically.' },
        { num: '2', t: 'AI Matches',       d: 'Our AI finds the best-fit curators for your sound. Browse 3,400+ curators with match scores — filter by genre, country, and type.' },
        { num: '3', t: 'Direct Pitch',     d: 'Send a personalized pitch directly to their inbox. Curators listen and respond within 7 days.' },
      ],
    },
    trust: {
      label: 'TRUSTED BY',
      orgs: ['ILCJ — 70+ Independent Labels', 'SXSW — 11 Consecutive Years', 'Blue Note Tokyo'],
      quote: '"OTONAMI is the most efficient tool for bringing Japanese indie music to the world."',
      quoteBy: '— ILCJ Representative',
    },
    curators: {
      label: 'FOR CURATORS',
      title: "Discover Japan's next breakout artist",
      sub: 'We send only high-match pitches. No spam — only music that genuinely fits your audience.',
      features: [
        'AI-matched recommendations based on your taste profile',
        'Listen before you commit — embedded players in every pitch',
        'Respond at your pace — no pressure, no spam',
        'Compensation for your expertise ($3–5 per review, paid via PayPal)',
      ],
      cta: 'Join as Curator →',
    },
    artists: {
      label: 'FOR ARTISTS',
      title: 'Your music deserves a global audience',
      sub: 'Input your track, get a professional pitch email, and submit to curators who match your sound — in minutes.',
      features: [
        'AI-generated pitch letters in professional English',
        'Audio analysis highlights what makes your track unique',
        'Direct access to curators, bloggers, and playlist makers worldwide',
        'Track every pitch — from send to placement',
      ],
      cta: 'Start Pitching →',
    },
    cta: {
      title: 'Ready to reach the world?',
      sub: 'Join 70+ Japanese labels already using OTONAMI',
      btn: 'Start Your First Pitch →',
    },
    footer: {
      tagline: 'Connecting Japanese Music to the World',
      links: [
        { label: 'For Curators', href: '/curator' },
        { label: 'For Artists',  href: '/studio' },
        { label: 'About ILCJ',   href: 'https://ilcj.jp' },
        { label: 'Contact',      href: 'mailto:info@otonami.io' },
      ],
      copy: '© 2025 TYCompany LLC / ILCJ. All rights reserved.',
      email: 'info@otonami.io',
    },
  },
  ja: {
    nav: {
      how: '使い方', curators: 'キュレーター向け', artists: 'アーティスト向け',
      cta: 'キュレーター登録 →', lang: 'EN',
    },
    hero: {
      tag: 'AIパワード・ミュージックピッチプラットフォーム',
      h1: ['日本のインディー音楽を、', '世界のキュレーターへ', 'つなぐ'],
      sub: 'AIマッチングピッチ。リアルな音楽業界コネクション。\n70以上のインディーレーベルに信頼されています。',
      ctaPrimary: 'ピッチを始める →',
      ctaGhost: 'キュレーターとして参加',
    },
    stats: [
      { n: '3,449', l: 'Curators & Pros' },
      { n: '70+',   l: '加盟レーベル' },
      { n: '11回',  l: 'SXSW 連続出演' },
      { n: '6',     l: '対応国' },
    ],
    how: {
      label: 'HOW IT WORKS',
      title: '3ステップでスタジオからプレイリストへ',
      steps: [
        { num: '1', t: 'アップロード＆分析', d: 'SpotifyまたはYouTubeのリンクを追加。AIが音楽プロファイルを分析し、プロの英語ピッチを自動生成します。' },
        { num: '2', t: 'AIマッチング',       d: 'AIがあなたのサウンドに最適なキュレーターを見つけます。3,400以上のキュレーターをスコア付きで閲覧。' },
        { num: '3', t: 'ダイレクトピッチ',   d: 'キュレーターのInboxに直接パーソナライズされたピッチを送信。7日以内にフィードバックを受け取れます。' },
      ],
    },
    trust: {
      label: 'TRUSTED BY',
      orgs: ['ILCJ — 70以上のインディーレーベル', 'SXSW — 11年連続', 'ブルーノート東京'],
      quote: '"OTONAMIは日本のインディー音楽を世界に届ける最も効率的なツールです"',
      quoteBy: '— ILCJ 理事',
    },
    curators: {
      label: 'FOR CURATORS',
      title: '日本の次のブレイクアーティストを発見',
      sub: '高マッチのピッチのみをお送りします。スパムなし — あなたのオーディエンスに合う音楽だけが届きます。',
      features: [
        'あなたの好みに基づくAIマッチング推薦',
        'コミットする前に試聴 — すべてのピッチに埋め込みプレイヤー',
        '自分のペースで返信 — プレッシャーなし、スパムなし',
        '専門性への報酬（レビュー1件$3〜5、PayPalで直接支払い）',
      ],
      cta: 'キュレーターとして参加 →',
    },
    artists: {
      label: 'FOR ARTISTS',
      title: 'あなたの音楽は世界規模のオーディエンスに値する',
      sub: '楽曲を入力してプロのピッチメールを生成し、相性の良いキュレーターに数分で送信。',
      features: [
        'プロフェッショナルな英語ピッチレターをAIが自動生成',
        '音楽分析があなたのトラックのユニークさを強調',
        '世界中のキュレーター、ブロガー、プレイリストメーカーへの直接アクセス',
        '送信からプレイスメントまで全ピッチを追跡',
      ],
      cta: 'ピッチを始める →',
    },
    cta: {
      title: '世界へ届ける準備はできていますか？',
      sub: 'すでに70以上の日本のレーベルが利用しています',
      btn: '最初のピッチを始める →',
    },
    footer: {
      tagline: '日本の音楽を世界へ',
      links: [
        { label: 'キュレーター向け', href: '/curator' },
        { label: 'アーティスト向け', href: '/studio' },
        { label: 'ILCJについて',     href: 'https://ilcj.jp' },
        { label: 'お問い合わせ',     href: 'mailto:info@otonami.io' },
      ],
      copy: '© 2025 TYCompany LLC / ILCJ. All rights reserved.',
      email: 'info@otonami.io',
    },
  },
};

/* ─────────────────────────────────────────
   Shared layout helpers
───────────────────────────────────────── */
const wrap  = { maxWidth: 1200, margin: '0 auto', padding: '0 24px' };
const label = { fontSize: 11, fontWeight: 600, letterSpacing: '3px', color: D.accent, textTransform: 'uppercase', marginBottom: 20 };

/* ─────────────────────────────────────────
   Page component
───────────────────────────────────────── */
export default function HomePage() {
  const [lang, setLang] = useState('ja');
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('otonami_locale');
      if (saved === 'ja' || saved === 'en') { setLang(saved); return; }
      setLang(navigator.language?.startsWith('ja') ? 'ja' : 'en');
    } catch {}
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const switchLang = (l) => {
    setLang(l);
    try { localStorage.setItem('otonami_locale', l); } catch {}
  };

  const t = COPY[lang];

  return (
    <div style={{ minHeight: '100vh', background: D.bg, fontFamily: D.fBody, color: D.text }}>

      {/* ── Global styles ── */}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: ${D.bg}; overflow-x: hidden; -webkit-font-smoothing: antialiased; }
        ::selection { background: rgba(196,149,106,0.3); color: ${D.text}; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-line { opacity: 0; animation: fadeInUp 0.7s ease forwards; }
        .hero-line:nth-child(1) { animation-delay: 0.12s; }
        .hero-line:nth-child(2) { animation-delay: 0.25s; }
        .hero-line:nth-child(3) { animation-delay: 0.38s; }
        .hero-tag-anim { opacity: 0; animation: fadeInUp 0.6s ease 0.02s forwards; }
        .hero-sub-anim  { opacity: 0; animation: fadeInUp 0.6s ease 0.52s forwards; }
        .hero-cta-anim  { opacity: 0; animation: fadeInUp 0.6s ease 0.64s forwards; }
        .hero-stat-anim { opacity: 0; animation: fadeInUp 0.6s ease 0.78s forwards; }

        .cta-coral {
          background: ${D.cta}; color: #fff; border: none;
          padding: 14px 28px; border-radius: 8px;
          font-size: 15px; font-weight: 600; cursor: pointer;
          transition: background 0.2s, transform 0.1s;
          text-decoration: none; display: inline-block; font-family: inherit;
          white-space: nowrap;
        }
        .cta-coral:hover { background: ${D.ctaHover}; transform: translateY(-1px); }

        .cta-ghost {
          background: transparent; color: ${D.textSec};
          border: 1px solid rgba(255,255,255,0.18);
          padding: 14px 28px; border-radius: 8px;
          font-size: 15px; font-weight: 500; cursor: pointer;
          transition: border-color 0.2s, color 0.2s, transform 0.1s;
          text-decoration: none; display: inline-block; font-family: inherit;
          white-space: nowrap;
        }
        .cta-ghost:hover { border-color: rgba(255,255,255,0.35); color: ${D.text}; transform: translateY(-1px); }

        .nav-link {
          color: ${D.textSec}; text-decoration: none;
          font-size: 13px; font-weight: 400;
          transition: color 0.2s; white-space: nowrap;
        }
        .nav-link:hover { color: ${D.text}; }

        .feature-row { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 18px; }

        .trust-org {
          color: ${D.textMuted}; font-size: 13px; font-weight: 500;
          letter-spacing: 0.5px; transition: color 0.2s;
          padding: 6px 0; white-space: nowrap;
        }
        .trust-org:hover { color: ${D.textSec}; }

        .how-card {
          background: ${D.surfaceAlt};
          border: 1px solid ${D.border};
          border-radius: 12px;
          padding: 32px 28px;
          transition: border-color 0.2s;
        }
        .how-card:hover { border-color: ${D.accentBorder}; }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .nav-desktop-links { display: none !important; }
          .hamburger-btn { display: flex !important; }
          .hero-h1 { font-size: 34px !important; }
          .hero-sub { font-size: 16px !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; gap: 28px 20px !important; }
          .how-grid { grid-template-columns: 1fr !important; }
          .cta-group { flex-direction: column !important; width: 100% !important; }
          .cta-group .cta-coral,
          .cta-group .cta-ghost { width: 100% !important; text-align: center !important; }
          .trust-orgs { flex-direction: column !important; gap: 12px !important; }
          .section-pad { padding: 72px 0 !important; }
          .footer-links { flex-direction: column !important; gap: 12px !important; }
          .lang-toggle { display: none !important; }
        }
        @media (max-width: 480px) {
          .hero-h1 { font-size: 28px !important; }
        }
      `}</style>

      {/* ─────────────────────────── Mobile menu overlay ─────────────────────────── */}
      {menuOpen && (
        <div ref={menuRef} style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: '#181818', display: 'flex', flexDirection: 'column',
          padding: '0 24px',
        }}>
          {/* Top bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 64, borderBottom: `1px solid ${D.border}` }}>
            <span style={{ fontFamily: D.fHead, fontSize: 18, letterSpacing: '2px', color: D.text }}>OTONAMI</span>
            <button onClick={() => setMenuOpen(false)} style={{ background: 'none', border: 'none', color: D.textSec, fontSize: 28, cursor: 'pointer', lineHeight: 1, padding: 4 }}>✕</button>
          </div>
          {/* Links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 24 }}>
            {[
              { href: '#how-it-works', label: t.nav.how },
              { href: '/curator',      label: t.nav.curators },
              { href: '/studio',       label: t.nav.artists },
            ].map(item => (
              <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)} style={{ color: D.textSec, textDecoration: 'none', fontSize: 20, fontWeight: 400, padding: '14px 0', borderBottom: `1px solid ${D.border}`, transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = D.text}
                onMouseLeave={e => e.target.style.color = D.textSec}
              >{item.label}</a>
            ))}
          </nav>
          <div style={{ marginTop: 32 }}>
            <a href="/curator" className="cta-coral" style={{ width: '100%', textAlign: 'center', display: 'block' }}>{t.nav.cta}</a>
          </div>
        </div>
      )}

      {/* ─────────────────────────── Fixed Nav ─────────────────────────── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        background: scrolled ? 'rgba(26,26,26,0.92)' : 'rgba(26,26,26,0.75)',
        backdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${D.border}`,
        transition: 'background 0.3s',
      }}>
        <div style={{ ...wrap, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          {/* Logo */}
          <a href="/" style={{ textDecoration: 'none', fontFamily: D.fHead, fontSize: 20, letterSpacing: '2px', color: D.text, fontWeight: 500 }}>
            OTONAMI
          </a>

          {/* Desktop links */}
          <nav className="nav-desktop-links" style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
            <a href="#how-it-works" className="nav-link">{t.nav.how}</a>
            <a href="/curator"      className="nav-link">{t.nav.curators}</a>
            <a href="/studio"       className="nav-link">{t.nav.artists}</a>
          </nav>

          {/* Right cluster */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Lang toggle */}
            <button className="lang-toggle" onClick={() => switchLang(lang === 'ja' ? 'en' : 'ja')} style={{
              background: 'none', border: `1px solid ${D.border}`, color: D.textMuted,
              fontSize: 11, fontWeight: 600, letterSpacing: '1px', padding: '6px 10px',
              borderRadius: 6, cursor: 'pointer', transition: 'border-color 0.2s, color 0.2s', fontFamily: D.fBody,
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = D.borderHover; e.currentTarget.style.color = D.textSec; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.color = D.textMuted; }}
            >{t.nav.lang}</button>

            <a href="/curator" className="cta-coral" style={{ padding: '8px 20px', fontSize: 13 }}>{t.nav.cta}</a>

            {/* Hamburger */}
            <button className="hamburger-btn" onClick={() => setMenuOpen(true)} style={{
              display: 'none', background: 'none', border: `1px solid ${D.border}`,
              borderRadius: 8, width: 44, height: 44, fontSize: 18, cursor: 'pointer',
              color: D.textSec, alignItems: 'center', justifyContent: 'center',
            }}>☰</button>
          </div>
        </div>
      </header>

      {/* ─────────────────────────── Hero ─────────────────────────── */}
      <section style={{ background: D.bg, paddingTop: 160, paddingBottom: 100 }}>
        <div style={{ ...wrap, textAlign: 'center' }}>

          {/* Tag */}
          <div className="hero-tag-anim" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '3px', color: D.accent, textTransform: 'uppercase', marginBottom: 28 }}>
            {t.hero.tag}
          </div>

          {/* H1 — staggered lines */}
          <h1 className="hero-h1" style={{ fontFamily: D.fHead, fontSize: 52, fontWeight: 500, lineHeight: 1.2, color: D.text, marginBottom: 28, letterSpacing: '-0.5px' }}>
            {t.hero.h1.map((line, i) => (
              <span key={i} className="hero-line" style={{ display: 'block' }}>{line}</span>
            ))}
          </h1>

          {/* Sub */}
          <p className="hero-sub hero-sub-anim" style={{ fontSize: 18, color: D.textSec, lineHeight: 1.75, maxWidth: 520, margin: '0 auto 44px', whiteSpace: 'pre-line' }}>
            {t.hero.sub}
          </p>

          {/* CTAs */}
          <div className="cta-group hero-cta-anim" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginBottom: 80, flexWrap: 'wrap' }}>
            <a href="/studio"  className="cta-coral" style={{ fontSize: 16, padding: '15px 32px' }}>{t.hero.ctaPrimary}</a>
            <a href="/curator" className="cta-ghost" style={{ fontSize: 16, padding: '15px 32px' }}>{t.hero.ctaGhost}</a>
          </div>

          {/* Stats bar */}
          <div className="stats-grid hero-stat-anim" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0 32px', maxWidth: 640, margin: '0 auto' }}>
            {t.stats.map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 36, fontWeight: 600, color: D.accent, fontFamily: D.fHead, lineHeight: 1 }}>{s.n}</div>
                <div style={{ fontSize: 11, color: D.textMuted, marginTop: 6, letterSpacing: '0.5px' }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────── How It Works ─────────────────────────── */}
      <section id="how-it-works" style={{ background: D.surface, padding: '100px 0' }} className="section-pad">
        <div style={wrap}>
          <AnimatedSection>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <div style={label}>{t.how.label}</div>
              <h2 style={{ fontFamily: D.fHead, fontSize: 36, fontWeight: 500, color: D.text, lineHeight: 1.25 }}>{t.how.title}</h2>
            </div>
          </AnimatedSection>

          <div className="how-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
            {t.how.steps.map((step, i) => (
              <AnimatedSection key={i} delay={i * 100}>
                <div className="how-card" style={{ height: '100%' }}>
                  <div style={{ fontFamily: D.fHead, fontSize: 42, color: D.accent, marginBottom: 20, lineHeight: 1, opacity: 0.9 }}>{step.num}</div>
                  <h3 style={{ fontSize: 17, fontWeight: 600, color: D.text, marginBottom: 12 }}>{step.t}</h3>
                  <p style={{ fontSize: 14, color: D.textSec, lineHeight: 1.7 }}>{step.d}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────── Trust / Social Proof ─────────────────────────── */}
      <section style={{ background: D.bg, padding: '100px 0' }} className="section-pad">
        <div style={wrap}>
          <AnimatedSection>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <div style={label}>{t.trust.label}</div>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={100}>
            <div className="trust-orgs" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 48, marginBottom: 64, flexWrap: 'wrap' }}>
              {t.trust.orgs.map((org, i) => (
                <span key={i} className="trust-org">{org}</span>
              ))}
            </div>
          </AnimatedSection>

          {/* Pull quote */}
          <AnimatedSection delay={200}>
            <div style={{ maxWidth: 680, margin: '0 auto', borderLeft: `3px solid ${D.accent}`, paddingLeft: 28 }}>
              <p style={{ fontFamily: D.fHead, fontStyle: 'italic', fontSize: 20, color: D.text, lineHeight: 1.6, marginBottom: 12 }}>
                {t.trust.quote}
              </p>
              <p style={{ fontSize: 13, color: D.textMuted }}>{t.trust.quoteBy}</p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ─────────────────────────── For Curators ─────────────────────────── */}
      <section style={{ background: D.surface, padding: '100px 0' }} className="section-pad">
        <div style={wrap}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <AnimatedSection>
              <div>
                <div style={label}>{t.curators.label}</div>
                <h2 style={{ fontFamily: D.fHead, fontSize: 36, fontWeight: 500, color: D.text, lineHeight: 1.25, marginBottom: 16 }}>{t.curators.title}</h2>
                <p style={{ fontSize: 15, color: D.textSec, lineHeight: 1.7, marginBottom: 36 }}>{t.curators.sub}</p>
                <a href="/curator" className="cta-coral">{t.curators.cta}</a>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={120}>
              <div style={{ background: D.surfaceAlt, border: `1px solid ${D.border}`, borderRadius: 16, padding: '32px 28px' }}>
                {t.curators.features.map((f, i) => (
                  <div key={i} className="feature-row">
                    <span style={{ color: D.accent, fontSize: 18, flexShrink: 0, marginTop: 1 }}>✦</span>
                    <span style={{ fontSize: 15, color: D.textSec, lineHeight: 1.65 }}>{f}</span>
                  </div>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ─────────────────────────── For Artists ─────────────────────────── */}
      <section style={{ background: D.bg, padding: '100px 0' }} className="section-pad">
        <div style={wrap}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <AnimatedSection delay={120}>
              <div style={{ background: D.surfaceAlt, border: `1px solid ${D.border}`, borderRadius: 16, padding: '32px 28px' }}>
                {t.artists.features.map((f, i) => (
                  <div key={i} className="feature-row">
                    <span style={{ color: D.accent, fontSize: 18, flexShrink: 0, marginTop: 1 }}>✦</span>
                    <span style={{ fontSize: 15, color: D.textSec, lineHeight: 1.65 }}>{f}</span>
                  </div>
                ))}
              </div>
            </AnimatedSection>

            <AnimatedSection>
              <div>
                <div style={label}>{t.artists.label}</div>
                <h2 style={{ fontFamily: D.fHead, fontSize: 36, fontWeight: 500, color: D.text, lineHeight: 1.25, marginBottom: 16 }}>{t.artists.title}</h2>
                <p style={{ fontSize: 15, color: D.textSec, lineHeight: 1.7, marginBottom: 36 }}>{t.artists.sub}</p>
                <a href="/studio" className="cta-coral">{t.artists.cta}</a>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ─────────────────────────── CTA Banner ─────────────────────────── */}
      <section style={{ background: D.surface, padding: '80px 0', borderTop: `1px solid ${D.border}`, borderBottom: `1px solid ${D.border}` }}>
        <AnimatedSection>
          <div style={{ ...wrap, textAlign: 'center' }}>
            <h2 style={{ fontFamily: D.fHead, fontSize: 40, fontWeight: 500, color: D.text, marginBottom: 12 }}>{t.cta.title}</h2>
            <p style={{ fontSize: 16, color: D.textSec, marginBottom: 36 }}>{t.cta.sub}</p>
            <a href="/studio" className="cta-coral" style={{ fontSize: 16, padding: '16px 36px' }}>{t.cta.btn}</a>
          </div>
        </AnimatedSection>
      </section>

      {/* ─────────────────────────── Footer ─────────────────────────── */}
      <footer style={{ background: '#151515', padding: '60px 0 40px', borderTop: `1px solid ${D.border}` }}>
        <div style={wrap}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 32, flexWrap: 'wrap', marginBottom: 48 }}>
            {/* Brand */}
            <div>
              <div style={{ fontFamily: D.fHead, fontSize: 22, letterSpacing: '2px', color: D.accent, marginBottom: 8 }}>OTONAMI</div>
              <div style={{ fontSize: 13, color: D.textMuted, lineHeight: 1.6 }}>{t.footer.tagline}</div>
            </div>
            {/* Links */}
            <nav className="footer-links" style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
              {t.footer.links.map((l, i) => (
                <a key={i} href={l.href} style={{ color: D.textMuted, textDecoration: 'none', fontSize: 13, transition: 'color 0.2s' }}
                  onMouseEnter={e => e.target.style.color = D.textSec}
                  onMouseLeave={e => e.target.style.color = D.textMuted}
                >{l.label}</a>
              ))}
            </nav>
          </div>
          {/* Bottom bar */}
          <div style={{ borderTop: `1px solid ${D.border}`, paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 12, color: D.textMuted }}>{t.footer.copy}</span>
            <a href={`mailto:${t.footer.email}`} style={{ fontSize: 12, color: D.textMuted, textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = D.textSec}
              onMouseLeave={e => e.target.style.color = D.textMuted}
            >{t.footer.email}</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
