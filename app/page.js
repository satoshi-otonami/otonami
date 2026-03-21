'use client';
import { useState, useEffect, useRef } from 'react';
import AnimatedSection from '@/components/AnimatedSection';
import { DT as D } from '@/lib/design-tokens';

/* ── Light section tokens ── */
const L = {
  bg:       '#f0ede6',
  text:     '#2c1810',
  textSec:  '#6b4c3b',
  textMuted:'#9e7a6b',
  card:     '#ffffff',
  border:   'rgba(0,0,0,0.08)',
  shadow:   '0 2px 12px rgba(0,0,0,0.06)',
};

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
      sub: 'AI-matched pitches. Real music industry connections.\nBuilt from the heart of Japan\'s independent music scene.',
      ctaPrimary: 'Start Pitching →',
      ctaGhost: 'Join as Curator',
    },
    stats: [
      { target: 3449, suffix: '',  l: 'Curators & Pros' },
      { target: 70,   suffix: '+', l: 'Labels in Network' },
      { target: 11,   suffix: '×', l: 'SXSW Consecutive' },
      { target: 6,    suffix: '',  l: 'Countries' },
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
    mockup: { label: 'SEE IT IN ACTION' },
    trust: {
      label: 'TRUSTED BY',
      orgs: ['Japan Independent Music Scene', 'SXSW — 11 Consecutive Years', 'Blue Note Tokyo'],
      quote: '"Built by musicians, for musicians — bridging the gap between Japanese indie artists and the global music community."',
      quoteBy: '— Music Industry Professional',
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
      sub: 'Join Japanese labels and independent artists already using OTONAMI',
      btn: 'Start Your First Pitch →',
    },
    footer: {
      tagline: 'Connecting Japanese Music to the World',
      links: [
        { label: 'For Curators', href: '/curator' },
        { label: 'For Artists',  href: '/studio' },
        { label: 'Contact',      href: 'mailto:info@otonami.io' },
      ],
      copy: '© 2025 TYCompany LLC. All rights reserved.',
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
      sub: 'AIマッチングピッチ。リアルな音楽業界コネクション。\n日本のインディーミュージックシーンから生まれたプラットフォーム。',
      ctaPrimary: 'ピッチを始める →',
      ctaGhost: 'キュレーターとして参加',
    },
    stats: [
      { target: 3449, suffix: '',   l: 'Curators & Pros' },
      { target: 70,   suffix: '+',  l: 'ネットワーク内レーベル' },
      { target: 11,   suffix: '回', l: 'SXSW 連続出演' },
      { target: 6,    suffix: '',   l: '対応国' },
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
    mockup: { label: 'SEE IT IN ACTION' },
    trust: {
      label: 'TRUSTED BY',
      orgs: ['日本のインディーミュージックシーン', 'SXSW — 11年連続', 'ブルーノート東京'],
      quote: '"ミュージシャンが作り、ミュージシャンのために — 日本のインディーアーティストと世界の音楽コミュニティをつなぐプラットフォーム。"',
      quoteBy: '— 音楽業界プロフェッショナル',
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
      sub: 'すでに多くの日本のレーベルやアーティストが利用しています',
      btn: '最初のピッチを始める →',
    },
    footer: {
      tagline: '日本の音楽を世界へ',
      links: [
        { label: 'キュレーター向け', href: '/curator' },
        { label: 'アーティスト向け', href: '/studio' },
        { label: 'お問い合わせ',     href: 'mailto:info@otonami.io' },
      ],
      copy: '© 2025 TYCompany LLC. All rights reserved.',
      email: 'info@otonami.io',
    },
  },
};

/* ─────────────────────────────────────────
   Shared helpers
───────────────────────────────────────── */
const wrap = { maxWidth: 1200, margin: '0 auto', padding: '0 24px' };
const sectionLabel = (light = false) => ({
  fontSize: 11, fontWeight: 600, letterSpacing: '3px',
  color: '#c4956a', textTransform: 'uppercase', marginBottom: 20,
});

/* Animated count-up number */
function AnimatedNumber({ target, suffix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) { setCount(target); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const duration = 1400;
        const startTime = performance.now();
        const tick = (now) => {
          const p = Math.min((now - startTime) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setCount(Math.floor(eased * target));
          if (p < 1) requestAnimationFrame(tick);
          else setCount(target);
        };
        requestAnimationFrame(tick);
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* Subtle gold-coral gradient divider */
function Divider() {
  return (
    <div style={{ padding: '0', lineHeight: 0 }}>
      <div style={{
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(196,149,106,0.35), rgba(232,93,58,0.2), transparent)',
        maxWidth: 480,
        margin: '0 auto',
      }} />
    </div>
  );
}

/* SVG icons */
const WaveformIcon = () => (
  <svg width="36" height="28" viewBox="0 0 36 28" fill="none">
    <rect x="0"  y="12" width="3" height="4"  rx="1.5" fill="currentColor"/>
    <rect x="5"  y="7"  width="3" height="14" rx="1.5" fill="currentColor"/>
    <rect x="10" y="2"  width="3" height="24" rx="1.5" fill="currentColor"/>
    <rect x="15" y="6"  width="3" height="16" rx="1.5" fill="currentColor"/>
    <rect x="20" y="9"  width="3" height="10" rx="1.5" fill="currentColor"/>
    <rect x="25" y="4"  width="3" height="20" rx="1.5" fill="currentColor"/>
    <rect x="30" y="10" width="3" height="8"  rx="1.5" fill="currentColor"/>
  </svg>
);

const NetworkIcon = () => (
  <svg width="40" height="32" viewBox="0 0 40 32" fill="none">
    <circle cx="20" cy="16" r="4"   fill="currentColor"/>
    <circle cx="4"  cy="6"  r="3"   fill="currentColor" opacity="0.65"/>
    <circle cx="36" cy="6"  r="3"   fill="currentColor" opacity="0.65"/>
    <circle cx="4"  cy="26" r="3"   fill="currentColor" opacity="0.65"/>
    <circle cx="36" cy="26" r="3"   fill="currentColor" opacity="0.65"/>
    <line x1="20" y1="12" x2="7"  y2="8"  stroke="currentColor" strokeWidth="1.5" opacity="0.35"/>
    <line x1="20" y1="12" x2="33" y2="8"  stroke="currentColor" strokeWidth="1.5" opacity="0.35"/>
    <line x1="20" y1="20" x2="7"  y2="24" stroke="currentColor" strokeWidth="1.5" opacity="0.35"/>
    <line x1="20" y1="20" x2="33" y2="24" stroke="currentColor" strokeWidth="1.5" opacity="0.35"/>
  </svg>
);

const PaperPlaneIcon = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    <path d="M3 3L33 18L3 33L9 18L3 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none"/>
    <path d="M9 18H33" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const STEP_ICONS = [WaveformIcon, NetworkIcon, PaperPlaneIcon];

const ALBUMS = [
  { src: 'https://static.wixstatic.com/media/c9f54b_1ac3bea98a904944b632ed372c144fc0~mv2.jpg', title: 'ジブリカバー' },
  { src: 'https://static.wixstatic.com/media/c9f54b_167c45a5eacf4a2387f4a028cee4b64d~mv2.jpeg', title: 'Our Summer' },
  { src: 'https://static.wixstatic.com/media/c9f54b_6904fc63da034a24accc520787ded1ef~mv2.jpeg', title: "Ain't no Distance" },
  { src: 'https://static.wixstatic.com/media/c9f54b_d99da08f068d4ac087432af6172b3616~mv2.jpg', title: 'WHITE LINE' },
  { src: 'https://static.wixstatic.com/media/c9f54b_71c6a29f03f248b8afe6e48de2c311fd~mv2.jpg', title: 'Sepia' },
  { src: 'https://static.wixstatic.com/media/c9f54b_896f324d89d04ddcad06a9cbf0a86ebf~mv2.jpg', title: 'Feeling Good' },
];

/* ─────────────────────────────────────────
   Page
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
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [menuOpen]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const switchLang = (l) => { setLang(l); try { localStorage.setItem('otonami_locale', l); } catch {} };
  const t = COPY[lang];

  return (
    <div style={{ minHeight: '100vh', background: D.bg, fontFamily: D.fBody, color: D.text }}>

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
        .hero-line     { opacity: 0; animation: fadeInUp 0.7s ease forwards; }
        .hero-line:nth-child(1) { animation-delay: 0.12s; }
        .hero-line:nth-child(2) { animation-delay: 0.25s; }
        .hero-line:nth-child(3) { animation-delay: 0.38s; }
        .hero-tag-anim { opacity: 0; animation: fadeInUp 0.6s ease 0.02s forwards; }
        .hero-sub-anim { opacity: 0; animation: fadeInUp 0.6s ease 0.52s forwards; }
        .hero-cta-anim { opacity: 0; animation: fadeInUp 0.6s ease 0.64s forwards; }
        .hero-stat-anim{ opacity: 0; animation: fadeInUp 0.6s ease 0.78s forwards; }

        .cta-coral {
          background: #e85d3a; color: #fff; border: none;
          padding: 14px 28px; border-radius: 8px;
          font-size: 15px; font-weight: 600; cursor: pointer;
          transition: background 0.2s, transform 0.15s, box-shadow 0.15s;
          text-decoration: none; display: inline-block; font-family: inherit; white-space: nowrap;
        }
        .cta-coral:hover { background: #d04e2e; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(232,93,58,0.35); }

        .cta-ghost {
          background: transparent; color: ${D.textSec};
          border: 1px solid rgba(255,255,255,0.18);
          padding: 14px 28px; border-radius: 8px;
          font-size: 15px; font-weight: 500; cursor: pointer;
          transition: border-color 0.2s, color 0.2s, transform 0.15s;
          text-decoration: none; display: inline-block; font-family: inherit; white-space: nowrap;
        }
        .cta-ghost:hover { border-color: rgba(255,255,255,0.35); color: ${D.text}; transform: translateY(-2px); }

        .nav-link { color: ${D.textSec}; text-decoration: none; font-size: 13px; font-weight: 400; transition: color 0.2s; white-space: nowrap; }
        .nav-link:hover { color: ${D.text}; }

        /* Dark section feature rows */
        .feature-row { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 18px; }

        /* Trust orgs */
        .trust-org { color: ${D.textMuted}; font-size: 13px; font-weight: 500; letter-spacing: 0.5px; transition: color 0.2s; padding: 6px 0; white-space: nowrap; }
        .trust-org:hover { color: ${D.textSec}; }

        /* Dark theme card (Trust section) */
        .how-card-dark {
          background: ${D.surfaceAlt}; border: 1px solid ${D.border}; border-radius: 12px; padding: 32px 28px;
          transition: border-color 0.2s;
        }
        .how-card-dark:hover { border-color: rgba(196,149,106,0.3); }

        /* Light theme card (How It Works, For Curators) */
        .how-card-light {
          background: #fff; border: 1px solid rgba(0,0,0,0.08); border-radius: 12px; padding: 32px 28px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
          height: 100%;
        }
        .how-card-light:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); border-color: rgba(196,149,106,0.3); }

        /* Light feature rows */
        .feature-row-light { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 18px; }

        /* Responsive */
        @media (max-width: 768px) {
          .nav-desktop-links { display: none !important; }
          .hamburger-btn { display: flex !important; }
          .hero-h1 { font-size: 34px !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; gap: 28px 20px !important; }
          .how-grid { grid-template-columns: 1fr !important; }
          .two-col { grid-template-columns: 1fr !important; }
          .cta-group { flex-direction: column !important; width: 100% !important; }
          .cta-group .cta-coral,
          .cta-group .cta-ghost { width: 100% !important; text-align: center !important; }
          .trust-orgs { flex-direction: column !important; gap: 12px !important; }
          .section-pad { padding: 72px 0 !important; }
          .footer-links { flex-direction: column !important; gap: 12px !important; }
          .lang-toggle { display: none !important; }
        }
        @keyframes albumScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .album-scroll-track {
          display: flex; gap: 16px;
          animation: albumScroll 28s linear infinite;
          width: max-content;
        }
        .album-scroll-track:hover { animation-play-state: paused; }

        @media (max-width: 480px) {
          .hero-h1 { font-size: 28px !important; }
        }
      `}</style>

      {/* ── Mobile menu ── */}
      {menuOpen && (
        <div ref={menuRef} style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#181818', display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 64, borderBottom: `1px solid ${D.border}` }}>
            <span style={{ fontFamily: D.fHead, fontSize: 18, letterSpacing: '2px', color: D.text }}>OTONAMI</span>
            <button onClick={() => setMenuOpen(false)} style={{ background: 'none', border: 'none', color: D.textSec, fontSize: 28, cursor: 'pointer', lineHeight: 1, padding: 4 }}>✕</button>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 24 }}>
            {[{ href: '#how-it-works', label: t.nav.how }, { href: '/curator', label: t.nav.curators }, { href: '/studio', label: t.nav.artists }].map(item => (
              <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                style={{ color: D.textSec, textDecoration: 'none', fontSize: 20, fontWeight: 400, padding: '14px 0', borderBottom: `1px solid ${D.border}`, transition: 'color 0.2s' }}
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

      {/* ── Fixed Nav ── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        background: scrolled ? 'rgba(26,26,26,0.92)' : 'rgba(26,26,26,0.75)',
        backdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${D.border}`,
        transition: 'background 0.3s',
      }}>
        <div style={{ ...wrap, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <a href="/" style={{ textDecoration: 'none', fontFamily: D.fHead, fontSize: 20, letterSpacing: '2px', color: D.text, fontWeight: 500 }}>OTONAMI</a>
          <nav className="nav-desktop-links" style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
            <a href="#how-it-works" className="nav-link">{t.nav.how}</a>
            <a href="/curator"      className="nav-link">{t.nav.curators}</a>
            <a href="/studio"       className="nav-link">{t.nav.artists}</a>
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="lang-toggle" onClick={() => switchLang(lang === 'ja' ? 'en' : 'ja')} style={{
              background: 'none', border: `1px solid ${D.border}`, color: D.textMuted,
              fontSize: 11, fontWeight: 600, letterSpacing: '1px', padding: '6px 10px',
              borderRadius: 6, cursor: 'pointer', transition: 'border-color 0.2s, color 0.2s', fontFamily: D.fBody,
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = D.borderHover; e.currentTarget.style.color = D.textSec; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = D.border; e.currentTarget.style.color = D.textMuted; }}
            >{t.nav.lang}</button>
            <a href="/curator" className="cta-coral" style={{ padding: '8px 20px', fontSize: 13 }}>{t.nav.cta}</a>
            <button className="hamburger-btn" onClick={() => setMenuOpen(true)} style={{
              display: 'none', background: 'none', border: `1px solid ${D.border}`,
              borderRadius: 8, width: 44, height: 44, fontSize: 18, cursor: 'pointer',
              color: D.textSec, alignItems: 'center', justifyContent: 'center',
            }}>☰</button>
          </div>
        </div>
      </header>

      {/* ── Hero (DARK + photo) ── */}
      <section style={{
        backgroundImage: `linear-gradient(rgba(26,26,26,0.72), rgba(26,26,26,0.96)), url('/images/hero-sxsw-crowd.jpg')`,
        backgroundSize: 'cover', backgroundPosition: 'center 30%', backgroundRepeat: 'no-repeat',
        paddingTop: 160, paddingBottom: 100,
      }}>
        <div style={{ ...wrap, textAlign: 'center' }}>
          <div className="hero-tag-anim" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '3px', color: '#c4956a', textTransform: 'uppercase', marginBottom: 28 }}>
            {t.hero.tag}
          </div>
          <h1 className="hero-h1" style={{ fontFamily: D.fHead, fontSize: 52, fontWeight: 500, lineHeight: 1.2, color: D.text, marginBottom: 28, letterSpacing: '-0.5px' }}>
            {t.hero.h1.map((line, i) => <span key={i} className="hero-line" style={{ display: 'block' }}>{line}</span>)}
          </h1>
          <p className="hero-sub hero-sub-anim" style={{ fontSize: 18, color: D.textSec, lineHeight: 1.75, maxWidth: 520, margin: '0 auto 44px', whiteSpace: 'pre-line' }}>
            {t.hero.sub}
          </p>
          <div className="cta-group hero-cta-anim" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginBottom: 80, flexWrap: 'wrap' }}>
            <a href="/studio"  className="cta-coral" style={{ fontSize: 16, padding: '15px 32px' }}>{t.hero.ctaPrimary}</a>
            <a href="/curator" className="cta-ghost" style={{ fontSize: 16, padding: '15px 32px' }}>{t.hero.ctaGhost}</a>
          </div>
          {/* Stats — count-up animation */}
          <div className="stats-grid hero-stat-anim" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0 32px', maxWidth: 640, margin: '0 auto' }}>
            {t.stats.map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 36, fontWeight: 600, color: '#c4956a', fontFamily: D.fHead, lineHeight: 1 }}>
                  <AnimatedNumber target={s.target} suffix={s.suffix} />
                </div>
                <div style={{ fontSize: 11, color: D.textMuted, marginTop: 6, letterSpacing: '0.5px' }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works (LIGHT) ── */}
      <section id="how-it-works" style={{ background: L.bg, padding: '100px 0' }} className="section-pad">
        <div style={wrap}>
          <AnimatedSection>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <div style={sectionLabel()}>{t.how.label}</div>
              <h2 style={{ fontFamily: D.fHead, fontSize: 36, fontWeight: 500, color: L.text, lineHeight: 1.25 }}>{t.how.title}</h2>
            </div>
          </AnimatedSection>

          <div className="how-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
            {t.how.steps.map((step, i) => {
              const Icon = STEP_ICONS[i];
              return (
                <AnimatedSection key={i} delay={i * 100}>
                  <div className="how-card-light">
                    <div style={{ color: '#c4956a', marginBottom: 16 }}><Icon /></div>
                    <div style={{ fontFamily: D.fHead, fontSize: 42, color: '#c4956a', marginBottom: 16, lineHeight: 1, opacity: 0.9 }}>{step.num}</div>
                    <h3 style={{ fontSize: 17, fontWeight: 600, color: L.text, marginBottom: 12 }}>{step.t}</h3>
                    <p style={{ fontSize: 14, color: L.textSec, lineHeight: 1.7 }}>{step.d}</p>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── See It In Action / UI Mockup (LIGHT, continuous) ── */}
      <section style={{ background: L.bg, padding: '0 0 100px' }} className="section-pad">
        <div style={wrap}>
          <AnimatedSection>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <div style={sectionLabel()}>{t.mockup.label}</div>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={100}>
            <div style={{
              maxWidth: 820, margin: '0 auto',
              background: '#1a1a1a', borderRadius: 14,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
            }}>
              {/* Browser chrome */}
              <div style={{ background: '#2a2a2a', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
                </div>
                <div style={{ background: '#1a1a1a', borderRadius: 6, padding: '4px 16px', fontSize: 11, color: '#7a7870', flex: 1, textAlign: 'center' }}>
                  otonami.io/pitch
                </div>
              </div>

              {/* App content */}
              <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Row 1: Match score + Track analysis */}
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ background: '#222', borderRadius: 10, padding: '18px 20px', minWidth: 140, border: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: '#7a7870', marginBottom: 4, letterSpacing: '0.5px' }}>Match Score</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: '#4ade80', lineHeight: 1, marginBottom: 4 }}>92%</div>
                    <div style={{ fontSize: 11, color: '#4ade80' }}>Perfect Match</div>
                  </div>
                  <div style={{ background: '#222', borderRadius: 10, padding: '18px 20px', flex: 1, border: '1px solid rgba(255,255,255,0.06)', minWidth: 200 }}>
                    <div style={{ fontSize: 11, color: '#7a7870', marginBottom: 10, letterSpacing: '0.5px' }}>Track Analysis — AI Powered</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {[['⚡', 'High Energy'], ['💃', 'Danceable'], ['🎵', '128 BPM'], ['🌙', 'Atmospheric']].map(([icon, tag]) => (
                        <span key={tag} style={{ background: 'rgba(196,149,106,0.14)', color: '#c4956a', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>{icon} {tag}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Row 2: AI pitch preview */}
                <div style={{ background: '#222', borderRadius: 10, padding: '18px 20px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 11, color: '#7a7870', letterSpacing: '0.5px' }}>AI-Generated Pitch</span>
                    <span style={{ fontSize: 10, background: 'rgba(196,149,106,0.12)', color: '#c4956a', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>READY TO SEND</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#c0bdb5', lineHeight: 1.7, margin: 0 }}>
                    "ROUTE14band has achieved something remarkable — 11 consecutive SXSW appearances, establishing them as one of Japan's most internationally recognized jazz-funk exports. Their latest track blends high-energy rhythms with a cinematic atmosphere that would resonate perfectly with your playlist audience…"
                  </p>
                </div>

                {/* Row 3: Curator list preview */}
                <div style={{ display: 'flex', gap: 12 }}>
                  {[
                    { name: 'Indie Shuffle', type: 'Blog', country: '🇺🇸', match: '94%' },
                    { name: 'Majestic Casual', type: 'YouTube', country: '🇬🇧', match: '88%' },
                    { name: 'Koop Kooper', type: 'Spotify', country: '🇩🇪', match: '85%' },
                  ].map(c => (
                    <div key={c.name} style={{ background: '#222', borderRadius: 8, padding: '12px 14px', flex: 1, border: '1px solid rgba(255,255,255,0.06)', minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#f0ede6', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.country} {c.name}</div>
                      <div style={{ fontSize: 10, color: '#7a7870', marginBottom: 6 }}>{c.type}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#4ade80' }}>{c.match}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <Divider />

      {/* ── Trust / Social Proof (DARK) ── */}
      <section style={{ background: D.bg, padding: '100px 0' }} className="section-pad">
        <div style={wrap}>
          <AnimatedSection>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <div style={sectionLabel()}>{t.trust.label}</div>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={100}>
            <div className="trust-orgs" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 48, marginBottom: 64, flexWrap: 'wrap' }}>
              {t.trust.orgs.map((org, i) => <span key={i} className="trust-org">{org}</span>)}
            </div>
          </AnimatedSection>

          <div className="two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <AnimatedSection delay={200}>
              <div style={{ borderLeft: `3px solid #c4956a`, paddingLeft: 28 }}>
                <p style={{ fontFamily: D.fHead, fontStyle: 'italic', fontSize: 20, color: D.text, lineHeight: 1.6, marginBottom: 12 }}>
                  {t.trust.quote}
                </p>
                <p style={{ fontSize: 13, color: D.textMuted }}>{t.trust.quoteBy}</p>
              </div>
            </AnimatedSection>
            <AnimatedSection delay={300}>
              <img src="/images/sxsw-trumpet.jpg" alt="SXSW Performance"
                style={{ width: '100%', height: 320, objectFit: 'cover', borderRadius: 16, display: 'block' }} />
            </AnimatedSection>
          </div>
        </div>
      </section>

      <Divider />

      {/* ── For Curators (LIGHT) ── */}
      <section style={{ background: L.bg, padding: '100px 0' }} className="section-pad">
        <div style={wrap}>
          <div className="two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <AnimatedSection>
              <div>
                <div style={sectionLabel()}>{t.curators.label}</div>
                <h2 style={{ fontFamily: D.fHead, fontSize: 36, fontWeight: 500, color: L.text, lineHeight: 1.25, marginBottom: 16 }}>{t.curators.title}</h2>
                <p style={{ fontSize: 15, color: L.textSec, lineHeight: 1.7, marginBottom: 36 }}>{t.curators.sub}</p>
                <a href="/curator" className="cta-coral">{t.curators.cta}</a>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={120}>
              <div style={{ background: L.card, border: `1px solid ${L.border}`, borderRadius: 16, padding: '32px 28px', boxShadow: L.shadow }}>
                {t.curators.features.map((f, i) => (
                  <div key={i} className="feature-row-light">
                    <span style={{ color: '#c4956a', fontSize: 18, flexShrink: 0, marginTop: 1 }}>✦</span>
                    <span style={{ fontSize: 15, color: L.textSec, lineHeight: 1.65 }}>{f}</span>
                  </div>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      <Divider />

      {/* ── For Artists (DARK + photo) ── */}
      <section style={{ background: D.bg, padding: '100px 0' }} className="section-pad">
        <div style={wrap}>
          <div className="two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <AnimatedSection delay={120}>
              <div>
                <img src="/images/outdoor-live.jpg" alt="Live Performance"
                  style={{ width: '100%', height: 260, objectFit: 'cover', borderRadius: 16, display: 'block', marginBottom: 20 }} />
                <div style={{ background: D.surfaceAlt, border: `1px solid ${D.border}`, borderRadius: 16, padding: '28px 24px' }}>
                  {t.artists.features.map((f, i) => (
                    <div key={i} className="feature-row">
                      <span style={{ color: '#c4956a', fontSize: 18, flexShrink: 0, marginTop: 1 }}>✦</span>
                      <span style={{ fontSize: 15, color: D.textSec, lineHeight: 1.65 }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection>
              <div>
                <div style={sectionLabel()}>{t.artists.label}</div>
                <h2 style={{ fontFamily: D.fHead, fontSize: 36, fontWeight: 500, color: D.text, lineHeight: 1.25, marginBottom: 16 }}>{t.artists.title}</h2>
                <p style={{ fontSize: 15, color: D.textSec, lineHeight: 1.7, marginBottom: 36 }}>{t.artists.sub}</p>
                <a href="/studio" className="cta-coral">{t.artists.cta}</a>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ── Album scroll band (DARK) ── */}
      <section style={{ background: '#1a1a1a', padding: '60px 0', overflow: 'hidden' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '3px', color: '#c4956a', textTransform: 'uppercase' }}>
            MUSIC ON OTONAMI
          </div>
        </div>
        <div style={{ position: 'relative', width: '100%' }}>
          {/* fade edges */}
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 80, background: 'linear-gradient(90deg, #1a1a1a, transparent)', zIndex: 1, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, background: 'linear-gradient(270deg, #1a1a1a, transparent)', zIndex: 1, pointerEvents: 'none' }} />
          <div className="album-scroll-track">
            {[...ALBUMS, ...ALBUMS].map((album, i) => (
              <div key={i} style={{ minWidth: 160, height: 160, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
                <img src={album.src} alt={album.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner (gradient) ── */}
      <section style={{
        background: 'linear-gradient(135deg, #c4956a 0%, #e85d3a 100%)',
        padding: '80px 0',
      }}>
        <AnimatedSection>
          <div style={{ ...wrap, textAlign: 'center' }}>
            <h2 style={{ fontFamily: D.fHead, fontSize: 40, fontWeight: 500, color: '#fff', marginBottom: 12 }}>{t.cta.title}</h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', marginBottom: 36 }}>{t.cta.sub}</p>
            <a href="/studio" style={{
              background: '#fff', color: '#2c1810', border: 'none',
              padding: '16px 36px', borderRadius: 8, fontSize: 16, fontWeight: 700,
              cursor: 'pointer', textDecoration: 'none', display: 'inline-block',
              transition: 'transform 0.15s, box-shadow 0.15s',
              fontFamily: D.fBody,
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >{t.cta.btn}</a>
          </div>
        </AnimatedSection>
      </section>

      {/* ── Footer (DARK) ── */}
      <footer style={{ background: '#151515', padding: '60px 0 40px', borderTop: `1px solid ${D.border}` }}>
        <div style={wrap}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 32, flexWrap: 'wrap', marginBottom: 48 }}>
            <div>
              <div style={{ fontFamily: D.fHead, fontSize: 22, letterSpacing: '2px', color: '#c4956a', marginBottom: 8 }}>OTONAMI</div>
              <div style={{ fontSize: 13, color: D.textMuted, lineHeight: 1.6 }}>{t.footer.tagline}</div>
            </div>
            <nav className="footer-links" style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
              {t.footer.links.map((l, i) => (
                <a key={i} href={l.href} style={{ color: D.textMuted, textDecoration: 'none', fontSize: 13, transition: 'color 0.2s' }}
                  onMouseEnter={e => e.target.style.color = D.textSec}
                  onMouseLeave={e => e.target.style.color = D.textMuted}
                >{l.label}</a>
              ))}
            </nav>
          </div>
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
