// Scoped CSS for the Editorial Dark EPK theme.
// Ported from the ROUTE14band prototype; every selector is scoped under
// `.epk-root` and keyframes are renamed `epk-*` so nothing leaks into the
// rest of the app. Injected once via <style> by EditorialDark.jsx.
// Fraunces is @imported here because the global layout only loads DM Sans/Sora.

export const EDITORIAL_DARK_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700&display=swap');

.epk-root {
  --ink-deepest:#0a1620; --ink-deep:#122230; --ink-mid:#1c3142;
  --paper:#f5ecd9; --paper-warm:#ede1c8; --gold:#c4956a; --gold-bright:#d9a572;
  --coral:#d8553f; --muted:#8a9aa8;
  --line:rgba(245,236,217,0.12); --line-strong:rgba(245,236,217,0.25);
  --glass-bg:rgba(245,236,217,0.04); --glass-border:rgba(245,236,217,0.14);
  background:var(--ink-deepest); color:var(--paper);
  font-family:'DM Sans',sans-serif; font-size:16px; line-height:1.6;
  position:relative; overflow-x:hidden; min-height:100vh;
}
.epk-root * { margin:0; padding:0; box-sizing:border-box; }

.epk-root::before {
  content:''; position:fixed; inset:0; pointer-events:none; z-index:100;
  opacity:0.5; mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='3'/%3E%3CfeColorMatrix values='0 0 0 0 0.96 0 0 0 0 0.93 0 0 0 0 0.85 0 0 0 0.08 0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E");
}

/* Topbar */
.epk-root .topbar { position:fixed; top:0; left:0; right:0; z-index:50; display:flex; justify-content:space-between; align-items:center; padding:18px 36px; font-family:'DM Sans',sans-serif; font-size:11px; letter-spacing:0.18em; text-transform:uppercase; color:var(--paper); background:linear-gradient(180deg, rgba(10,22,32,0.7) 0%, rgba(10,22,32,0) 100%); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); }
.epk-root .topbar-left { display:flex; gap:24px; align-items:center; }
.epk-root .topbar .dot { width:6px; height:6px; border-radius:50%; background:var(--coral); display:inline-block; margin-right:8px; animation:epk-pulse 2s infinite; }
@keyframes epk-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.epk-root .topbar-right { display:flex; gap:18px; align-items:center; }
.epk-root .topbar a { color:var(--paper); text-decoration:none; opacity:0.7; transition:opacity 0.2s; }
.epk-root .topbar a:hover { opacity:1; }
.epk-root .lang-toggle { display:inline-flex; border:1px solid var(--line-strong); border-radius:100px; overflow:hidden; }
.epk-root .lang-toggle button { background:transparent; border:none; color:var(--paper); font-family:inherit; font-size:10px; letter-spacing:0.15em; padding:4px 12px; cursor:pointer; opacity:0.5; transition:all 0.2s; }
.epk-root .lang-toggle button.active { background:var(--paper); color:var(--ink-deepest); opacity:1; }

/* Hero */
.epk-root .hero { min-height:100vh; position:relative; display:grid; grid-template-columns:1fr 1fr; align-items:center; padding:120px 60px 60px; overflow:hidden; }
.epk-root .hero-bg { position:absolute; inset:0; background: radial-gradient(ellipse at 70% 30%, rgba(196,149,106,0.18) 0%, transparent 50%), radial-gradient(ellipse at 20% 70%, rgba(216,85,63,0.12) 0%, transparent 55%), linear-gradient(180deg, var(--ink-deep) 0%, var(--ink-deepest) 100%); }
.epk-root .hero-left { position:relative; z-index:2; }
.epk-root .kicker { font-family:'DM Sans',sans-serif; font-size:11px; letter-spacing:0.32em; text-transform:uppercase; color:var(--gold); margin-bottom:28px; display:flex; align-items:center; gap:14px; animation:epk-fadeUp 0.8s ease 0.2s both; }
.epk-root .kicker::before { content:''; width:32px; height:1px; background:var(--gold); }
.epk-root .hero h1 { font-family:'Fraunces',serif; font-weight:300; font-size:clamp(56px,8vw,132px); line-height:0.92; letter-spacing:-0.035em; color:var(--paper); margin-bottom:32px; font-variation-settings:"opsz" 144; animation:epk-fadeUp 1s ease 0.3s both; white-space:nowrap; overflow-wrap:normal; word-break:keep-all; }
.epk-root .hero h1 em { font-style:italic; font-weight:300; color:var(--gold-bright); display:block; font-size:0.5em; margin-top:8px; letter-spacing:-0.01em; }
.epk-root .hero-tagline { font-family:'Fraunces',serif; font-style:italic; font-weight:300; font-size:clamp(20px,2vw,26px); line-height:1.4; color:var(--paper-warm); max-width:480px; margin-bottom:48px; animation:epk-fadeUp 1s ease 0.5s both; }
.epk-root .hero-meta { display:flex; gap:48px; font-size:11px; letter-spacing:0.18em; text-transform:uppercase; color:var(--muted); animation:epk-fadeUp 1s ease 0.7s both; flex-wrap:wrap; }
.epk-root .hero-meta div span { display:block; color:var(--paper); font-size:18px; font-family:'Fraunces',serif; letter-spacing:0; text-transform:none; margin-top:4px; font-weight:400; }
.epk-root .hero-right { position:relative; z-index:2; height:78vh; display:flex; justify-content:center; align-items:center; }
.epk-root .hero-visual { position:relative; width:100%; max-width:520px; aspect-ratio:4/5; animation:epk-fadeIn 1.4s ease 0.6s both; }
.epk-root .portrait-frame { position:absolute; inset:0; background:var(--ink-deepest); border:1px solid var(--line-strong); overflow:hidden; }
.epk-root .portrait-frame img { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; object-position:center; z-index:3; filter:drop-shadow(0 18px 36px rgba(0,0,0,0.45)); }
.epk-root .portrait-frame svg { position:absolute; inset:0; width:100%; height:100%; z-index:3; }
/* Apple-Music-style: same photo blurred & zoomed behind the contained foreground */
.epk-root .hero-photo-bg { position:absolute; inset:-40px; background-size:cover; background-position:center; background-repeat:no-repeat; filter:blur(50px) saturate(1.4); -webkit-filter:blur(50px) saturate(1.4); opacity:0.7; z-index:1; transform:translateZ(0); will-change:filter; }
.epk-root .portrait-frame::after { content:''; position:absolute; inset:0; background:linear-gradient(135deg, rgba(10,22,32,0.2) 0%, rgba(10,22,32,0.5) 100%); z-index:2; pointer-events:none; }
.epk-root .vinyl { position:absolute; z-index:4; width:120px; height:120px; right:-20px; bottom:-20px; border-radius:50%; background: radial-gradient(circle, var(--gold) 0%, var(--gold) 18%, var(--ink-deepest) 19%, var(--ink-deepest) 25%, #1a2c3a 26%, #1a2c3a 100%); box-shadow:0 20px 60px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(196,149,106,0.3); animation:epk-spin 12s linear infinite; }
.epk-root .vinyl::after { content:''; position:absolute; inset:0; border-radius:50%; background:repeating-radial-gradient(circle, transparent 0, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 3px); }
@keyframes epk-spin { to { transform:rotate(360deg); } }
@keyframes epk-fadeUp { from{opacity:0; transform:translateY(20px)} to{opacity:1; transform:translateY(0)} }
@keyframes epk-fadeIn { from{opacity:0} to{opacity:1} }
.epk-root .scroll-cue { position:absolute; bottom:32px; left:50%; transform:translateX(-50%); font-size:10px; letter-spacing:0.3em; text-transform:uppercase; color:var(--muted); display:flex; flex-direction:column; align-items:center; gap:8px; }
.epk-root .scroll-cue::after { content:''; width:1px; height:32px; background:linear-gradient(180deg, var(--gold) 0%, transparent 100%); animation:epk-scrollline 2s ease-in-out infinite; }
@keyframes epk-scrollline { 0%,100%{transform:scaleY(0.4); transform-origin:top} 50%{transform:scaleY(1); transform-origin:top} }

/* Sections */
.epk-root section { padding:120px 60px; position:relative; }
.epk-root .section-label { display:flex; align-items:center; gap:14px; font-size:11px; letter-spacing:0.32em; text-transform:uppercase; color:var(--gold); margin-bottom:48px; }
.epk-root .section-label::before { content:attr(data-no); font-family:'Fraunces',serif; font-style:italic; font-size:20px; font-weight:300; letter-spacing:0; text-transform:none; color:var(--paper); opacity:0.7; }
.epk-root .section-label::after { content:''; flex:1; height:1px; background:var(--line); }
.epk-root .section-h2 { font-family:'Fraunces',serif; font-weight:300; font-size:clamp(40px,5vw,72px); line-height:1; letter-spacing:-0.02em; margin-bottom:48px; color:var(--paper); }
.epk-root .section-h2 em { font-style:italic; color:var(--gold-bright); font-weight:300; }

/* Featured track */
.epk-root .pickup { padding-top:60px; }
.epk-root .pickup-card { background:var(--glass-bg); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid var(--glass-border); border-radius:4px; padding:64px 56px; position:relative; overflow:hidden; display:grid; grid-template-columns:1fr 1fr; gap:64px; align-items:center; }
.epk-root .pickup-card::before { content:''; position:absolute; inset:0; background: radial-gradient(circle at 80% 20%, rgba(196,149,106,0.15) 0%, transparent 50%), radial-gradient(circle at 10% 90%, rgba(216,85,63,0.1) 0%, transparent 60%); pointer-events:none; }
.epk-root .pickup-meta { position:relative; z-index:2; }
.epk-root .pickup-tag { display:inline-block; font-size:10px; letter-spacing:0.3em; text-transform:uppercase; color:var(--coral); padding:6px 12px; border:1px solid var(--coral); border-radius:100px; margin-bottom:32px; }
.epk-root .pickup-title { font-family:'Fraunces',serif; font-weight:300; font-size:clamp(44px,6vw,80px); line-height:0.95; letter-spacing:-0.02em; margin-bottom:8px; color:var(--paper); }
.epk-root .pickup-subtitle { font-family:'Fraunces',serif; font-style:italic; font-weight:300; font-size:22px; color:var(--gold-bright); margin-bottom:32px; }
.epk-root .pickup-desc { font-size:15px; line-height:1.7; color:var(--paper-warm); opacity:0.85; margin-bottom:40px; max-width:420px; }
.epk-root .play-button { display:inline-flex; align-items:center; gap:16px; background:var(--paper); color:var(--ink-deepest); border:none; font-family:'DM Sans',sans-serif; font-size:13px; letter-spacing:0.15em; text-transform:uppercase; padding:16px 32px; border-radius:100px; cursor:pointer; font-weight:500; transition:transform 0.3s ease; text-decoration:none; }
.epk-root .play-button:hover { transform:translateX(4px); }
.epk-root .play-button .icon { width:24px; height:24px; background:var(--ink-deepest); border-radius:50%; position:relative; display:inline-flex; align-items:center; justify-content:center; }
.epk-root .play-button .icon::after { content:''; width:0; height:0; border-left:7px solid var(--paper); border-top:4px solid transparent; border-bottom:4px solid transparent; margin-left:2px; }
.epk-root .pickup-visual { position:relative; z-index:2; aspect-ratio:1; border-radius:4px; overflow:hidden; background:linear-gradient(135deg, var(--coral) 0%, var(--gold) 40%, var(--ink-mid) 100%); }
.epk-root .pickup-visual img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.epk-root .pickup-visual svg { position:absolute; inset:0; width:100%; height:100%; }
.epk-root .waveform { position:absolute; bottom:24px; left:24px; right:24px; height:60px; display:flex; align-items:end; gap:3px; }
.epk-root .waveform .bar { flex:1; background:var(--paper); border-radius:1px; opacity:0.85; animation:epk-wave 1.5s ease-in-out infinite; }
@keyframes epk-wave { 0%,100%{height:20%} 50%{height:90%} }

/* Bio */
.epk-root .bio { background:var(--ink-deep); }
.epk-root .bio-grid { display:grid; grid-template-columns:1fr 1.5fr; gap:80px; align-items:start; }
.epk-root .bio-sidebar { position:sticky; top:100px; }
.epk-root .pull-quote { font-family:'Fraunces',serif; font-style:italic; font-weight:300; font-size:28px; line-height:1.35; color:var(--gold-bright); border-left:2px solid var(--gold); padding-left:24px; margin-bottom:16px; }
.epk-root .pull-quote-translation { font-size:13px; letter-spacing:0.05em; color:var(--muted); padding-left:26px; }
.epk-root .bio-body { font-size:16px; line-height:1.75; color:var(--paper-warm); max-width:640px; }
.epk-root .bio-body p { margin-bottom:24px; }
.epk-root .bio-body p:first-child::first-letter { font-family:'Fraunces',serif; font-weight:300; font-size:78px; line-height:0.85; float:left; padding:4px 12px 0 0; color:var(--gold-bright); font-style:italic; }
/* Japanese bio: drop cap reads as a foreign-typography artifact — neutralize it. */
.epk-root .bio-body.bio-jp p:first-child::first-letter { font-size:inherit; font-family:inherit; font-weight:inherit; font-style:inherit; float:none; padding:0; color:inherit; line-height:inherit; }

/* OTONAMI badge */
.epk-root .otonami-badge { background:linear-gradient(180deg, var(--ink-deep), var(--ink-deepest)); padding:100px 60px; text-align:center; position:relative; overflow:hidden; }
.epk-root .otonami-badge::before { content:''; position:absolute; inset:0; background:radial-gradient(ellipse at center, rgba(196,149,106,0.1) 0%, transparent 70%); }
.epk-root .otonami-badge-inner { position:relative; z-index:2; max-width:720px; margin:0 auto; }
.epk-root .otonami-eyebrow { font-size:11px; letter-spacing:0.4em; text-transform:uppercase; color:var(--gold); margin-bottom:32px; }
.epk-root .otonami-stat-row { display:grid; grid-template-columns:repeat(3,1fr); gap:48px; margin:48px 0; padding:48px 0; border-top:1px solid var(--line); border-bottom:1px solid var(--line); }
.epk-root .otonami-stat-num { font-family:'Fraunces',serif; font-weight:300; font-size:64px; color:var(--paper); line-height:1; letter-spacing:-0.02em; }
.epk-root .otonami-stat-num em { font-style:italic; color:var(--gold-bright); }
.epk-root .otonami-stat-label { font-size:10px; letter-spacing:0.3em; text-transform:uppercase; color:var(--muted); margin-top:12px; }
.epk-root .otonami-caption { font-family:'Fraunces',serif; font-style:italic; font-size:18px; color:var(--paper-warm); line-height:1.6; }

/* Connect */
.epk-root .connect { padding:120px 60px; background:var(--ink-deepest); }
.epk-root .connect-grid { display:grid; grid-template-columns:1.2fr 1fr; gap:80px; align-items:start; }
.epk-root .connect-h { font-family:'Fraunces',serif; font-weight:300; font-size:clamp(44px,6vw,88px); line-height:0.95; letter-spacing:-0.02em; margin-bottom:32px; color:var(--paper); }
.epk-root .connect-h em { font-style:italic; color:var(--gold-bright); }
.epk-root .connect-desc { font-size:17px; line-height:1.6; color:var(--paper-warm); max-width:480px; margin-bottom:40px; }
.epk-root .connect-buttons { display:flex; flex-direction:column; gap:12px; max-width:380px; }
.epk-root .connect-button { display:flex; align-items:center; justify-content:space-between; padding:20px 28px; background:transparent; border:1px solid var(--line-strong); color:var(--paper); font-family:'DM Sans',sans-serif; font-size:14px; letter-spacing:0.05em; text-decoration:none; border-radius:100px; transition:all 0.3s ease; }
.epk-root .connect-button:hover { background:var(--paper); color:var(--ink-deepest); border-color:var(--paper); }
.epk-root .connect-button::after { content:'\\2192'; font-size:18px; }
.epk-root .connect-contacts { display:grid; gap:32px; }
.epk-root .contact-block { padding:24px 0; border-top:1px solid var(--line); }
.epk-root .contact-role { font-size:10px; letter-spacing:0.3em; text-transform:uppercase; color:var(--gold); margin-bottom:8px; }
.epk-root .contact-name { font-family:'Fraunces',serif; font-size:22px; color:var(--paper); margin-bottom:4px; }
.epk-root .contact-email { font-size:14px; color:var(--paper-warm); text-decoration:none; border-bottom:1px solid var(--line-strong); padding-bottom:2px; }
.epk-root .contact-email:hover { border-color:var(--gold); }

/* Footer */
.epk-root .epk-footer { padding:48px 60px; border-top:1px solid var(--line); display:flex; justify-content:space-between; align-items:center; gap:16px; font-size:11px; letter-spacing:0.2em; text-transform:uppercase; color:var(--muted); flex-wrap:wrap; }
.epk-root .epk-footer a { color:var(--gold); text-decoration:none; border-bottom:1px solid var(--gold); padding-bottom:1px; }

/* Featured Playlist — list under the pinned pickup card */
.epk-root .playlist-list { margin-top:56px; }
.epk-root .playlist-list-title { font-family:'DM Sans',sans-serif; font-size:11px; letter-spacing:0.3em; text-transform:uppercase; color:var(--muted); margin-bottom:16px; }
.epk-root .playlist-list ul { list-style:none; }
.epk-root .playlist-row { display:flex; align-items:center; gap:20px; padding:16px 8px; border-top:1px solid var(--line); transition:background 0.25s ease; }
.epk-root .playlist-row:last-child { border-bottom:1px solid var(--line); }
.epk-root .playlist-row:hover { background:var(--glass-bg); }
.epk-root .playlist-num { font-family:'Fraunces',serif; font-style:italic; font-size:18px; color:var(--gold); min-width:26px; }
.epk-root .playlist-art { width:56px; height:56px; border-radius:3px; object-fit:cover; flex-shrink:0; }
.epk-root .playlist-art-ph { background:linear-gradient(135deg, var(--coral) 0%, var(--gold) 50%, var(--ink-mid) 100%); }
.epk-root .playlist-info { display:flex; flex-direction:column; gap:4px; flex:1; min-width:0; }
.epk-root .playlist-title { font-family:'Fraunces',serif; font-size:20px; color:var(--paper); line-height:1.2; }
.epk-root .playlist-sub { font-size:11px; letter-spacing:0.1em; text-transform:uppercase; color:var(--muted); }
.epk-root .playlist-play { width:40px; height:40px; flex-shrink:0; border-radius:50%; border:1px solid var(--line-strong); color:var(--paper); display:flex; align-items:center; justify-content:center; text-decoration:none; font-size:12px; transition:all 0.25s ease; }
.epk-root .playlist-play:hover { background:var(--paper); color:var(--ink-deepest); border-color:var(--paper); }

/* Sound & Mood */
.epk-root .scene-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:28px; }
.epk-root .scene-card { background:var(--glass-bg); border:1px solid var(--glass-border); border-radius:4px; padding:36px 28px; }
.epk-root .scene-num { font-family:'Fraunces',serif; font-style:italic; font-size:28px; color:var(--gold); opacity:0.75; margin-bottom:18px; }
.epk-root .scene-title { font-family:'Fraunces',serif; font-weight:300; font-size:26px; line-height:1.15; color:var(--paper); margin-bottom:14px; }
.epk-root .scene-desc { font-size:14px; line-height:1.65; color:var(--paper-warm); opacity:0.85; }

/* For Fans Of */
.epk-root .fans-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
.epk-root .fan-card { border:1px solid var(--line-strong); border-radius:4px; padding:36px 24px; text-align:center; transition:border-color 0.25s ease, background 0.25s ease; }
.epk-root .fan-card:hover { background:var(--glass-bg); border-color:var(--gold); }
.epk-root .fan-name { font-family:'Fraunces',serif; font-weight:300; font-size:28px; color:var(--paper); line-height:1.1; margin-bottom:8px; }
.epk-root .fan-tag { font-size:11px; letter-spacing:0.15em; text-transform:uppercase; color:var(--gold); }
.epk-root .fans-note { margin-top:28px; font-family:'Fraunces',serif; font-style:italic; font-size:14px; color:var(--muted); }

/* Tour & Live */
.epk-root .tour-highlights { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:24px; margin-bottom:56px; }
.epk-root .highlight-card { background:var(--glass-bg); border:1px solid var(--glass-border); border-radius:4px; padding:36px 28px; }
.epk-root .highlight-num { font-family:'Fraunces',serif; font-weight:300; font-size:56px; line-height:1; color:var(--gold-bright); letter-spacing:-0.02em; }
.epk-root .highlight-num span { font-size:24px; font-style:italic; color:var(--gold); margin-left:4px; }
.epk-root .highlight-label { font-family:'Fraunces',serif; font-size:22px; color:var(--paper); margin-top:16px; line-height:1.2; }
.epk-root .highlight-loc { font-size:11px; letter-spacing:0.15em; text-transform:uppercase; color:var(--muted); margin-top:10px; }
.epk-root .tour-timeline { list-style:none; }
.epk-root .tour-row { display:grid; grid-template-columns:80px 1fr auto; gap:24px; align-items:baseline; padding:20px 8px; border-top:1px solid var(--line); }
.epk-root .tour-row:last-child { border-bottom:1px solid var(--line); }
.epk-root .tour-year { font-family:'Fraunces',serif; font-style:italic; font-size:20px; color:var(--gold); }
.epk-root .tour-event { font-size:16px; color:var(--paper); }
.epk-root .tour-loc { font-size:11px; letter-spacing:0.12em; text-transform:uppercase; color:var(--muted); text-align:right; }

/* Press & Recognition */
.epk-root .press-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:28px; }
.epk-root .press-card { background:var(--glass-bg); border:1px solid var(--glass-border); border-left:2px solid var(--gold); border-radius:4px; padding:36px 32px; }
.epk-root .press-quote { font-family:'Fraunces',serif; font-style:italic; font-weight:300; font-size:22px; line-height:1.45; color:var(--paper-warm); margin-bottom:24px; }
.epk-root .press-meta { display:flex; justify-content:space-between; align-items:baseline; gap:16px; flex-wrap:wrap; }
.epk-root .press-source { font-size:12px; letter-spacing:0.15em; text-transform:uppercase; color:var(--gold); text-decoration:none; }
.epk-root a.press-source:hover { border-bottom:1px solid var(--gold); }
.epk-root .press-date { font-size:11px; letter-spacing:0.1em; color:var(--muted); }

/* Responsive */
@media (max-width:900px){
  .epk-root section { padding:80px 24px; }
  .epk-root .topbar { padding:14px 20px; font-size:10px; }
  .epk-root .topbar-right { gap:12px; }
  .epk-root .hero { grid-template-columns:1fr; padding:100px 24px 40px; }
  .epk-root .hero-right { height:50vh; margin-top:32px; }
  .epk-root .hero-photo-bg { inset:-20px; filter:blur(30px) saturate(1.4); -webkit-filter:blur(30px) saturate(1.4); }
  .epk-root .hero h1 { font-size:clamp(40px,12vw,56px); }
  .epk-root .hero-tagline { font-size:18px; }
  .epk-root .hero-meta { gap:24px; }
  .epk-root .pickup-card { grid-template-columns:1fr; padding:40px 28px; gap:40px; }
  .epk-root .pickup-title { font-size:44px; }
  .epk-root .bio-grid { grid-template-columns:1fr; gap:40px; }
  .epk-root .bio-sidebar { position:static; }
  .epk-root .otonami-stat-row { grid-template-columns:1fr; gap:32px; padding:32px 0; }
  .epk-root .otonami-stat-num { font-size:48px; }
  .epk-root .connect-grid { grid-template-columns:1fr; gap:48px; }
  .epk-root .connect-h { font-size:44px; }
  .epk-root .epk-footer { flex-direction:column; gap:16px; padding:32px 24px; text-align:center; }
  .epk-root .scene-grid { grid-template-columns:1fr; gap:18px; }
  .epk-root .fans-grid { grid-template-columns:1fr 1fr; }
  .epk-root .tour-highlights { grid-template-columns:1fr; }
  .epk-root .press-grid { grid-template-columns:1fr; }
  .epk-root .tour-row { grid-template-columns:56px 1fr; gap:12px; }
  .epk-root .tour-loc { grid-column:2; text-align:left; }
  .epk-root .playlist-row { gap:14px; }
  .epk-root .playlist-title { font-size:17px; }
  .epk-root .playlist-art { width:48px; height:48px; }
}

/* Phones only: drop the decorative vinyl. Tablets (>=601px) keep it visible. */
@media (max-width:600px){
  .epk-root .vinyl { display:none; }
  .epk-root .hero-photo-bg { filter:blur(20px) saturate(1.3); -webkit-filter:blur(20px) saturate(1.3); opacity:0.6; }
}

/* Tablet single-column: let the photo size to its full height so the vinyl
   sits inside the hero instead of overflowing past its bottom edge. */
@media (min-width:601px) and (max-width:900px){
  .epk-root .hero-right { height:auto; }
  .epk-root .vinyl { right:-16px; bottom:0; }
}
`;
