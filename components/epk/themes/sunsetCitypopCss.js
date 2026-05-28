// Scoped CSS for the Sunset CITYPOP EPK theme (v2).
// Ported verbatim from route14band-epk-v2-citypop.html — every selector is
// scoped under `.theme-sunset-citypop` and keyframes are namespaced `sc-*`
// so it coexists with editorial_dark. Injected once via <style> by
// SunsetCitypop.jsx. Fonts @imported here (global layout only loads DM Sans/Sora).
export const SUNSET_CITYPOP_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300..700&family=Bricolage+Grotesque:opsz,wght@12..96,200..800&display=swap');

.theme-sunset-citypop {
  --cream:#FFF6E9; --peach:#FFE3D1; --sunset:#FFAA8C; --coral:#FF5E5E;
  --hot-pink:#E8458F; --magenta:#C9388C; --royal:#2A4BC9; --sky:#6FA8FF;
  --gold:#F5B83A; --ink:#1A1230; --ink-soft:#2D1B4E; --muted:#786C8A;
  --line:rgba(26,18,48,0.12); --line-strong:rgba(26,18,48,0.25);
  /* Shared EPK density tokens — same values across themes (brutalist will copy). */
  --epk-hero-min-height:75vh; --epk-section-pad-y:80px; --epk-pickup-pad-top:60px;
  --epk-pickup-max-h:70vh; --epk-pickup-cover-max-w:400px;
  --epk-pickup-col-gap:40px; --epk-pickup-left-max-w:520px;
  --epk-bio-grid:1fr 2fr; --epk-bio-gap:60px;
  background:var(--cream); color:var(--ink);
  font-family:'DM Sans',sans-serif; font-size:16px; line-height:1.6;
  position:relative; overflow-x:hidden; min-height:100vh;
}
.theme-sunset-citypop * { margin:0; padding:0; box-sizing:border-box; }

/* Topbar */
.theme-sunset-citypop .topbar { position:fixed; top:0; left:0; right:0; z-index:100; display:flex; justify-content:space-between; align-items:center; padding:16px 32px; font-size:11px; letter-spacing:0.18em; text-transform:uppercase; font-weight:500; mix-blend-mode:difference; color:var(--cream); }
.theme-sunset-citypop .topbar-left { display:flex; gap:20px; align-items:center; }
.theme-sunset-citypop .topbar-right { display:flex; gap:18px; align-items:center; }
.theme-sunset-citypop .topbar .dot { width:6px; height:6px; border-radius:50%; background:var(--coral); display:inline-block; margin-right:8px; animation:sc-pulse 2s infinite; mix-blend-mode:normal; }
@keyframes sc-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.theme-sunset-citypop .topbar a { color:inherit; text-decoration:none; opacity:0.8; }
.theme-sunset-citypop .topbar a:hover { opacity:1; }
.theme-sunset-citypop .lang-toggle { display:inline-flex; border:1px solid currentColor; border-radius:100px; overflow:hidden; opacity:0.8; }
.theme-sunset-citypop .lang-toggle button { background:transparent; border:none; color:inherit; font-family:inherit; font-size:10px; letter-spacing:0.15em; padding:4px 12px; cursor:pointer; opacity:0.5; }
.theme-sunset-citypop .lang-toggle button.active { background:currentColor; opacity:1; }
.theme-sunset-citypop .lang-toggle button.active span { color:var(--ink); mix-blend-mode:difference; }

/* Hero */
.theme-sunset-citypop .hero { min-height:var(--epk-hero-min-height); position:relative; overflow:hidden; background: radial-gradient(ellipse 80% 60% at 80% 20%, rgba(255,94,94,0.9) 0%, transparent 60%), radial-gradient(ellipse 70% 80% at 10% 90%, rgba(232,69,143,0.85) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 50% 50%, rgba(245,184,58,0.4) 0%, transparent 70%), linear-gradient(180deg, #FFB18C 0%, #FF8FA8 40%, #C9388C 100%); color:var(--cream); display:grid; grid-template-rows:1fr auto; padding:var(--epk-section-pad-y) 40px 40px; }
.theme-sunset-citypop .hero::before { content:''; position:absolute; inset:0; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='3'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 0.95 0 0 0 0 0.85 0 0 0 0.4 0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E"); opacity:0.5; mix-blend-mode:overlay; pointer-events:none; }
.theme-sunset-citypop .hero-sun { position:absolute; top:20%; right:-10%; width:70vh; height:70vh; border-radius:50%; background:radial-gradient(circle, var(--gold) 0%, var(--coral) 50%, transparent 70%); opacity:0.6; filter:blur(20px); }
.theme-sunset-citypop .hero-grid { position:absolute; bottom:0; left:0; right:0; height:35%; background: linear-gradient(180deg, transparent 0%, rgba(26,18,48,0.4) 100%), repeating-linear-gradient(180deg, transparent 0, transparent 20px, rgba(255,246,233,0.15) 20px, rgba(255,246,233,0.15) 21px), repeating-linear-gradient(90deg, transparent 0, transparent 8%, rgba(255,246,233,0.15) 8%, rgba(255,246,233,0.15) calc(8% + 1px)); transform:perspective(600px) rotateX(50deg); transform-origin:top; opacity:0.7; }
.theme-sunset-citypop .hero-content { position:relative; z-index:3; max-width:1400px; margin:0 auto; width:100%; align-self:center; }
.theme-sunset-citypop .kicker { font-family:'DM Sans',sans-serif; font-size:12px; letter-spacing:0.32em; text-transform:uppercase; font-weight:500; margin-bottom:32px; display:inline-flex; align-items:center; gap:14px; padding:8px 18px; border:1px solid rgba(255,246,233,0.5); border-radius:100px; backdrop-filter:blur(10px); background:rgba(255,246,233,0.1); animation:sc-fadeUp 0.8s ease 0.2s both; }
.theme-sunset-citypop .kicker::before { content:''; width:8px; height:8px; background:var(--gold); border-radius:50%; animation:sc-pulse 2s infinite; }
.theme-sunset-citypop .hero h1 { font-family:'Instrument Serif',serif; font-weight:400; font-size:clamp(72px,14vw,220px); line-height:0.85; letter-spacing:-0.04em; margin-bottom:32px; animation:sc-fadeUp 1.2s ease 0.3s both; }
.theme-sunset-citypop .hero h1 .line2 { display:block; font-style:italic; color:var(--gold); font-size:0.85em; margin-top:8px; }
.theme-sunset-citypop .hero-tagline { font-family:'Instrument Serif',serif; font-style:italic; font-size:clamp(22px,2.5vw,32px); font-weight:400; line-height:1.3; max-width:640px; margin-bottom:48px; animation:sc-fadeUp 1s ease 0.5s both; }
.theme-sunset-citypop .hero-tagline em { font-style:normal; color:var(--gold); }
.theme-sunset-citypop .hero-cta-row { display:flex; gap:16px; flex-wrap:wrap; animation:sc-fadeUp 1s ease 0.7s both; }
.theme-sunset-citypop .btn-primary { display:inline-flex; align-items:center; gap:14px; background:var(--cream); color:var(--ink); padding:16px 28px; border-radius:100px; text-decoration:none; font-weight:500; font-size:14px; letter-spacing:0.05em; transition:transform 0.3s ease; border:none; cursor:pointer; font-family:inherit; }
.theme-sunset-citypop .btn-primary:hover { transform:translateY(-2px); }
.theme-sunset-citypop .btn-primary::after { content:'\\2192'; font-size:18px; transition:transform 0.3s ease; }
.theme-sunset-citypop .btn-primary:hover::after { transform:translateX(4px); }
.theme-sunset-citypop .btn-ghost { display:inline-flex; align-items:center; gap:12px; background:rgba(255,246,233,0.15); backdrop-filter:blur(10px); color:var(--cream); padding:16px 28px; border-radius:100px; text-decoration:none; font-weight:500; font-size:14px; letter-spacing:0.05em; border:1px solid rgba(255,246,233,0.4); cursor:pointer; font-family:inherit; }
.theme-sunset-citypop .btn-ghost:hover { background:rgba(255,246,233,0.25); }
.theme-sunset-citypop .hero-ticker { position:relative; z-index:3; border-top:1px solid rgba(255,246,233,0.3); border-bottom:1px solid rgba(255,246,233,0.3); padding:18px 0; margin-top:80px; overflow:hidden; white-space:nowrap; }
.theme-sunset-citypop .hero-ticker-inner { display:inline-block; animation:sc-scroll-x 30s linear infinite; font-family:'Instrument Serif',serif; font-style:italic; font-size:18px; }
.theme-sunset-citypop .hero-ticker-inner span { margin-right:48px; }
.theme-sunset-citypop .hero-ticker-inner span::after { content:'\\2726'; margin-left:48px; color:var(--gold); font-style:normal; }
@keyframes sc-scroll-x { from{transform:translateX(0)} to{transform:translateX(-50%)} }
@keyframes sc-fadeUp { from{opacity:0; transform:translateY(30px)} to{opacity:1; transform:translateY(0)} }

/* Sections */
.theme-sunset-citypop section { padding:var(--epk-section-pad-y) 40px; position:relative; }
.theme-sunset-citypop .container { max-width:1400px; margin:0 auto; }
.theme-sunset-citypop .section-num { font-family:'Instrument Serif',serif; font-style:italic; font-size:14px; color:var(--coral); letter-spacing:0.05em; margin-bottom:12px; }
.theme-sunset-citypop .section-label { font-size:11px; letter-spacing:0.32em; text-transform:uppercase; color:var(--ink); opacity:0.6; margin-bottom:32px; font-weight:500; }
.theme-sunset-citypop .section-h2 { font-family:'Instrument Serif',serif; font-weight:400; font-size:clamp(48px,7vw,96px); line-height:0.92; letter-spacing:-0.03em; margin-bottom:60px; color:var(--ink); }
.theme-sunset-citypop .section-h2 em { font-style:italic; background:linear-gradient(120deg, var(--coral), var(--hot-pink), var(--magenta)); -webkit-background-clip:text; background-clip:text; color:transparent; }

/* Pickup / Featured Playlist */
.theme-sunset-citypop .pickup { padding-top:var(--epk-pickup-pad-top); }
.theme-sunset-citypop .pickup-card { background:linear-gradient(135deg, #FFD9C7 0%, #FFB8C8 50%, #E8A8DA 100%); border-radius:24px; padding:56px; position:relative; overflow:hidden; display:grid; grid-template-columns:1.1fr 1fr; gap:60px; align-items:center; box-shadow:0 30px 80px rgba(232,69,143,0.2); }
.theme-sunset-citypop .pickup-card::before { content:''; position:absolute; top:-60px; right:-60px; width:240px; height:240px; background:radial-gradient(circle, var(--gold) 0%, transparent 70%); opacity:0.6; }
.theme-sunset-citypop .pickup-card::after { content:''; position:absolute; bottom:-80px; left:-80px; width:280px; height:280px; background:radial-gradient(circle, var(--royal) 0%, transparent 70%); opacity:0.3; }
.theme-sunset-citypop .pickup-meta { position:relative; z-index:2; color:var(--ink); }
.theme-sunset-citypop .pickup-tag { display:inline-block; font-size:10px; letter-spacing:0.3em; text-transform:uppercase; color:var(--ink); padding:6px 14px; background:var(--cream); border-radius:100px; margin-bottom:28px; font-weight:600; }
.theme-sunset-citypop .pickup-title { font-family:'Instrument Serif',serif; font-weight:400; font-size:clamp(56px,8vw,88px); line-height:0.9; letter-spacing:-0.04em; margin-bottom:16px; color:var(--ink); }
.theme-sunset-citypop .pickup-title em { font-style:italic; color:var(--magenta); }
.theme-sunset-citypop .pickup-feat { font-family:'Instrument Serif',serif; font-style:italic; font-size:24px; color:var(--ink-soft); margin-bottom:28px; }
.theme-sunset-citypop .pickup-vibes { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:40px; }
.theme-sunset-citypop .vibe-tag { font-size:12px; padding:8px 16px; background:rgba(26,18,48,0.08); color:var(--ink); border-radius:100px; font-weight:500; }
.theme-sunset-citypop .play-button { display:inline-flex; align-items:center; gap:14px; background:var(--ink); color:var(--cream); border:none; font-family:inherit; font-size:14px; letter-spacing:0.05em; padding:16px 28px; border-radius:100px; cursor:pointer; font-weight:500; transition:transform 0.3s ease; text-decoration:none; }
.theme-sunset-citypop .play-button:hover { transform:scale(1.03); }
.theme-sunset-citypop .play-button .icon { width:22px; height:22px; background:var(--coral); border-radius:50%; display:inline-flex; align-items:center; justify-content:center; }
.theme-sunset-citypop .play-button .icon::after { content:''; width:0; height:0; border-left:6px solid var(--cream); border-top:4px solid transparent; border-bottom:4px solid transparent; margin-left:2px; }
.theme-sunset-citypop .pickup-visual { position:relative; z-index:2; aspect-ratio:1; border-radius:16px; overflow:hidden; background:linear-gradient(135deg, var(--royal) 0%, var(--magenta) 50%, var(--coral) 100%); display:flex; align-items:center; justify-content:center; box-shadow:0 20px 60px rgba(0,0,0,0.2); max-width:var(--epk-pickup-cover-max-w); width:100%; }
.theme-sunset-citypop .pickup-visual img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.theme-sunset-citypop .cassette { width:70%; aspect-ratio:1; border-radius:50%; background:radial-gradient(circle, var(--cream) 0%, var(--cream) 18%, var(--ink) 19%, var(--ink) 24%, #2D1B4E 25%, #2D1B4E 100%); position:relative; animation:sc-spin 8s linear infinite; box-shadow:0 10px 40px rgba(0,0,0,0.3); }
.theme-sunset-citypop .cassette::before { content:''; position:absolute; inset:0; border-radius:50%; background:repeating-radial-gradient(circle, transparent 0, transparent 3px, rgba(255,246,233,0.05) 3px, rgba(255,246,233,0.05) 5px); }
.theme-sunset-citypop .cassette::after { content:''; position:absolute; top:50%; left:50%; width:8px; height:8px; background:var(--coral); border-radius:50%; transform:translate(-50%,-50%); }
@keyframes sc-spin { to { transform:rotate(360deg); } }
.theme-sunset-citypop .waveform-overlay { position:absolute; bottom:32px; left:32px; right:32px; height:50px; display:flex; align-items:end; gap:4px; z-index:2; }
.theme-sunset-citypop .waveform-overlay .bar { flex:1; background:var(--cream); border-radius:2px; opacity:0.95; animation:sc-wave 1.5s ease-in-out infinite; }
.theme-sunset-citypop .waveform-overlay .bar:nth-child(odd) { background:var(--gold); }
.theme-sunset-citypop .waveform-overlay .bar:nth-child(3n) { background:var(--coral); }
@keyframes sc-wave { 0%,100%{height:25%} 50%{height:95%} }

/* Recent tracks list (merged discography) */
.theme-sunset-citypop .disco { padding-top:0; }
.theme-sunset-citypop .disco-list { border-top:1px solid var(--line-strong); }
.theme-sunset-citypop .playlist-more { font-family:'DM Sans',sans-serif; font-size:12px; letter-spacing:0.25em; text-transform:uppercase; color:var(--muted); font-weight:600; margin:56px 0 20px; }
.theme-sunset-citypop .disco-item { display:grid; grid-template-columns:40px 70px 1fr auto; gap:28px; align-items:center; padding:20px 0; border-bottom:1px solid var(--line); transition:all 0.3s ease; }
.theme-sunset-citypop .disco-item:hover { padding-left:16px; background:linear-gradient(90deg, rgba(255,94,94,0.05), transparent); }
.theme-sunset-citypop .disco-item:hover .disco-play { background:var(--coral); color:var(--cream); border-color:var(--coral); }
.theme-sunset-citypop .disco-num { font-family:'Instrument Serif',serif; font-style:italic; font-size:22px; color:var(--muted); }
.theme-sunset-citypop .disco-art { width:70px; height:70px; border-radius:8px; position:relative; overflow:hidden; }
.theme-sunset-citypop .disco-art img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.theme-sunset-citypop .disco-item:nth-child(1) .disco-art { background:linear-gradient(135deg, var(--coral), var(--hot-pink)); }
.theme-sunset-citypop .disco-item:nth-child(2) .disco-art { background:linear-gradient(135deg, var(--gold), var(--coral)); }
.theme-sunset-citypop .disco-item:nth-child(3) .disco-art { background:linear-gradient(135deg, var(--royal), var(--magenta)); }
.theme-sunset-citypop .disco-item:nth-child(4) .disco-art { background:linear-gradient(135deg, var(--hot-pink), var(--royal)); }
.theme-sunset-citypop .disco-item:nth-child(5) .disco-art { background:linear-gradient(135deg, var(--magenta), var(--gold)); }
.theme-sunset-citypop .disco-title { font-family:'Instrument Serif',serif; font-size:26px; color:var(--ink); }
.theme-sunset-citypop .disco-title small { display:block; font-family:'DM Sans',sans-serif; font-size:13px; color:var(--muted); margin-top:4px; letter-spacing:0.02em; }
.theme-sunset-citypop .disco-play { width:42px; height:42px; border-radius:50%; border:1px solid var(--line-strong); background:transparent; color:var(--ink); display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.3s ease; text-decoration:none; }
.theme-sunset-citypop .disco-play::after { content:''; width:0; height:0; border-left:9px solid currentColor; border-top:6px solid transparent; border-bottom:6px solid transparent; margin-left:3px; }

/* Sound & Mood */
.theme-sunset-citypop .sound { background:linear-gradient(180deg, var(--cream) 0%, var(--peach) 100%); }
.theme-sunset-citypop .mood-headline { font-family:'Instrument Serif',serif; font-size:clamp(48px,7vw,96px); line-height:0.95; letter-spacing:-0.03em; margin-bottom:80px; max-width:900px; }
.theme-sunset-citypop .mood-headline em { font-style:italic; background:linear-gradient(120deg, var(--coral), var(--hot-pink), var(--magenta), var(--royal)); -webkit-background-clip:text; background-clip:text; color:transparent; }
.theme-sunset-citypop .mood-scenes { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; }
.theme-sunset-citypop .scene-card { padding:40px 32px; background:var(--cream); border-radius:16px; border:1px solid var(--line); position:relative; overflow:hidden; transition:transform 0.3s ease; }
.theme-sunset-citypop .scene-card:hover { transform:translateY(-4px); }
.theme-sunset-citypop .scene-card::before { content:''; position:absolute; top:-30px; right:-30px; width:100px; height:100px; border-radius:50%; opacity:0.7; }
.theme-sunset-citypop .scene-card:nth-child(1)::before { background:radial-gradient(circle, var(--coral), transparent); }
.theme-sunset-citypop .scene-card:nth-child(2)::before { background:radial-gradient(circle, var(--gold), transparent); }
.theme-sunset-citypop .scene-card:nth-child(3)::before { background:radial-gradient(circle, var(--royal), transparent); }
.theme-sunset-citypop .scene-icon { font-family:'Instrument Serif',serif; font-style:italic; font-size:48px; margin-bottom:24px; background:linear-gradient(120deg, var(--coral), var(--magenta)); -webkit-background-clip:text; background-clip:text; color:transparent; }
.theme-sunset-citypop .scene-title { font-family:'Instrument Serif',serif; font-size:28px; color:var(--ink); margin-bottom:12px; }
.theme-sunset-citypop .scene-desc { font-size:15px; color:var(--ink-soft); line-height:1.6; }

/* For Fans Of (dark) */
.theme-sunset-citypop .fans { background:var(--ink); color:var(--cream); }
.theme-sunset-citypop .fans .section-label { color:var(--cream); opacity:0.6; }
.theme-sunset-citypop .fans .section-h2 { color:var(--cream); }
.theme-sunset-citypop .fans .section-num { color:var(--gold); }
.theme-sunset-citypop .fans-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
.theme-sunset-citypop .fan-card { padding:48px 32px; border-radius:16px; background:rgba(255,246,233,0.05); border:1px solid rgba(255,246,233,0.15); transition:all 0.3s ease; position:relative; overflow:hidden; }
.theme-sunset-citypop .fan-card::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg, var(--coral), var(--hot-pink), var(--royal)); opacity:0; transition:opacity 0.4s ease; }
.theme-sunset-citypop .fan-card:hover::before { opacity:0.15; }
.theme-sunset-citypop .fan-card:hover { border-color:var(--coral); transform:translateY(-4px); }
.theme-sunset-citypop .fan-num { font-family:'Instrument Serif',serif; font-style:italic; font-size:16px; color:var(--gold); margin-bottom:24px; position:relative; }
.theme-sunset-citypop .fan-name { font-family:'Instrument Serif',serif; font-size:40px; line-height:1.1; margin-bottom:12px; color:var(--cream); position:relative; }
.theme-sunset-citypop .fan-tag { font-size:11px; letter-spacing:0.2em; text-transform:uppercase; color:var(--coral); font-weight:500; position:relative; }

/* Tour */
.theme-sunset-citypop .tour { background:var(--peach); }
.theme-sunset-citypop .tour-headline { display:grid; grid-template-columns:1fr 1fr; gap:60px; margin-bottom:80px; }
.theme-sunset-citypop .tour-stat-num { font-family:'Instrument Serif',serif; font-style:italic; font-size:clamp(120px,16vw,240px); line-height:0.85; letter-spacing:-0.05em; background:linear-gradient(120deg, var(--coral), var(--hot-pink), var(--magenta)); -webkit-background-clip:text; background-clip:text; color:transparent; }
.theme-sunset-citypop .tour-stat-label { font-size:13px; letter-spacing:0.25em; text-transform:uppercase; color:var(--ink); margin-top:12px; font-weight:600; }
.theme-sunset-citypop .tour-stat-detail { font-family:'Instrument Serif',serif; font-style:italic; font-size:18px; color:var(--ink-soft); margin-top:8px; }
.theme-sunset-citypop .tour-timeline { border-top:1px solid var(--line-strong); padding-top:40px; }
.theme-sunset-citypop .tour-item { display:grid; grid-template-columns:120px 1fr 240px; gap:32px; padding:22px 0; border-bottom:1px solid var(--line); align-items:baseline; }
.theme-sunset-citypop .tour-year { font-family:'Instrument Serif',serif; font-style:italic; font-size:28px; color:var(--coral); }
.theme-sunset-citypop .tour-event { font-family:'Instrument Serif',serif; font-size:22px; color:var(--ink); }
.theme-sunset-citypop .tour-location { font-size:12px; letter-spacing:0.2em; text-transform:uppercase; color:var(--muted); text-align:right; font-weight:500; }

/* Press */
.theme-sunset-citypop .press-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:48px; }
.theme-sunset-citypop .press-item { padding:32px 0; border-top:2px solid var(--line-strong); }
.theme-sunset-citypop .press-quote { font-family:'Instrument Serif',serif; font-style:italic; font-size:28px; line-height:1.4; color:var(--ink); margin-bottom:24px; }
.theme-sunset-citypop .press-source { font-size:12px; letter-spacing:0.25em; text-transform:uppercase; color:var(--coral); font-weight:600; text-decoration:none; }
.theme-sunset-citypop a.press-source:hover { color:var(--magenta); }
.theme-sunset-citypop .press-date { font-family:'Instrument Serif',serif; font-style:italic; font-size:15px; color:var(--muted); margin-top:6px; }

/* OTONAMI badge */
.theme-sunset-citypop .otonami-badge { background:linear-gradient(135deg, var(--royal) 0%, var(--magenta) 50%, var(--coral) 100%); padding:120px 40px; text-align:center; position:relative; overflow:hidden; color:var(--cream); }
.theme-sunset-citypop .otonami-badge::before { content:''; position:absolute; inset:0; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='3'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 0.95 0 0 0 0 0.85 0 0 0 0.3 0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E"); mix-blend-mode:overlay; opacity:0.5; }
.theme-sunset-citypop .otonami-badge-inner { position:relative; z-index:2; max-width:900px; margin:0 auto; }
.theme-sunset-citypop .otonami-eyebrow { display:inline-flex; align-items:center; gap:10px; font-size:11px; letter-spacing:0.35em; text-transform:uppercase; margin-bottom:32px; padding:8px 16px; border:1px solid rgba(255,246,233,0.4); border-radius:100px; background:rgba(255,246,233,0.1); backdrop-filter:blur(10px); font-weight:500; }
.theme-sunset-citypop .otonami-eyebrow::before { content:''; width:6px; height:6px; background:var(--gold); border-radius:50%; }
.theme-sunset-citypop .otonami-h { font-family:'Instrument Serif',serif; font-size:clamp(40px,6vw,80px); line-height:1; margin-bottom:24px; color:var(--cream); letter-spacing:-0.02em; }
.theme-sunset-citypop .otonami-h em { font-style:italic; color:var(--gold); }
.theme-sunset-citypop .otonami-stat-row { display:grid; grid-template-columns:repeat(3,1fr); gap:48px; margin:56px 0; padding:56px 0; border-top:1px solid rgba(255,246,233,0.3); border-bottom:1px solid rgba(255,246,233,0.3); }
.theme-sunset-citypop .otonami-stat-num { font-family:'Instrument Serif',serif; font-style:italic; font-size:clamp(56px,8vw,96px); color:var(--gold); line-height:1; letter-spacing:-0.03em; }
.theme-sunset-citypop .otonami-stat-label { font-size:11px; letter-spacing:0.3em; text-transform:uppercase; margin-top:12px; opacity:0.8; }
.theme-sunset-citypop .otonami-caption { font-family:'Instrument Serif',serif; font-style:italic; font-size:20px; line-height:1.6; opacity:0.95; max-width:640px; margin:0 auto; }

/* Connect (dark) */
.theme-sunset-citypop .connect { padding:120px 40px; background:var(--ink); color:var(--cream); }
.theme-sunset-citypop .connect .section-label { color:var(--cream); opacity:0.6; }
.theme-sunset-citypop .connect .section-num { color:var(--gold); }
.theme-sunset-citypop .connect-grid { display:grid; grid-template-columns:1.2fr 1fr; gap:80px; align-items:start; }
.theme-sunset-citypop .connect-h { font-family:'Instrument Serif',serif; font-size:clamp(56px,7vw,104px); line-height:0.95; letter-spacing:-0.03em; margin-bottom:32px; color:var(--cream); }
.theme-sunset-citypop .connect-h em { font-style:italic; background:linear-gradient(120deg, var(--coral), var(--gold)); -webkit-background-clip:text; background-clip:text; color:transparent; }
.theme-sunset-citypop .connect-desc { font-size:18px; line-height:1.6; color:var(--cream); opacity:0.85; max-width:480px; margin-bottom:40px; }
.theme-sunset-citypop .connect-buttons { display:flex; flex-direction:column; gap:12px; max-width:420px; }
.theme-sunset-citypop .connect-button { display:flex; align-items:center; justify-content:space-between; padding:22px 28px; background:rgba(255,246,233,0.05); border:1px solid rgba(255,246,233,0.2); color:var(--cream); font-family:inherit; font-size:15px; text-decoration:none; border-radius:100px; transition:all 0.3s ease; }
.theme-sunset-citypop .connect-button:hover { background:var(--cream); color:var(--ink); transform:translateX(4px); }
.theme-sunset-citypop .connect-button::after { content:'\\2192'; font-size:18px; }
.theme-sunset-citypop .connect-contacts { display:grid; gap:28px; }
.theme-sunset-citypop .contact-block { padding:24px 0; border-top:1px solid rgba(255,246,233,0.15); }
.theme-sunset-citypop .contact-role { font-size:11px; letter-spacing:0.3em; text-transform:uppercase; color:var(--coral); margin-bottom:10px; font-weight:600; }
.theme-sunset-citypop .contact-name { font-family:'Instrument Serif',serif; font-size:26px; color:var(--cream); margin-bottom:6px; }
.theme-sunset-citypop .contact-email { font-size:14px; color:var(--cream); opacity:0.8; text-decoration:none; border-bottom:1px solid rgba(255,246,233,0.3); padding-bottom:2px; }
.theme-sunset-citypop .contact-email:hover { opacity:1; border-color:var(--gold); }

/* Footer */
.theme-sunset-citypop .sc-footer { padding:32px 40px; background:var(--ink); border-top:1px solid rgba(255,246,233,0.1); display:flex; justify-content:space-between; align-items:center; font-size:11px; letter-spacing:0.2em; text-transform:uppercase; color:var(--cream); opacity:0.6; flex-wrap:wrap; gap:12px; }
.theme-sunset-citypop .sc-footer a { color:var(--gold); text-decoration:none; border-bottom:1px solid var(--gold); padding-bottom:1px; opacity:1; }

/* Bio */
.theme-sunset-citypop .bio { background:var(--peach); position:relative; }
.theme-sunset-citypop .bio-grid { display:grid; grid-template-columns:var(--epk-bio-grid); gap:var(--epk-bio-gap); align-items:start; }
.theme-sunset-citypop .bio-sidebar { position:static; }
.theme-sunset-citypop .pull-quote { font-family:'Instrument Serif',serif; font-style:italic; font-size:36px; line-height:1.2; color:var(--ink); margin-bottom:24px; letter-spacing:-0.01em; }
.theme-sunset-citypop .pull-quote em { font-style:normal; background:linear-gradient(120deg, var(--coral), var(--magenta)); -webkit-background-clip:text; background-clip:text; color:transparent; }
.theme-sunset-citypop .pull-quote-attr { font-size:12px; letter-spacing:0.2em; text-transform:uppercase; color:var(--muted); font-weight:500; }
.theme-sunset-citypop .bio-body { font-size:17px; line-height:1.75; color:var(--ink-soft); max-width:640px; }
.theme-sunset-citypop .bio-body p { margin-bottom:24px; }

/* Pickup PC layout — tighter top padding, height cap, content-based grid
   (left = fit-content capped at left-max-w, right = cover 320-400px) so the
   card no longer has a wide empty middle between text and cover. Mobile is
   untouched. */
@media (min-width:901px){
  .theme-sunset-citypop { --epk-pickup-pad-top:48px; }
  .theme-sunset-citypop .pickup-card {
    max-height:var(--epk-pickup-max-h);
    grid-template-columns:fit-content(var(--epk-pickup-left-max-w)) minmax(320px, var(--epk-pickup-cover-max-w));
    column-gap:var(--epk-pickup-col-gap);
  }
  .theme-sunset-citypop .pickup-meta { max-width:var(--epk-pickup-left-max-w); }
}

/* Responsive */
@media (max-width:900px){
  .theme-sunset-citypop section { padding:80px 24px; }
  .theme-sunset-citypop .topbar { padding:14px 20px; }
  .theme-sunset-citypop .hero { padding:90px 24px 24px; }
  .theme-sunset-citypop .hero h1 { font-size:64px; }
  .theme-sunset-citypop .hero-tagline { font-size:20px; }
  .theme-sunset-citypop .hero-cta-row { flex-direction:column; }
  .theme-sunset-citypop .btn-primary, .theme-sunset-citypop .btn-ghost { width:100%; justify-content:center; }
  .theme-sunset-citypop .hero-ticker-inner { font-size:15px; }
  .theme-sunset-citypop .pickup-card { grid-template-columns:1fr; padding:32px 24px; gap:32px; border-radius:16px; }
  .theme-sunset-citypop .pickup-title { font-size:56px; }
  .theme-sunset-citypop .pickup-feat { font-size:18px; }
  .theme-sunset-citypop .bio-grid { grid-template-columns:1fr; gap:40px; }
  .theme-sunset-citypop .bio-sidebar { position:static; }
  .theme-sunset-citypop .pull-quote { font-size:26px; }
  .theme-sunset-citypop .disco-item { grid-template-columns:30px 56px 1fr; gap:16px; padding:16px 0; }
  .theme-sunset-citypop .disco-art { width:56px; height:56px; }
  .theme-sunset-citypop .disco-title { font-size:19px; }
  .theme-sunset-citypop .disco-play { display:none; }
  .theme-sunset-citypop .mood-scenes { grid-template-columns:1fr; }
  .theme-sunset-citypop .fans-grid { grid-template-columns:1fr; }
  .theme-sunset-citypop .fan-name { font-size:32px; }
  .theme-sunset-citypop .tour-headline { grid-template-columns:1fr; gap:32px; }
  .theme-sunset-citypop .tour-item { grid-template-columns:1fr; gap:4px; padding:16px 0; }
  .theme-sunset-citypop .tour-location { text-align:left; }
  .theme-sunset-citypop .press-grid { grid-template-columns:1fr; gap:24px; }
  .theme-sunset-citypop .press-quote { font-size:22px; }
  .theme-sunset-citypop .otonami-badge { padding:80px 24px; }
  .theme-sunset-citypop .otonami-stat-row { grid-template-columns:1fr; gap:32px; padding:32px 0; }
  .theme-sunset-citypop .connect-grid { grid-template-columns:1fr; gap:48px; }
  .theme-sunset-citypop .connect-h { font-size:48px; }
  .theme-sunset-citypop .sc-footer { flex-direction:column; gap:12px; padding:24px; text-align:center; }
}

/* Phones: compact further (proto had no <=600 rule) */
@media (max-width:600px){
  .theme-sunset-citypop .pickup-tag { font-size:9px; letter-spacing:0.25em; padding:5px 12px; }
  .theme-sunset-citypop section { padding:56px 24px; }
  .theme-sunset-citypop .hero { min-height:60vh; }
}
`;
