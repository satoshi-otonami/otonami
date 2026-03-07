export default function HomePage() {
  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; background: #07070f; color: #f1f5f9; }
        .lp-container { max-width: 1100px; margin: 0 auto; padding: 0 1.25rem; }
        /* Nav */
        .lp-nav { position: sticky; top: 0; z-index: 50; background: rgba(7,7,15,0.88); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255,255,255,0.06); }
        .lp-nav-inner { max-width: 1100px; margin: 0 auto; padding: 0 1.25rem; display: flex; align-items: center; justify-content: space-between; height: 60px; }
        .lp-logo { font-size: 1.15rem; font-weight: 800; letter-spacing: -0.02em; background: linear-gradient(135deg,#10b981,#6366f1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; text-decoration: none; }
        .lp-nav-links { display: flex; align-items: center; gap: 1.5rem; }
        .lp-nav-link { font-size: 0.82rem; color: #94a3b8; text-decoration: none; transition: color 0.15s; }
        .lp-nav-link:hover { color: #f1f5f9; }
        .lp-btn-nav { font-size: 0.82rem; font-weight: 700; padding: 0.45rem 1rem; background: linear-gradient(135deg,#10b981,#059669); color: #fff; border-radius: 8px; text-decoration: none; transition: opacity 0.15s; }
        .lp-btn-nav:hover { opacity: 0.88; }
        /* Hero */
        .lp-hero { padding: 5rem 0 4rem; text-align: center; position: relative; overflow: hidden; }
        .lp-hero::before { content: ""; position: absolute; inset: 0; background: radial-gradient(ellipse 70% 50% at 50% 0%, rgba(99,102,241,0.18) 0%, transparent 70%); pointer-events: none; }
        .lp-hero-tag { display: inline-block; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #10b981; border: 1px solid rgba(16,185,129,0.35); padding: 0.3rem 0.8rem; border-radius: 20px; margin-bottom: 1.5rem; }
        .lp-hero h1 { font-size: clamp(2rem, 5vw, 3.25rem); font-weight: 900; line-height: 1.12; letter-spacing: -0.03em; margin: 0 0 1.25rem; }
        .lp-hero h1 span { background: linear-gradient(135deg,#10b981 0%,#6366f1 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .lp-hero-sub { font-size: clamp(1rem, 2.5vw, 1.18rem); color: #94a3b8; line-height: 1.65; max-width: 620px; margin: 0 auto 2.25rem; }
        .lp-cta-group { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
        .lp-btn-primary { font-size: 1rem; font-weight: 700; padding: 0.85rem 2rem; background: linear-gradient(135deg,#10b981,#059669); color: #fff; border-radius: 12px; text-decoration: none; transition: transform 0.15s, opacity 0.15s; display: inline-block; }
        .lp-btn-primary:hover { transform: translateY(-2px); opacity: 0.92; }
        .lp-btn-secondary { font-size: 1rem; font-weight: 600; padding: 0.85rem 2rem; background: rgba(255,255,255,0.06); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; text-decoration: none; transition: background 0.15s; display: inline-block; }
        .lp-btn-secondary:hover { background: rgba(255,255,255,0.1); }
        /* Sections */
        .lp-section { padding: 4rem 0; }
        .lp-section-label { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #6366f1; margin-bottom: 0.6rem; }
        .lp-section-title { font-size: clamp(1.5rem, 3.5vw, 2.1rem); font-weight: 800; letter-spacing: -0.02em; margin: 0 0 0.75rem; }
        .lp-section-sub { font-size: 1rem; color: #64748b; line-height: 1.65; max-width: 560px; }
        /* Why 3-col */
        .lp-why-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem; margin-top: 2.5rem; }
        .lp-why-card { background: #0f0f1e; border: 1px solid rgba(255,255,255,0.07); border-radius: 18px; padding: 1.75rem 1.5rem; transition: border-color 0.2s; }
        .lp-why-card:hover { border-color: rgba(99,102,241,0.4); }
        .lp-why-icon { font-size: 1.8rem; margin-bottom: 0.85rem; }
        .lp-why-card h3 { font-size: 1.05rem; font-weight: 700; margin: 0 0 0.5rem; }
        .lp-why-card p { font-size: 0.88rem; color: #64748b; margin: 0; line-height: 1.65; }
        /* How It Works */
        .lp-steps { display: flex; flex-direction: column; gap: 1.25rem; margin-top: 2.5rem; }
        .lp-step { display: flex; gap: 1.25rem; align-items: flex-start; background: #0f0f1e; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 1.5rem; }
        .lp-step-num { flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg,#6366f1,#10b981); display: flex; align-items: center; justify-content: center; font-size: 1rem; font-weight: 900; color: #fff; }
        .lp-step-body h3 { font-size: 1rem; font-weight: 700; margin: 0 0 0.35rem; }
        .lp-step-body p { font-size: 0.87rem; color: #64748b; margin: 0; line-height: 1.6; }
        /* Stats */
        .lp-stats { background: linear-gradient(135deg, #0f0f1e, #111127); border: 1px solid rgba(99,102,241,0.2); border-radius: 20px; padding: 2.5rem; margin-top: 2.5rem; }
        .lp-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1.5rem; }
        .lp-stat { text-align: center; }
        .lp-stat-num { font-size: 2rem; font-weight: 900; background: linear-gradient(135deg,#10b981,#6366f1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; line-height: 1; margin-bottom: 0.35rem; }
        .lp-stat-label { font-size: 0.82rem; color: #64748b; line-height: 1.4; }
        /* Divider */
        .lp-divider { border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 0; }
        /* For Artists */
        .lp-artist-box { background: linear-gradient(135deg, #0c1a14, #0f0f1e); border: 1px solid rgba(16,185,129,0.25); border-radius: 20px; padding: 2.5rem; display: flex; align-items: center; justify-content: space-between; gap: 2rem; flex-wrap: wrap; }
        .lp-artist-box h2 { font-size: 1.4rem; font-weight: 800; margin: 0 0 0.5rem; }
        .lp-artist-box p { font-size: 0.9rem; color: #64748b; margin: 0; line-height: 1.65; max-width: 480px; }
        .lp-btn-artist { font-size: 0.9rem; font-weight: 700; padding: 0.75rem 1.5rem; background: rgba(16,185,129,0.12); color: #10b981; border: 1px solid rgba(16,185,129,0.35); border-radius: 10px; text-decoration: none; white-space: nowrap; transition: background 0.15s; display: inline-block; flex-shrink: 0; }
        .lp-btn-artist:hover { background: rgba(16,185,129,0.22); }
        /* Footer */
        .lp-footer { border-top: 1px solid rgba(255,255,255,0.06); padding: 2.5rem 0; }
        .lp-footer-inner { max-width: 1100px; margin: 0 auto; padding: 0 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
        .lp-footer-brand { font-size: 0.82rem; color: #334155; line-height: 1.6; }
        .lp-footer-links { display: flex; gap: 1.25rem; flex-wrap: wrap; }
        .lp-footer-link { font-size: 0.8rem; color: #475569; text-decoration: none; transition: color 0.15s; }
        .lp-footer-link:hover { color: #94a3b8; }
        /* Responsive tweaks */
        @media (max-width: 640px) {
          .lp-hero { padding: 3.5rem 0 2.5rem; }
          .lp-nav-links .lp-nav-link { display: none; }
          .lp-artist-box { text-align: center; justify-content: center; }
          .lp-footer-inner { flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      {/* ── Nav ── */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <a href="/" className="lp-logo">OTONAMI</a>
          <div className="lp-nav-links">
            <a href="#how-it-works" className="lp-nav-link">How It Works</a>
            <a href="#for-artists" className="lp-nav-link">For Artists</a>
            <a href="/curator" className="lp-btn-nav">Join as Curator</a>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-container">
          <div className="lp-hero-tag">Curator Network — Powered by AI</div>
          <h1>
            Discover Japan&apos;s Best<br />
            <span>Independent Music</span>
          </h1>
          <p className="lp-hero-sub">
            OTONAMI connects you with handpicked Japanese indie artists.
            Get paid to review. No spam — only quality pitches matched to your taste.
          </p>
          <div className="lp-cta-group">
            <a href="/curator" className="lp-btn-primary">Join as Curator &rarr;</a>
            <a href="#how-it-works" className="lp-btn-secondary">See How It Works</a>
          </div>
        </div>
      </section>

      <hr className="lp-divider" />

      {/* ── Why OTONAMI ── */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-section-label">Why OTONAMI</div>
          <h2 className="lp-section-title">Built for Curators Who Value Quality</h2>
          <p className="lp-section-sub">
            We filter the noise so you only hear music that genuinely fits your audience.
          </p>
          <div className="lp-why-grid">
            <div className="lp-why-card">
              <div className="lp-why-icon">&#127919;</div>
              <h3>AI-Matched Pitches</h3>
              <p>Our matching engine analyzes genre, mood, and audio features to send you only the music that fits your playlist&apos;s style and audience — not random submissions.</p>
            </div>
            <div className="lp-why-card">
              <div className="lp-why-icon">&#128176;</div>
              <h3>Get Paid to Listen</h3>
              <p>Earn $3–5 per review, paid directly via PayPal. Transparent, guaranteed compensation for your time and expertise.</p>
            </div>
            <div className="lp-why-card">
              <div className="lp-why-icon">&#127470;&#127477;</div>
              <h3>Japan&apos;s Hidden Gems</h3>
              <p>Access 70+ independent labels through ILCJ, Japan&apos;s largest indie label coalition. Discover artists before they go global.</p>
            </div>
          </div>
        </div>
      </section>

      <hr className="lp-divider" />

      {/* ── How It Works ── */}
      <section className="lp-section" id="how-it-works">
        <div className="lp-container">
          <div className="lp-section-label">How It Works</div>
          <h2 className="lp-section-title">Three Steps to Start Discovering</h2>
          <p className="lp-section-sub">
            Sign up in minutes. We handle the curation so you can focus on the music.
          </p>
          <div className="lp-steps">
            <div className="lp-step">
              <div className="lp-step-num">1</div>
              <div className="lp-step-body">
                <h3>Sign up and set your preferences</h3>
                <p>Tell us your genres, moods, and share your playlist URL. Takes under 3 minutes. We use this to build your match profile.</p>
              </div>
            </div>
            <div className="lp-step">
              <div className="lp-step-num">2</div>
              <div className="lp-step-body">
                <h3>Receive AI-matched pitches</h3>
                <p>Our Match Score engine compares each artist&apos;s audio features, genre, and mood against your preferences. Only high-match submissions reach your inbox.</p>
              </div>
            </div>
            <div className="lp-step">
              <div className="lp-step-num">3</div>
              <div className="lp-step-body">
                <h3>Review, earn, and discover</h3>
                <p>Listen, leave feedback, and get paid via PayPal. Add tracks you love to your playlist — and build a direct relationship with Japanese artists and labels.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr className="lp-divider" />

      {/* ── Social Proof / Stats ── */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-section-label">Backed by the Industry</div>
          <h2 className="lp-section-title">Japan&apos;s Indie Scene, Curated for You</h2>
          <div className="lp-stats">
            <div className="lp-stats-grid">
              <div className="lp-stat">
                <div className="lp-stat-num">70+</div>
                <div className="lp-stat-label">Independent Labels<br />via ILCJ</div>
              </div>
              <div className="lp-stat">
                <div className="lp-stat-num">SXSW</div>
                <div className="lp-stat-label">Artists Featured at<br />SXSW &amp; Blue Note Tokyo</div>
              </div>
              <div className="lp-stat">
                <div className="lp-stat-num">AI</div>
                <div className="lp-stat-label">Powered by Audio<br />Match Score Technology</div>
              </div>
              <div className="lp-stat">
                <div className="lp-stat-num">$3–5</div>
                <div className="lp-stat-label">Earned Per Review<br />via PayPal</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr className="lp-divider" />

      {/* ── For Artists ── */}
      <section className="lp-section" id="for-artists">
        <div className="lp-container">
          <div className="lp-artist-box">
            <div>
              <div className="lp-section-label" style={{marginBottom:"0.4rem"}}>For Artists &amp; Labels</div>
              <h2>Are you a Japanese artist or label?</h2>
              <p>
                OTONAMI helps you reach international curators with AI-generated English pitches.
                Input your track, get a professional pitch email, and submit to curators who match your sound — in minutes.
              </p>
            </div>
            <a href="/studio" className="lp-btn-artist">Submit Your Music &rarr;</a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <strong style={{color:"#64748b"}}>OTONAMI</strong> — Connecting Japanese Music to the World<br />
            A project by TYCompany LLC / ILCJ
          </div>
          <div className="lp-footer-links">
            <a href="/curator" className="lp-footer-link">Curator Sign Up</a>
            <a href="/studio" className="lp-footer-link">Submit Music</a>
            <a href="mailto:info@otonami.jp" className="lp-footer-link">Contact</a>
          </div>
        </div>
      </footer>
    </>
  );
}
