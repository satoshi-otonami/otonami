'use client';
import { useEffect, useRef, useState } from 'react';

/* ── i18n ── */
const COPY = {
  en: {
    navHow: 'How It Works', navArtists: 'For Artists', navCta: 'Join as Curator',
    heroTag: 'Curator Network — AI-Powered Matching',
    heroH1a: "Discover Japan's Best", heroH1b: 'Independent Music',
    heroSub: "OTONAMI connects you with handpicked Japanese indie artists. Get paid to review. No spam — only quality pitches matched to your taste.",
    ctaPrimary: 'Join as Curator →', ctaGhost: 'See How It Works',
    whyLabel: 'Why OTONAMI', whyTitle: 'Built for Curators Who Value Quality',
    whySub: 'We filter the noise so you only hear music that genuinely fits your audience.',
    why1Title: 'AI-Matched Pitches', why1Body: "Our matching engine analyzes genre, mood, and audio features to send you only the music that fits your playlist's style — not random submissions.",
    why2Title: 'Get Paid to Listen', why2Body: 'Earn $3–5 per review, paid directly via PayPal. Transparent, guaranteed compensation for your time and expertise.',
    why3Title: "Japan's Hidden Gems", why3Body: "Access 70+ independent labels through ILCJ, Japan's largest indie label coalition. Discover artists before they go global.",
    galLabel: 'Real Artists, Real Stages', galTitle: 'From Japan to the World Stage',
    galSub: 'OTONAMI artists have performed at SXSW, Chili Jazz Festival, Blue Note Tokyo, and international stages.',
    howLabel: 'How It Works', howTitle: 'Three Steps to Start Discovering',
    howSub: 'Sign up in minutes. We handle the curation so you can focus on the music.',
    step1Title: 'Sign up and set your preferences', step1Body: 'Tell us your genres, moods, and share your playlist URL. Takes under 3 minutes.',
    step2Title: 'Receive AI-matched pitches', step2Body: "Our Match Score engine compares each artist's audio features, genre, and mood against your profile. Only high-match submissions reach your inbox.",
    step3Title: 'Review, earn, and discover', step3Body: 'Listen, leave feedback, and get paid via PayPal. Build direct relationships with Japanese artists and labels.',
    statsLabel: 'Backed by the Industry', statsTitle: "Japan's Indie Scene, Curated for You",
    stat1Label: 'Independent Labels\nvia ILCJ', stat2Label: 'Artists Featured at\nSXSW & Blue Note Tokyo',
    stat3Label: 'Powered by Audio\nMatch Score Technology', stat4Label: 'Earned Per Review\nvia PayPal',
    artLabel: 'For Artists & Labels', artTitle: 'Are you a Japanese artist or label?',
    artBody: 'OTONAMI helps you reach international curators with AI-generated English pitches. Input your track, get a professional pitch email, and submit to curators who match your sound — in minutes.',
    artCta: 'Submit Your Music →',
    footerTagline: 'Connecting Japanese Music to the World', footerBy: 'A project by TYCompany LLC / ILCJ',
    footerLink1: 'Curator Sign Up', footerLink2: 'Submit Music', footerLink3: 'Contact',
  },
  ja: {
    navHow: '使い方', navArtists: 'アーティストの方', navCta: 'キュレーター登録',
    heroTag: 'キュレーターネットワーク — AIマッチング搭載',
    heroH1a: '日本のインディー音楽を、', heroH1b: '世界のキュレーターへ',
    heroSub: 'OTONAMIは厳選された日本のインディーアーティストとキュレーターをつなぎます。レビューで報酬を獲得。スパムなし — あなたの好みにマッチした楽曲だけが届きます。',
    ctaPrimary: 'キュレーターとして参加 →', ctaGhost: '使い方を見る',
    whyLabel: 'なぜOTONAMI？', whyTitle: 'クオリティを重視するキュレーターのために',
    whySub: 'ノイズをフィルタリングし、あなたのオーディエンスに本当に合う音楽だけをお届けします。',
    why1Title: 'AIマッチングピッチ', why1Body: 'ジャンル・ムード・音響特性を分析し、あなたのプレイリストに合った楽曲だけを送信。ランダムな投稿は届きません。',
    why2Title: '聴いて報酬を獲得', why2Body: '1件のレビューで$3〜5をPayPalで直接受け取れます。透明性があり、保証された報酬体系です。',
    why3Title: '日本の隠れた名曲', why3Body: '日本最大のインディーレーベル連合ILCJを通じて70以上のレーベルにアクセス。世界進出前のアーティストをいち早く発見しましょう。',
    galLabel: 'リアルなアーティスト、リアルなステージ', galTitle: '日本から世界のステージへ',
    galSub: 'OTONAMIのアーティストはSXSW、チリジャズフェスティバル、Blue Note東京など国際的なステージに出演しています。',
    howLabel: '使い方', howTitle: '3ステップで始める',
    howSub: '数分で登録完了。キュレーションはOTONAMIが担当するので、音楽に集中できます。',
    step1Title: '登録してジャンルを設定', step1Body: 'ジャンル・ムード・プレイリストURLを教えてください。3分以内で完了。',
    step2Title: 'AIマッチのピッチを受信', step2Body: 'Match Scoreエンジンがアーティストの音響特性・ジャンル・ムードをあなたの設定と比較。高マッチのピッチだけが届きます。',
    step3Title: 'レビュー・報酬・発見', step3Body: '聴いてフィードバックを残し、PayPalで報酬を受け取りましょう。日本のアーティスト・レーベルと直接つながれます。',
    statsLabel: '業界に支持されたプラットフォーム', statsTitle: '日本のインディーシーン、キュレーションして世界へ',
    stat1Label: 'ILCJ加盟\nインディーレーベル数', stat2Label: 'SXSW・Blue Note Tokyo\n出演アーティスト',
    stat3Label: 'AI音楽マッチング\n技術搭載', stat4Label: '1レビューの報酬\nPayPalにて',
    artLabel: 'アーティスト・レーベルの方へ', artTitle: '日本のアーティスト・レーベルの方へ',
    artBody: 'OTONAMIはAI生成の英語ピッチメールで、日本のアーティストが海外キュレーターにリーチするお手伝いをします。楽曲を入力してプロのピッチメールを生成、相性の良いキュレーターに数分で送信できます。',
    artCta: '楽曲を投稿する →',
    footerTagline: '日本の音楽を世界へ', footerBy: 'TYCompany LLC / ILCJ プロジェクト',
    footerLink1: 'キュレーター登録', footerLink2: '楽曲を投稿', footerLink3: 'お問い合わせ',
  },
};

function useFadeIn() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add('visible'); obs.disconnect(); } }, { threshold: 0.1 });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  return ref;
}

function useCountUp(target, duration = 1400) {
  const ref = useRef(null); const started = useRef(false);
  useEffect(() => {
    started.current = false;
    const el = ref.current; if (!el) return;
    const isNum = /^\d+$/.test(String(target));
    if (!isNum) { el.textContent = target; return; }
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const n = parseInt(target), start = performance.now();
        const tick = (now) => { const p = Math.min((now - start) / duration, 1), ease = 1 - Math.pow(1 - p, 3); el.textContent = Math.floor(ease * n) + '+'; if (p < 1) requestAnimationFrame(tick); else el.textContent = n + '+'; };
        requestAnimationFrame(tick); obs.disconnect();
      }
    }, { threshold: 0.3 });
    obs.observe(el); return () => obs.disconnect();
  }, [target, duration]);
  return ref;
}

export default function HomePage() {
  const [locale, setLocale] = useState('en');
  const t = COPY[locale];

  useEffect(() => {
    try {
      const saved = localStorage.getItem('otonami_locale');
      if (saved === 'ja' || saved === 'en') { setLocale(saved); return; }
      if (navigator.language?.startsWith('ja')) setLocale('ja');
    } catch {}
  }, []);

  const switchLocale = (l) => { setLocale(l); try { localStorage.setItem('otonami_locale', l); } catch {} };

  const whyRef = useFadeIn(), galRef = useFadeIn(), howRef = useFadeIn(), statsRef = useFadeIn(), artRef = useFadeIn();
  const cnt70 = useCountUp(70);

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root { --green:#10b981;--green-d:#059669;--purple:#6366f1;--dark:#07070f;--dark2:#0f0f1e;--light:#f8fafc;--white:#ffffff;--text:#0f172a;--muted:#64748b;--border:#e2e8f0; }
        html { scroll-behavior: smooth; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--white); color: var(--text); }
        .fade-section { opacity: 0; transform: translateY(24px); transition: opacity 0.65s ease, transform 0.65s ease; }
        .fade-section.visible { opacity: 1; transform: none; }

        /* Nav */
        .nav { position: sticky; top: 0; z-index: 99; background: rgba(7,7,15,0.92); backdrop-filter: blur(14px); border-bottom: 1px solid rgba(255,255,255,0.07); }
        .nav-inner { max-width: 1100px; margin: 0 auto; padding: 0 1.5rem; display: flex; align-items: center; justify-content: space-between; height: 62px; gap: 0.75rem; }
        .logo { font-size: 1.15rem; font-weight: 900; letter-spacing: -0.02em; background: linear-gradient(135deg,var(--green),var(--purple)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; text-decoration: none; flex-shrink: 0; }
        .nav-links { display: flex; align-items: center; gap: 1.25rem; }
        .nav-link { font-size: 0.83rem; color: #94a3b8; text-decoration: none; white-space: nowrap; }
        .nav-link:hover { color: #f1f5f9; }
        .btn-nav { font-size: 0.83rem; font-weight: 700; padding: 0.48rem 1.1rem; background: linear-gradient(135deg,var(--green),var(--green-d)); color: #fff; border-radius: 8px; text-decoration: none; white-space: nowrap; }
        .btn-nav:hover { opacity: 0.88; }
        .lang-toggle { display: flex; align-items: center; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; overflow: hidden; flex-shrink: 0; }
        .lang-btn { font-size: 0.75rem; font-weight: 600; padding: 0.3rem 0.55rem; background: none; color: #64748b; border: none; cursor: pointer; font-family: inherit; transition: background 0.12s, color 0.12s; }
        .lang-btn.active { background: rgba(255,255,255,0.12); color: #f1f5f9; }
        .lang-sep { width: 1px; background: rgba(255,255,255,0.15); height: 18px; flex-shrink: 0; }

        /* Hero */
        .hero {
          position: relative; overflow: hidden; padding: 7rem 1.5rem 5.5rem; text-align: center;
          background: linear-gradient(rgba(7,7,15,0.62), rgba(7,7,15,0.75)), url('/images/hero-sxsw-crowd.jpg') center / cover no-repeat;
          background-color: var(--dark);
        }
        .hero::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse 70% 55% at 50% 30%, rgba(99,102,241,0.18) 0%, transparent 65%); }
        .hero-inner { position: relative; z-index: 1; max-width: 780px; margin: 0 auto; }
        .hero-tag { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: var(--green); border: 1px solid rgba(16,185,129,0.4); padding: 0.32rem 0.9rem; border-radius: 20px; margin-bottom: 1.75rem; background: rgba(16,185,129,0.08); }
        .hero-tag::before { content: '♪'; font-size: 0.85rem; }
        .hero h1 { font-size: clamp(2.2rem, 5.5vw, 3.6rem); font-weight: 900; line-height: 1.1; letter-spacing: -0.03em; color: #f1f5f9; margin-bottom: 1.35rem; }
        .hero h1 em { font-style: normal; background: linear-gradient(135deg,var(--green),var(--purple)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .hero-sub { font-size: clamp(1rem, 2.5vw, 1.15rem); color: #cbd5e1; line-height: 1.7; max-width: 600px; margin: 0 auto 2.5rem; }
        .cta-group { display: flex; gap: 0.9rem; justify-content: center; flex-wrap: wrap; }
        .btn-primary { font-size: 1.05rem; font-weight: 800; padding: 1rem 2.25rem; background: linear-gradient(135deg,var(--green),var(--green-d)); color: #fff; border-radius: 14px; text-decoration: none; box-shadow: 0 4px 24px rgba(16,185,129,0.4); transition: transform 0.15s, box-shadow 0.15s; display: inline-block; }
        .btn-primary:hover { transform: translateY(-3px); box-shadow: 0 8px 32px rgba(16,185,129,0.5); }
        .btn-ghost { font-size: 1rem; font-weight: 600; padding: 1rem 2rem; color: #e2e8f0; border: 1px solid rgba(255,255,255,0.2); border-radius: 14px; text-decoration: none; transition: background 0.15s; display: inline-block; background: rgba(255,255,255,0.06); }
        .btn-ghost:hover { background: rgba(255,255,255,0.12); }
        .hero-bars { display: flex; align-items: flex-end; justify-content: center; gap: 4px; margin-top: 3rem; height: 36px; opacity: 0.22; }
        .hero-bar { width: 4px; border-radius: 2px; background: linear-gradient(to top, var(--green), var(--purple)); animation: pulse-bar 1.2s ease-in-out infinite alternate; }
        .hero-bar:nth-child(1){height:30%;animation-delay:0s}.hero-bar:nth-child(2){height:70%;animation-delay:.1s}.hero-bar:nth-child(3){height:50%;animation-delay:.2s}.hero-bar:nth-child(4){height:90%;animation-delay:.3s}.hero-bar:nth-child(5){height:60%;animation-delay:.4s}.hero-bar:nth-child(6){height:100%;animation-delay:.5s}.hero-bar:nth-child(7){height:75%;animation-delay:.6s}.hero-bar:nth-child(8){height:45%;animation-delay:.7s}.hero-bar:nth-child(9){height:80%;animation-delay:.8s}.hero-bar:nth-child(10){height:55%;animation-delay:.9s}.hero-bar:nth-child(11){height:35%;animation-delay:1s}.hero-bar:nth-child(12){height:65%;animation-delay:1.1s}.hero-bar:nth-child(13){height:40%;animation-delay:1.2s}.hero-bar:nth-child(14){height:85%;animation-delay:1.3s}.hero-bar:nth-child(15){height:25%;animation-delay:1.4s}.hero-bar:nth-child(16){height:60%;animation-delay:1.5s}
        @keyframes pulse-bar { to { transform: scaleY(0.3); } }

        /* Section shell */
        .section { padding: 6rem 1.5rem; }
        .section-light { background: var(--light); }
        .section-white { background: var(--white); }
        .wrap { max-width: 1100px; margin: 0 auto; }
        .section-label { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--purple); margin-bottom: 0.6rem; }
        .section-title { font-size: clamp(1.6rem, 3.5vw, 2.2rem); font-weight: 900; letter-spacing: -0.025em; margin-bottom: 0.8rem; }
        .section-sub { font-size: 1rem; color: var(--muted); line-height: 1.7; max-width: 540px; }
        .divider { border: none; border-top: 1px solid var(--border); }

        /* Why cards */
        .why-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem; margin-top: 2.75rem; }
        .why-card { background: var(--white); border: 1px solid var(--border); border-radius: 20px; padding: 2rem 1.75rem; transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s; }
        .why-card:hover { transform: translateY(-6px); box-shadow: 0 16px 40px rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.3); }
        .why-icon { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin-bottom: 1rem; }
        .why-icon-green { background: rgba(16,185,129,0.1); } .why-icon-purple { background: rgba(99,102,241,0.1); } .why-icon-blue { background: rgba(59,130,246,0.1); }
        .why-card h3 { font-size: 1.05rem; font-weight: 800; margin-bottom: 0.5rem; }
        .why-card p { font-size: 0.88rem; color: var(--muted); line-height: 1.7; }

        /* Photo gallery */
        .gallery-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 2.5rem; }
        .gallery-img-wrap { overflow: hidden; border-radius: 16px; aspect-ratio: 4/3; }
        .gallery-img-wrap img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease; display: block; }
        .gallery-img-wrap:hover img { transform: scale(1.06); }
        @media (max-width: 640px) { .gallery-grid { grid-template-columns: 1fr 1fr; } .gallery-grid .gallery-img-wrap:last-child { display: none; } }

        /* How It Works */
        .steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem; margin-top: 2.75rem; }
        .step-card { background: var(--white); border: 1px solid var(--border); border-radius: 20px; padding: 2rem 1.75rem; transition: transform 0.2s, box-shadow 0.2s; }
        .step-card:hover { transform: translateY(-5px); box-shadow: 0 12px 32px rgba(0,0,0,0.07); }
        .step-num { width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg,var(--purple),var(--green)); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; font-weight: 900; color: #fff; margin-bottom: 1.1rem; box-shadow: 0 4px 16px rgba(99,102,241,0.25); }
        .step-card h3 { font-size: 1rem; font-weight: 800; margin-bottom: 0.5rem; }
        .step-card p { font-size: 0.87rem; color: var(--muted); line-height: 1.7; }

        /* Stats band */
        .stats-band { background: linear-gradient(135deg,var(--dark2) 0%,#111134 100%); padding: 5rem 1.5rem; position: relative; overflow: hidden; }
        .stats-band::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 70% 80% at 50% 50%, rgba(99,102,241,0.12) 0%, transparent 70%); pointer-events: none; }
        .stats-inner { max-width: 1100px; margin: 0 auto; position: relative; z-index: 1; }
        .stats-layout { display: grid; grid-template-columns: 1fr auto; gap: 3rem; align-items: center; }
        .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 2rem; margin-top: 2.5rem; }
        .stat { }
        .stat-num { font-size: 2.5rem; font-weight: 900; line-height: 1; background: linear-gradient(135deg,var(--green),var(--purple)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 0.45rem; }
        .stat-label { font-size: 0.83rem; color: #64748b; line-height: 1.5; white-space: pre-line; }
        .stats-band .section-title { color: #f1f5f9; }
        .stats-band .section-label { color: var(--green); }
        .stats-photo { width: 280px; border-radius: 16px; overflow: hidden; flex-shrink: 0; box-shadow: 0 8px 40px rgba(0,0,0,0.4); }
        .stats-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
        @media (max-width: 900px) { .stats-layout { grid-template-columns: 1fr; } .stats-photo { display: none; } .stats-grid { grid-template-columns: repeat(2,1fr); } }

        /* For Artists */
        .artist-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: center; }
        .artist-text .section-label { margin-bottom: 0.45rem; }
        .artist-text h2 { font-size: clamp(1.4rem, 3vw, 2rem); font-weight: 900; margin-bottom: 0.7rem; }
        .artist-text p { font-size: 0.92rem; color: var(--muted); line-height: 1.75; margin-bottom: 1.5rem; }
        .btn-artist { font-size: 0.95rem; font-weight: 800; padding: 0.9rem 1.75rem; background: linear-gradient(135deg,var(--green),var(--green-d)); color: #fff; border-radius: 12px; text-decoration: none; box-shadow: 0 4px 16px rgba(16,185,129,0.28); transition: transform 0.15s, box-shadow 0.15s; display: inline-block; }
        .btn-artist:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(16,185,129,0.4); }
        .artist-photo { border-radius: 20px; overflow: hidden; box-shadow: 0 12px 48px rgba(0,0,0,0.12); }
        .artist-photo img { width: 100%; height: 100%; object-fit: cover; display: block; aspect-ratio: 16/10; }
        @media (max-width: 768px) { .artist-layout { grid-template-columns: 1fr; } .artist-photo { order: -1; } }

        /* Footer */
        .footer { background: var(--dark); border-top: 1px solid rgba(255,255,255,0.07); padding: 3rem 1.5rem; }
        .footer-inner { max-width: 1100px; margin: 0 auto; display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 2rem; }
        .footer-logo { font-size: 1rem; font-weight: 900; background: linear-gradient(135deg,var(--green),var(--purple)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; display: inline-block; margin-bottom: 0.4rem; }
        .footer-copy { font-size: 0.78rem; color: #334155; line-height: 1.6; margin-top: 0.35rem; }
        .footer-links { display: flex; gap: 1.5rem; flex-wrap: wrap; align-items: center; }
        .footer-link { font-size: 0.8rem; color: #475569; text-decoration: none; }
        .footer-link:hover { color: #94a3b8; }

        @media (max-width: 640px) {
          .hero { padding: 4.5rem 1.25rem 3.5rem; }
          .section { padding: 4rem 1.25rem; }
          .nav-links .nav-link { display: none; }
          .footer-inner { flex-direction: column; }
        }
      `}</style>

      {/* ── Nav ── */}
      <nav className="nav">
        <div className="nav-inner">
          <a href="/" className="logo">OTONAMI</a>
          <div className="nav-links">
            <a href="#how-it-works" className="nav-link">{t.navHow}</a>
            <a href="#for-artists" className="nav-link">{t.navArtists}</a>
            <div className="lang-toggle" role="group" aria-label="Language">
              <button className={`lang-btn${locale==='en'?' active':''}`} onClick={()=>switchLocale('en')}>EN</button>
              <div className="lang-sep" aria-hidden="true"/>
              <button className={`lang-btn${locale==='ja'?' active':''}`} onClick={()=>switchLocale('ja')}>日本語</button>
            </div>
            <a href="/curator" className="btn-nav">{t.navCta}</a>
          </div>
        </div>
      </nav>

      {/* ── Hero (background photo) ── */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-tag">{t.heroTag}</div>
          <h1>{t.heroH1a}<br/><em>{t.heroH1b}</em></h1>
          <p className="hero-sub">{t.heroSub}</p>
          <div className="cta-group">
            <a href="/curator" className="btn-primary">{t.ctaPrimary}</a>
            <a href="#how-it-works" className="btn-ghost">{t.ctaGhost}</a>
          </div>
          <div className="hero-bars" aria-hidden="true">
            {Array.from({length:16}).map((_,i)=><div key={i} className="hero-bar"/>)}
          </div>
        </div>
      </section>

      {/* ── Why OTONAMI ── */}
      <section className="section section-light">
        <div className="wrap">
          <div ref={whyRef} className="fade-section">
            <div className="section-label">{t.whyLabel}</div>
            <h2 className="section-title">{t.whyTitle}</h2>
            <p className="section-sub">{t.whySub}</p>
            <div className="why-grid">
              <div className="why-card"><div className="why-icon why-icon-purple">&#127919;</div><h3>{t.why1Title}</h3><p>{t.why1Body}</p></div>
              <div className="why-card"><div className="why-icon why-icon-green">&#128176;</div><h3>{t.why2Title}</h3><p>{t.why2Body}</p></div>
              <div className="why-card"><div className="why-icon why-icon-blue">&#127470;&#127477;</div><h3>{t.why3Title}</h3><p>{t.why3Body}</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Photo Gallery ── */}
      <section className="section section-white">
        <div className="wrap">
          <div ref={galRef} className="fade-section">
            <div className="section-label">{t.galLabel}</div>
            <h2 className="section-title">{t.galTitle}</h2>
            <p className="section-sub">{t.galSub}</p>
            <div className="gallery-grid">
              <div className="gallery-img-wrap">
                <img src="/images/sxsw-trumpet.jpg" alt="ROUTE14band members with instruments including trumpet" loading="lazy"/>
              </div>
              <div className="gallery-img-wrap">
                <img src="/images/outdoor-live.jpg" alt="ROUTE14band outdoor live performance on stage" loading="lazy"/>
              </div>
              <div className="gallery-img-wrap">
                <img src="/images/stage-performance.jpg" alt="ROUTE14band full band stage performance" loading="lazy"/>
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr className="divider"/>

      {/* ── How It Works ── */}
      <section className="section section-light" id="how-it-works">
        <div className="wrap">
          <div ref={howRef} className="fade-section">
            <div className="section-label">{t.howLabel}</div>
            <h2 className="section-title">{t.howTitle}</h2>
            <p className="section-sub">{t.howSub}</p>
            <div className="steps">
              <div className="step-card"><div className="step-num">1</div><h3>{t.step1Title}</h3><p>{t.step1Body}</p></div>
              <div className="step-card"><div className="step-num">2</div><h3>{t.step2Title}</h3><p>{t.step2Body}</p></div>
              <div className="step-card"><div className="step-num">3</div><h3>{t.step3Title}</h3><p>{t.step3Body}</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats band (with side photo) ── */}
      <div className="stats-band">
        <div className="stats-inner">
          <div ref={statsRef} className="fade-section">
            <div className="stats-layout">
              <div>
                <div className="section-label">{t.statsLabel}</div>
                <h2 className="section-title">{t.statsTitle}</h2>
                <div className="stats-grid">
                  <div className="stat"><div className="stat-num" ref={cnt70}>70+</div><div className="stat-label">{t.stat1Label}</div></div>
                  <div className="stat"><div className="stat-num">SXSW</div><div className="stat-label">{t.stat2Label}</div></div>
                  <div className="stat"><div className="stat-num">AI</div><div className="stat-label">{t.stat3Label}</div></div>
                  <div className="stat"><div className="stat-num">$3–5</div><div className="stat-label">{t.stat4Label}</div></div>
                </div>
              </div>
              <div className="stats-photo" aria-hidden="true">
                <img src="/images/sxsw-trumpet.jpg" alt="ROUTE14band trumpet player at SXSW 2025 showcase" loading="lazy"/>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── For Artists (2-col with photo) ── */}
      <section className="section section-white" id="for-artists">
        <div className="wrap">
          <div ref={artRef} className="fade-section">
            <div className="artist-layout">
              <div className="artist-text">
                <div className="section-label">{t.artLabel}</div>
                <h2>{t.artTitle}</h2>
                <p>{t.artBody}</p>
                <a href="/studio" className="btn-artist">{t.artCta}</a>
              </div>
              <div className="artist-photo">
                <img src="/images/stage-performance.jpg" alt="ROUTE14band performing at Chili Jazz Festival outdoor stage" loading="lazy"/>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="footer">
        <div className="footer-inner">
          <div>
            <div className="footer-logo">OTONAMI</div>
            <div className="footer-copy">{t.footerTagline}<br/>{t.footerBy}</div>
          </div>
          <div className="footer-links">
            <a href="/curator" className="footer-link">{t.footerLink1}</a>
            <a href="/studio" className="footer-link">{t.footerLink2}</a>
            <a href="mailto:info@otonami.jp" className="footer-link">{t.footerLink3}</a>
          </div>
        </div>
      </footer>
    </>
  );
}
