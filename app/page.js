'use client';
import { useEffect, useRef } from 'react';

/* ── Intersection Observer hook for fade-in ── */
function useFadeIn() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.add('visible'); obs.disconnect(); }
    }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

/* ── Counter animation hook ── */
function useCountUp(target, duration = 1400) {
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const isNum = /^\d+$/.test(String(target));
        if (!isNum) { el.textContent = target; obs.disconnect(); return; }
        const n = parseInt(target);
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.floor(ease * n) + '+';
          if (p < 1) requestAnimationFrame(tick);
          else el.textContent = n + '+';
        };
        requestAnimationFrame(tick);
        obs.disconnect();
      }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, duration]);
  return ref;
}

export default function HomePage() {
  const whyRef   = useFadeIn();
  const howRef   = useFadeIn();
  const statsRef = useFadeIn();
  const artRef   = useFadeIn();

  const cnt70  = useCountUp(70);
  const cntFes = useRef(null);
  useEffect(() => { if (cntFes.current) cntFes.current.textContent = 'SXSW'; }, []);

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --green: #10b981; --green-d: #059669;
          --purple: #6366f1; --purple-d: #4f46e5;
          --dark: #07070f; --dark2: #0f0f1e;
          --light: #f8fafc; --white: #ffffff;
          --text: #0f172a; --muted: #64748b; --border: #e2e8f0;
        }
        html { scroll-behavior: smooth; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--white); color: var(--text); }

        /* ── Fade-in animation ── */
        .fade-section { opacity: 0; transform: translateY(28px); transition: opacity 0.6s ease, transform 0.6s ease; }
        .fade-section.visible { opacity: 1; transform: none; }

        /* ── Nav ── */
        .nav { position: sticky; top: 0; z-index: 99; background: rgba(7,7,15,0.9); backdrop-filter: blur(14px); border-bottom: 1px solid rgba(255,255,255,0.07); }
        .nav-inner { max-width: 1100px; margin: 0 auto; padding: 0 1.5rem; display: flex; align-items: center; justify-content: space-between; height: 62px; }
        .logo { font-size: 1.15rem; font-weight: 900; letter-spacing: -0.02em; background: linear-gradient(135deg,var(--green),var(--purple)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; text-decoration: none; }
        .nav-links { display: flex; align-items: center; gap: 1.5rem; }
        .nav-link { font-size: 0.83rem; color: #94a3b8; text-decoration: none; }
        .nav-link:hover { color: #f1f5f9; }
        .btn-nav { font-size: 0.83rem; font-weight: 700; padding: 0.48rem 1.1rem; background: linear-gradient(135deg,var(--green),var(--green-d)); color: #fff; border-radius: 8px; text-decoration: none; }
        .btn-nav:hover { opacity: 0.88; }

        /* ── Hero ── */
        .hero { background: var(--dark); position: relative; overflow: hidden; padding: 6rem 1.5rem 5rem; text-align: center; }
        /* mesh gradient background */
        .hero::before {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 80% 60% at 20% 10%, rgba(99,102,241,0.22) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 80% 90%, rgba(16,185,129,0.18) 0%, transparent 55%),
            radial-gradient(ellipse 50% 40% at 50% 50%, rgba(99,102,241,0.08) 0%, transparent 60%);
        }
        /* subtle waveform dots pattern */
        .hero::after {
          content: ''; position: absolute; inset: 0; pointer-events: none; opacity: 0.04;
          background-image: radial-gradient(circle, #fff 1px, transparent 1px);
          background-size: 28px 28px;
        }
        .hero-inner { position: relative; z-index: 1; max-width: 780px; margin: 0 auto; }
        .hero-tag { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: var(--green); border: 1px solid rgba(16,185,129,0.4); padding: 0.32rem 0.9rem; border-radius: 20px; margin-bottom: 1.75rem; background: rgba(16,185,129,0.06); }
        .hero-tag::before { content: '♪'; font-size: 0.85rem; }
        .hero h1 { font-size: clamp(2.2rem, 5.5vw, 3.5rem); font-weight: 900; line-height: 1.1; letter-spacing: -0.03em; color: #f1f5f9; margin-bottom: 1.35rem; }
        .hero h1 em { font-style: normal; background: linear-gradient(135deg,var(--green) 0%,var(--purple) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .hero-sub { font-size: clamp(1rem, 2.5vw, 1.15rem); color: #94a3b8; line-height: 1.7; max-width: 600px; margin: 0 auto 2.5rem; }
        .cta-group { display: flex; gap: 0.9rem; justify-content: center; flex-wrap: wrap; }
        .btn-primary { font-size: 1.05rem; font-weight: 800; padding: 1rem 2.25rem; background: linear-gradient(135deg,var(--green),var(--green-d)); color: #fff; border-radius: 14px; text-decoration: none; box-shadow: 0 4px 24px rgba(16,185,129,0.35); transition: transform 0.15s, box-shadow 0.15s; display: inline-block; }
        .btn-primary:hover { transform: translateY(-3px); box-shadow: 0 8px 32px rgba(16,185,129,0.45); }
        .btn-ghost { font-size: 1rem; font-weight: 600; padding: 1rem 2rem; color: #cbd5e1; border: 1px solid rgba(255,255,255,0.15); border-radius: 14px; text-decoration: none; transition: background 0.15s; display: inline-block; background: rgba(255,255,255,0.04); }
        .btn-ghost:hover { background: rgba(255,255,255,0.09); }
        /* hero music bars decoration */
        .hero-bars { display: flex; align-items: flex-end; justify-content: center; gap: 4px; margin-top: 3rem; height: 36px; opacity: 0.18; }
        .hero-bar { width: 4px; border-radius: 2px; background: linear-gradient(to top, var(--green), var(--purple)); animation: pulse-bar 1.2s ease-in-out infinite alternate; }
        .hero-bar:nth-child(1){height:30%;animation-delay:0s}
        .hero-bar:nth-child(2){height:70%;animation-delay:.1s}
        .hero-bar:nth-child(3){height:50%;animation-delay:.2s}
        .hero-bar:nth-child(4){height:90%;animation-delay:.3s}
        .hero-bar:nth-child(5){height:60%;animation-delay:.4s}
        .hero-bar:nth-child(6){height:100%;animation-delay:.5s}
        .hero-bar:nth-child(7){height:75%;animation-delay:.6s}
        .hero-bar:nth-child(8){height:45%;animation-delay:.7s}
        .hero-bar:nth-child(9){height:80%;animation-delay:.8s}
        .hero-bar:nth-child(10){height:55%;animation-delay:.9s}
        .hero-bar:nth-child(11){height:35%;animation-delay:1s}
        .hero-bar:nth-child(12){height:65%;animation-delay:1.1s}
        @keyframes pulse-bar { to { transform: scaleY(0.3); } }

        /* ── Section shell ── */
        .section { padding: 6rem 1.5rem; }
        .section-light { background: var(--light); }
        .section-white { background: var(--white); }
        .wrap { max-width: 1100px; margin: 0 auto; }
        .section-label { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--purple); margin-bottom: 0.6rem; }
        .section-title { font-size: clamp(1.6rem, 3.5vw, 2.2rem); font-weight: 900; letter-spacing: -0.025em; margin-bottom: 0.8rem; }
        .section-sub { font-size: 1rem; color: var(--muted); line-height: 1.7; max-width: 540px; }
        .divider { border: none; border-top: 1px solid var(--border); }

        /* ── Why 3-col cards ── */
        .why-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem; margin-top: 2.75rem; }
        .why-card { background: var(--white); border: 1px solid var(--border); border-radius: 20px; padding: 2rem 1.75rem; transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s; }
        .why-card:hover { transform: translateY(-6px); box-shadow: 0 16px 40px rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.3); }
        .why-icon { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin-bottom: 1rem; }
        .why-icon-green { background: rgba(16,185,129,0.1); }
        .why-icon-purple { background: rgba(99,102,241,0.1); }
        .why-icon-blue { background: rgba(59,130,246,0.1); }
        .why-card h3 { font-size: 1.05rem; font-weight: 800; margin-bottom: 0.5rem; }
        .why-card p { font-size: 0.88rem; color: var(--muted); line-height: 1.7; }

        /* ── How It Works ── */
        .steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem; margin-top: 2.75rem; position: relative; }
        .step-card { background: var(--white); border: 1px solid var(--border); border-radius: 20px; padding: 2rem 1.75rem; transition: transform 0.2s, box-shadow 0.2s; }
        .step-card:hover { transform: translateY(-5px); box-shadow: 0 12px 32px rgba(0,0,0,0.07); }
        .step-num { width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg,var(--purple),var(--green)); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; font-weight: 900; color: #fff; margin-bottom: 1.1rem; box-shadow: 0 4px 16px rgba(99,102,241,0.25); }
        .step-card h3 { font-size: 1rem; font-weight: 800; margin-bottom: 0.5rem; }
        .step-card p { font-size: 0.87rem; color: var(--muted); line-height: 1.7; }

        /* ── Stats band ── */
        .stats-band { background: linear-gradient(135deg, var(--dark2) 0%, #111134 100%); padding: 5rem 1.5rem; position: relative; overflow: hidden; }
        .stats-band::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 60% 80% at 50% 50%, rgba(99,102,241,0.12) 0%, transparent 70%); pointer-events: none; }
        .stats-band-inner { max-width: 1100px; margin: 0 auto; position: relative; z-index: 1; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 2rem; margin-top: 2.5rem; }
        .stat { text-align: center; }
        .stat-num { font-size: 2.8rem; font-weight: 900; line-height: 1; background: linear-gradient(135deg,var(--green),var(--purple)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 0.5rem; }
        .stat-label { font-size: 0.85rem; color: #64748b; line-height: 1.5; }
        .stats-band .section-title { color: #f1f5f9; }
        .stats-band .section-label { color: var(--green); }
        .stats-band .section-sub { color: #64748b; }

        /* ── For Artists box ── */
        .artist-box { background: linear-gradient(135deg,#f0fdf4,#f5f3ff); border: 1px solid rgba(16,185,129,0.25); border-radius: 24px; padding: 3rem 2.5rem; display: flex; align-items: center; justify-content: space-between; gap: 2rem; flex-wrap: wrap; }
        .artist-box h2 { font-size: 1.5rem; font-weight: 900; margin-bottom: 0.6rem; }
        .artist-box p { font-size: 0.92rem; color: var(--muted); line-height: 1.7; max-width: 500px; }
        .btn-artist { font-size: 0.95rem; font-weight: 800; padding: 0.85rem 1.75rem; background: linear-gradient(135deg,var(--green),var(--green-d)); color: #fff; border-radius: 12px; text-decoration: none; white-space: nowrap; box-shadow: 0 4px 16px rgba(16,185,129,0.25); transition: transform 0.15s, box-shadow 0.15s; display: inline-block; flex-shrink: 0; }
        .btn-artist:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(16,185,129,0.35); }

        /* ── Footer ── */
        .footer { background: var(--dark); border-top: 1px solid rgba(255,255,255,0.07); padding: 3rem 1.5rem; }
        .footer-inner { max-width: 1100px; margin: 0 auto; display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 2rem; }
        .footer-brand { color: #334155; }
        .footer-logo { font-size: 1rem; font-weight: 900; background: linear-gradient(135deg,var(--green),var(--purple)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; display: inline-block; margin-bottom: 0.4rem; }
        .footer-copy { font-size: 0.78rem; color: #334155; line-height: 1.6; margin-top: 0.35rem; }
        .footer-links { display: flex; gap: 1.5rem; flex-wrap: wrap; align-items: center; }
        .footer-link { font-size: 0.8rem; color: #475569; text-decoration: none; }
        .footer-link:hover { color: #94a3b8; }

        /* ── Responsive ── */
        @media (max-width: 640px) {
          .hero { padding: 4rem 1.25rem 3.5rem; }
          .section { padding: 4rem 1.25rem; }
          .nav-links .nav-link { display: none; }
          .artist-box { text-align: center; justify-content: center; }
          .artist-box p { max-width: none; }
          .footer-inner { flex-direction: column; }
        }
      `}</style>

      {/* ── Nav ── */}
      <nav className="nav">
        <div className="nav-inner">
          <a href="/" className="logo">OTONAMI</a>
          <div className="nav-links">
            <a href="#how-it-works" className="nav-link">How It Works</a>
            <a href="#for-artists" className="nav-link">For Artists</a>
            <a href="/curator" className="btn-nav">Join as Curator</a>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-tag">Curator Network — AI-Powered Matching</div>
          <h1>
            Discover Japan&apos;s Best<br />
            <em>Independent Music</em>
          </h1>
          <p className="hero-sub">
            OTONAMI connects you with handpicked Japanese indie artists.
            Get paid to review. No spam — only quality pitches matched to your taste.
          </p>
          <div className="cta-group">
            <a href="/curator" className="btn-primary">Join as Curator &rarr;</a>
            <a href="#how-it-works" className="btn-ghost">See How It Works</a>
          </div>
          {/* Animated waveform bars */}
          <div className="hero-bars" aria-hidden="true">
            {Array.from({length: 16}).map((_, i) => <div key={i} className="hero-bar"/>)}
          </div>
        </div>
      </section>

      {/* ── Why OTONAMI ── */}
      <section className="section section-light">
        <div className="wrap">
          <div ref={whyRef} className="fade-section">
            <div className="section-label">Why OTONAMI</div>
            <h2 className="section-title">Built for Curators Who Value Quality</h2>
            <p className="section-sub">We filter the noise so you only hear music that genuinely fits your audience.</p>
            <div className="why-grid">
              <div className="why-card">
                <div className="why-icon why-icon-purple">&#127919;</div>
                <h3>AI-Matched Pitches</h3>
                <p>Our matching engine analyzes genre, mood, and audio features to send you only the music that fits your playlist&apos;s style and audience — not random submissions.</p>
              </div>
              <div className="why-card">
                <div className="why-icon why-icon-green">&#128176;</div>
                <h3>Get Paid to Listen</h3>
                <p>Earn $3–5 per review, paid directly via PayPal. Transparent, guaranteed compensation for your time and expertise.</p>
              </div>
              <div className="why-card">
                <div className="why-icon why-icon-blue">&#127470;&#127477;</div>
                <h3>Japan&apos;s Hidden Gems</h3>
                <p>Access 70+ independent labels through ILCJ, Japan&apos;s largest indie label coalition. Discover artists before they go global.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* ── How It Works ── */}
      <section className="section section-white" id="how-it-works">
        <div className="wrap">
          <div ref={howRef} className="fade-section">
            <div className="section-label">How It Works</div>
            <h2 className="section-title">Three Steps to Start Discovering</h2>
            <p className="section-sub">Sign up in minutes. We handle the curation so you can focus on the music.</p>
            <div className="steps">
              <div className="step-card">
                <div className="step-num">1</div>
                <h3>Sign up and set your preferences</h3>
                <p>Tell us your genres, moods, and share your playlist URL. Takes under 3 minutes. We use this to build your match profile.</p>
              </div>
              <div className="step-card">
                <div className="step-num">2</div>
                <h3>Receive AI-matched pitches</h3>
                <p>Our Match Score engine compares each artist&apos;s audio features, genre, and mood against your preferences. Only high-match submissions reach your inbox.</p>
              </div>
              <div className="step-card">
                <div className="step-num">3</div>
                <h3>Review, earn, and discover</h3>
                <p>Listen, leave feedback, and get paid via PayPal. Add tracks you love to your playlist — and build direct relationships with Japanese artists and labels.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats band ── */}
      <div className="stats-band">
        <div className="stats-band-inner">
          <div ref={statsRef} className="fade-section">
            <div className="section-label">Backed by the Industry</div>
            <h2 className="section-title">Japan&apos;s Indie Scene, Curated for You</h2>
            <div className="stats-grid">
              <div className="stat">
                <div className="stat-num" ref={cnt70}>70+</div>
                <div className="stat-label">Independent Labels<br/>via ILCJ</div>
              </div>
              <div className="stat">
                <div className="stat-num" ref={cntFes}>SXSW</div>
                <div className="stat-label">Artists Featured at<br/>SXSW &amp; Blue Note Tokyo</div>
              </div>
              <div className="stat">
                <div className="stat-num">AI</div>
                <div className="stat-label">Powered by Audio<br/>Match Score Technology</div>
              </div>
              <div className="stat">
                <div className="stat-num">$3–5</div>
                <div className="stat-label">Earned Per Review<br/>via PayPal</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── For Artists ── */}
      <section className="section section-light" id="for-artists">
        <div className="wrap">
          <div ref={artRef} className="fade-section">
            <div className="artist-box">
              <div>
                <div className="section-label" style={{marginBottom:'0.45rem'}}>For Artists &amp; Labels</div>
                <h2>Are you a Japanese artist or label?</h2>
                <p>
                  OTONAMI helps you reach international curators with AI-generated English pitches.
                  Input your track, get a professional pitch email, and submit to curators who match your sound — in minutes.
                </p>
              </div>
              <a href="/studio" className="btn-artist">Submit Your Music &rarr;</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-logo">OTONAMI</div>
            <div className="footer-copy">
              Connecting Japanese Music to the World<br/>
              A project by TYCompany LLC / ILCJ
            </div>
          </div>
          <div className="footer-links">
            <a href="/curator" className="footer-link">Curator Sign Up</a>
            <a href="/studio" className="footer-link">Submit Music</a>
            <a href="mailto:info@otonami.jp" className="footer-link">Contact</a>
          </div>
        </div>
      </footer>
    </>
  );
}
