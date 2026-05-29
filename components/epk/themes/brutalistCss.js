// Scoped CSS for the Brutalist Indie EPK theme (v3).
// Ported faithfully from route14band-epk-v3-brutalist.html — every selector is
// scoped under `.theme-brutalist` and keyframes are namespaced `br-*` so it
// coexists with editorial_dark / sunset_citypop. Injected once via <style> by
// Brutalist.jsx. Fonts @imported here (global layout only loads DM Sans/Sora).
//
// Two deliberate departures from the proto (per Phase 2C handoff):
//  · Structure follows the unified 7-section build (Discography merged into
//    Featured Playlist as the "more" list), not the proto's 8-section split.
//  · Density (hero height, bio grid ratio, section pad) uses the shared EPK
//    tokens, while brutalist-specific type/borders/spacing stay proto-exact.
//  · The pickup-card keeps the proto's bordered 1fr 1fr split — the sunset/
//    editorial center-and-cap variables are intentionally NOT applied here.
export const BRUTALIST_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@300;400;500;600&family=DM+Sans:opsz,wght@9..40,300..700&display=swap');

.theme-brutalist {
  --paper:#F4F0E8; --paper-warm:#EEE8DC;
  --ink:#0A0A0A; --ink-soft:#1A1A1A;
  --red:#E63946; --red-deep:#C42936;
  --gray:#707070; --line:#0A0A0A;
  --line-soft:rgba(10,10,10,0.15);
  /* Shared EPK density tokens — same values across themes. */
  --epk-hero-min-height:75vh; --epk-section-pad-y:80px; --epk-pickup-pad-top:48px;
  --epk-bio-grid:1fr 2fr; --epk-bio-gap:60px;
  background:var(--paper); color:var(--ink);
  font-family:'DM Sans',sans-serif; font-size:16px; line-height:1.55;
  position:relative; overflow-x:hidden; min-height:100vh;
}
.theme-brutalist * { margin:0; padding:0; box-sizing:border-box; }

/* Grain texture — scoped to the EPK root so it never leaks into the dashboard. */
.theme-brutalist::before {
  content:''; position:fixed; inset:0;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.85' numOctaves='3'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.18 0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E");
  pointer-events:none; z-index:200; opacity:0.5; mix-blend-mode:multiply;
}

/* ============ TOP BAR ============ */
.theme-brutalist .topbar { position:sticky; top:0; z-index:100; background:var(--paper); border-bottom:2px solid var(--ink); display:grid; grid-template-columns:auto 1fr auto auto; align-items:center; padding:12px 24px; gap:24px; font-family:'JetBrains Mono',monospace; font-size:11px; text-transform:uppercase; }
.theme-brutalist .topbar-logo { font-family:'Archivo Black',sans-serif; font-size:14px; letter-spacing:-0.01em; }
.theme-brutalist .topbar-meta { color:var(--gray); }
.theme-brutalist .topbar-meta::before { content:'◉ '; color:var(--red); }
.theme-brutalist .lang-toggle { display:inline-flex; border:1.5px solid var(--ink); }
.theme-brutalist .lang-toggle button { background:transparent; border:none; color:var(--ink); font-family:'JetBrains Mono',monospace; font-size:10px; padding:4px 10px; cursor:pointer; }
.theme-brutalist .lang-toggle button.active { background:var(--ink); color:var(--paper); }
.theme-brutalist .topbar a { color:var(--ink); text-decoration:none; border-bottom:1.5px solid var(--ink); padding-bottom:1px; font-weight:600; }

/* ============ HERO ============ */
.theme-brutalist .hero { min-height:var(--epk-hero-min-height); position:relative; padding:40px 24px 24px; display:grid; grid-template-rows:auto 1fr auto; border-bottom:2px solid var(--ink); }
.theme-brutalist .hero-issue-bar { display:grid; grid-template-columns:auto 1fr auto auto auto; align-items:center; gap:24px; padding-bottom:16px; border-bottom:1px solid var(--ink); font-family:'JetBrains Mono',monospace; font-size:11px; text-transform:uppercase; }
.theme-brutalist .hero-issue-bar span { color:var(--gray); }
.theme-brutalist .hero-issue-bar .red { color:var(--red); font-weight:600; }
.theme-brutalist .hero-main { padding:32px 0 48px; display:grid; grid-template-columns:1.2fr 1fr; gap:40px; align-items:stretch; }
.theme-brutalist .hero-left { display:flex; flex-direction:column; justify-content:space-between; }
.theme-brutalist .hero-eyebrow { font-family:'JetBrains Mono',monospace; font-size:11px; text-transform:uppercase; color:var(--ink); margin-bottom:24px; display:inline-block; border-top:1.5px solid var(--ink); border-bottom:1.5px solid var(--ink); padding:6px 0; letter-spacing:0.05em; }
.theme-brutalist .hero h1 { font-family:'Archivo Black',sans-serif; font-size:clamp(72px,13vw,200px); line-height:0.82; letter-spacing:-0.04em; margin-bottom:24px; color:var(--ink); animation:br-fadeUp 0.8s ease 0.2s both; }
.theme-brutalist .hero h1 .red-stripe { display:inline-block; background:var(--red); color:var(--paper); padding:0 0.08em; }
.theme-brutalist .hero-subhead { font-family:'Instrument Serif',serif; font-style:italic; font-size:clamp(22px,2.5vw,32px); line-height:1.3; margin-bottom:32px; max-width:540px; animation:br-fadeUp 0.8s ease 0.4s both; }
.theme-brutalist .hero-subhead em { background:var(--ink); color:var(--paper); font-style:normal; padding:0 6px; }
.theme-brutalist .hero-meta-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:20px; padding-top:24px; border-top:2px solid var(--ink); animation:br-fadeUp 0.8s ease 0.6s both; }
.theme-brutalist .hero-meta-grid > div { font-family:'JetBrains Mono',monospace; font-size:10px; text-transform:uppercase; color:var(--gray); }
.theme-brutalist .hero-meta-grid > div strong { display:block; font-family:'Archivo Black',sans-serif; font-size:22px; color:var(--ink); margin-top:4px; letter-spacing:-0.02em; }
.theme-brutalist .hero-right { position:relative; border:2px solid var(--ink); background:var(--ink); overflow:hidden; min-height:460px; animation:br-fadeIn 1s ease 0.4s both; }
.theme-brutalist .hero-right img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.theme-brutalist .hero-right.has-photo::after { content:'PRESS PHOTO 01'; position:absolute; bottom:12px; left:12px; font-family:'JetBrains Mono',monospace; font-size:10px; text-transform:uppercase; color:var(--paper); background:var(--red); padding:4px 8px; letter-spacing:0.05em; font-weight:600; z-index:3; }
.theme-brutalist .hero-right-visual { position:absolute; inset:0; background: radial-gradient(ellipse 60% 40% at 30% 30%, rgba(230,57,70,0.6) 0%, transparent 60%), radial-gradient(ellipse 50% 60% at 70% 70%, rgba(244,240,232,0.2) 0%, transparent 60%), linear-gradient(135deg, var(--ink) 0%, var(--ink-soft) 100%); }
.theme-brutalist .hero-right-visual svg { position:absolute; inset:0; width:100%; height:100%; }
.theme-brutalist .reg-mark { position:absolute; width:16px; height:16px; border:1.5px solid var(--paper); z-index:2; }
.theme-brutalist .reg-mark::before, .theme-brutalist .reg-mark::after { content:''; position:absolute; background:var(--paper); }
.theme-brutalist .reg-mark::before { top:50%; left:-4px; right:-4px; height:1.5px; transform:translateY(-50%); }
.theme-brutalist .reg-mark::after { left:50%; top:-4px; bottom:-4px; width:1.5px; transform:translateX(-50%); }
.theme-brutalist .reg-mark.tl { top:12px; left:12px; }
.theme-brutalist .reg-mark.tr { top:12px; right:12px; }
.theme-brutalist .reg-mark.bl { bottom:12px; left:12px; }
.theme-brutalist .reg-mark.br { bottom:12px; right:12px; }
.theme-brutalist .hero-ticker { border-top:2px solid var(--ink); padding:14px 0; overflow:hidden; white-space:nowrap; background:var(--ink); color:var(--paper); margin:0 -24px; }
.theme-brutalist .hero-ticker-inner { display:inline-block; animation:br-scroll-x 25s linear infinite; font-family:'JetBrains Mono',monospace; font-size:13px; text-transform:uppercase; letter-spacing:0.08em; font-weight:500; }
.theme-brutalist .hero-ticker-inner span { margin:0 32px; }
.theme-brutalist .hero-ticker-inner span::after { content:'✦'; margin-left:32px; color:var(--red); }
@keyframes br-scroll-x { from{transform:translateX(0)} to{transform:translateX(-50%)} }
@keyframes br-fadeUp { from{opacity:0; transform:translateY(20px)} to{opacity:1; transform:translateY(0)} }
@keyframes br-fadeIn { from{opacity:0} to{opacity:1} }

/* ============ SECTION SHELL ============ */
.theme-brutalist section { padding:var(--epk-section-pad-y) 24px; position:relative; border-bottom:2px solid var(--ink); }
.theme-brutalist .container { max-width:1400px; margin:0 auto; }
.theme-brutalist .section-head { display:grid; grid-template-columns:auto 1fr auto; gap:24px; align-items:center; margin-bottom:56px; padding-bottom:16px; border-bottom:1px solid var(--line-soft); font-family:'JetBrains Mono',monospace; font-size:11px; text-transform:uppercase; }
.theme-brutalist .section-num { background:var(--ink); color:var(--paper); padding:6px 12px; font-weight:600; }
.theme-brutalist .section-label { color:var(--gray); letter-spacing:0.05em; }
.theme-brutalist .section-divider { color:var(--gray); }
.theme-brutalist .section-h2 { font-family:'Archivo Black',sans-serif; font-weight:900; font-size:clamp(56px,9vw,144px); line-height:0.85; letter-spacing:-0.04em; margin-bottom:48px; color:var(--ink); }
.theme-brutalist .section-h2 em { font-family:'Instrument Serif',serif; font-style:italic; font-weight:400; color:var(--red); }

/* ============ PICKUP / FEATURED PLAYLIST ============ */
/* Proto bordered 1fr 1fr split — left meta + right visual divided by the ink
   frame. No center/cap variables: the frame fills its column so there is no
   empty right side to fix. */
.theme-brutalist .pickup-card { display:grid; grid-template-columns:1fr 1fr; gap:0; border:2px solid var(--ink); background:var(--paper-warm); }
.theme-brutalist .pickup-meta { padding:48px 40px; border-right:2px solid var(--ink); }
.theme-brutalist .pickup-tag { font-family:'JetBrains Mono',monospace; font-size:10px; text-transform:uppercase; letter-spacing:0.05em; display:inline-block; background:var(--red); color:var(--paper); padding:4px 10px; margin-bottom:32px; font-weight:600; }
.theme-brutalist .pickup-title { font-family:'Archivo Black',sans-serif; font-size:clamp(56px,7vw,104px); line-height:0.88; letter-spacing:-0.04em; margin-bottom:16px; color:var(--ink); word-break:break-word; }
.theme-brutalist .pickup-title em { font-family:'Instrument Serif',serif; font-style:italic; font-weight:400; color:var(--red); display:block; }
.theme-brutalist .pickup-feat { font-family:'JetBrains Mono',monospace; font-size:12px; text-transform:uppercase; letter-spacing:0.08em; color:var(--gray); margin-bottom:32px; border-top:1px solid var(--line-soft); border-bottom:1px solid var(--line-soft); padding:10px 0; }
.theme-brutalist .pickup-desc { font-family:'Instrument Serif',serif; font-size:22px; line-height:1.45; font-style:italic; color:var(--ink-soft); margin-bottom:32px; max-width:460px; }
.theme-brutalist .pickup-vibes { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:40px; }
.theme-brutalist .vibe-tag { font-family:'JetBrains Mono',monospace; font-size:11px; text-transform:uppercase; padding:6px 12px; border:1.5px solid var(--ink); letter-spacing:0.03em; }
.theme-brutalist .play-button { display:inline-flex; align-items:center; gap:14px; background:var(--ink); color:var(--paper); border:none; font-family:'JetBrains Mono',monospace; font-size:13px; text-transform:uppercase; letter-spacing:0.1em; padding:16px 28px; cursor:pointer; font-weight:600; transition:background 0.2s; text-decoration:none; }
.theme-brutalist .play-button:hover { background:var(--red); }
.theme-brutalist .play-button::before { content:'▶'; font-size:14px; color:var(--red); transition:color 0.2s; }
.theme-brutalist .play-button:hover::before { color:var(--paper); }
.theme-brutalist .pickup-visual { background:var(--ink); position:relative; overflow:hidden; min-height:460px; display:flex; align-items:center; justify-content:center; }
.theme-brutalist .pickup-visual img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.theme-brutalist .disc { width:75%; aspect-ratio:1; border-radius:50%; background: radial-gradient(circle, var(--red) 0%, var(--red) 16%, var(--ink) 17%, var(--ink) 22%, #2a2a2a 23%, #2a2a2a 100%); position:relative; animation:br-spin 6s linear infinite; }
.theme-brutalist .disc::before { content:''; position:absolute; inset:0; border-radius:50%; background:repeating-radial-gradient(circle, transparent 0, transparent 2px, rgba(244,240,232,0.04) 2px, rgba(244,240,232,0.04) 4px); }
.theme-brutalist .disc::after { content:''; position:absolute; top:50%; left:50%; width:8px; height:8px; background:var(--paper); border-radius:50%; transform:translate(-50%,-50%); }
@keyframes br-spin { to{transform:rotate(360deg)} }
.theme-brutalist .waveform-strip { position:absolute; bottom:24px; left:24px; right:24px; height:40px; display:flex; align-items:end; gap:3px; z-index:2; }
.theme-brutalist .waveform-strip .bar { flex:1; background:var(--paper); animation:br-wave 1.5s ease-in-out infinite; }
.theme-brutalist .waveform-strip .bar:nth-child(3n) { background:var(--red); }
@keyframes br-wave { 0%,100%{height:25%} 50%{height:95%} }

/* "More from this playlist" — proto disco-list styling reused as the merged
   remaining-tracks list inside Featured Playlist. */
.theme-brutalist .playlist-more { font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:0.1em; text-transform:uppercase; color:var(--gray); font-weight:600; margin:56px 0 0; }
.theme-brutalist .disco-list { border-top:2px solid var(--ink); margin-top:20px; }
.theme-brutalist .disco-item { display:grid; grid-template-columns:50px 70px 1fr auto; gap:28px; align-items:center; padding:20px 0; border-bottom:1px solid var(--line-soft); transition:all 0.2s ease; }
.theme-brutalist .disco-item:hover { background:var(--ink); color:var(--paper); padding-left:16px; }
.theme-brutalist .disco-item:hover .disco-title { color:var(--paper); }
.theme-brutalist .disco-item:hover .disco-title small { color:var(--paper); opacity:0.6; }
.theme-brutalist .disco-item:hover .disco-num { color:var(--red); }
.theme-brutalist .disco-item:hover .disco-play { border-color:var(--paper); color:var(--paper); }
.theme-brutalist .disco-item:hover .disco-play::after { border-left-color:var(--paper); }
.theme-brutalist .disco-num { font-family:'JetBrains Mono',monospace; font-size:14px; font-weight:600; color:var(--gray); letter-spacing:0.05em; transition:color 0.2s; }
.theme-brutalist .disco-art { width:70px; height:70px; position:relative; overflow:hidden; border:1.5px solid var(--ink); }
.theme-brutalist .disco-art img { width:100%; height:100%; object-fit:cover; }
.theme-brutalist .disco-item:nth-child(1) .disco-art { background:linear-gradient(135deg, var(--red), var(--ink)); }
.theme-brutalist .disco-item:nth-child(2) .disco-art { background:linear-gradient(135deg, var(--ink), var(--red)); }
.theme-brutalist .disco-item:nth-child(3) .disco-art { background:var(--ink); border-color:var(--red); }
.theme-brutalist .disco-item:nth-child(4) .disco-art { background:var(--red); }
.theme-brutalist .disco-item:nth-child(5) .disco-art { background:linear-gradient(135deg, var(--red), var(--ink)); }
.theme-brutalist .disco-title { font-family:'Archivo Black',sans-serif; font-size:26px; letter-spacing:-0.02em; transition:color 0.2s; }
.theme-brutalist .disco-title small { display:block; font-family:'JetBrains Mono',monospace; font-size:11px; text-transform:uppercase; font-weight:400; color:var(--gray); margin-top:6px; letter-spacing:0.05em; transition:color 0.2s; }
.theme-brutalist .disco-play { width:42px; height:42px; border:1.5px solid var(--ink); background:transparent; color:var(--ink); display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.2s; }
.theme-brutalist .disco-play::after { content:''; width:0; height:0; border-left:9px solid var(--ink); border-top:6px solid transparent; border-bottom:6px solid transparent; margin-left:3px; transition:border-left-color 0.2s; }

/* ============ BIO ============ */
.theme-brutalist .bio-grid { display:grid; grid-template-columns:var(--epk-bio-grid); gap:var(--epk-bio-gap); align-items:start; }
.theme-brutalist .bio-sidebar { position:static; }
.theme-brutalist .pull-quote { font-family:'Archivo Black',sans-serif; font-size:36px; line-height:1.05; letter-spacing:-0.03em; margin-bottom:16px; color:var(--ink); }
.theme-brutalist .pull-quote em { font-family:'Instrument Serif',serif; font-style:italic; font-weight:400; color:var(--red); }
.theme-brutalist .pull-quote-attr { font-family:'JetBrains Mono',monospace; font-size:11px; text-transform:uppercase; color:var(--gray); letter-spacing:0.05em; }
.theme-brutalist .bio-body { font-size:17px; line-height:1.75; color:var(--ink-soft); max-width:680px; border-left:2px solid var(--ink); padding-left:32px; }
.theme-brutalist .bio-body p { margin-bottom:24px; }
.theme-brutalist .bio-body p:last-child { margin-bottom:0; }
.theme-brutalist .bio-body p:first-child::first-letter { font-family:'Archivo Black',sans-serif; font-size:80px; line-height:0.85; float:left; padding:6px 14px 0 0; color:var(--red); }
.theme-brutalist .bio-body em { font-family:'Instrument Serif',serif; font-style:italic; font-weight:400; font-size:1.05em; color:var(--ink); }
.theme-brutalist .members-block { margin-top:56px; padding-top:32px; border-top:2px solid var(--ink); }
.theme-brutalist .members-label { font-family:'JetBrains Mono',monospace; font-size:11px; text-transform:uppercase; color:var(--gray); margin-bottom:20px; letter-spacing:0.05em; }
.theme-brutalist .members-list { list-style:none; display:grid; gap:0; }
.theme-brutalist .members-list li { font-family:'Archivo Black',sans-serif; font-size:22px; letter-spacing:-0.01em; color:var(--ink); display:flex; justify-content:space-between; align-items:baseline; padding:14px 0; border-bottom:1px dashed var(--line-soft); }
.theme-brutalist .members-list li span { font-family:'JetBrains Mono',monospace; font-size:10px; text-transform:uppercase; letter-spacing:0.08em; color:var(--red); font-weight:500; }

/* ============ SOUND & MOOD ============ */
.theme-brutalist .sound { background:var(--paper-warm); }
.theme-brutalist .mood-scenes { display:grid; grid-template-columns:repeat(3,1fr); gap:0; border:2px solid var(--ink); }
.theme-brutalist .scene-card { padding:40px 32px; background:var(--paper); border-right:2px solid var(--ink); position:relative; }
.theme-brutalist .scene-card:last-child { border-right:none; }
.theme-brutalist .scene-card:nth-child(2) { background:var(--ink); color:var(--paper); }
.theme-brutalist .scene-card:nth-child(2) .scene-title { color:var(--paper); }
.theme-brutalist .scene-card:nth-child(2) .scene-desc { color:rgba(244,240,232,0.8); }
.theme-brutalist .scene-card:nth-child(2) .scene-num { color:var(--red); }
.theme-brutalist .scene-num { font-family:'JetBrains Mono',monospace; font-size:12px; text-transform:uppercase; color:var(--red); margin-bottom:32px; letter-spacing:0.05em; font-weight:600; }
.theme-brutalist .scene-title { font-family:'Archivo Black',sans-serif; font-size:28px; line-height:1.05; letter-spacing:-0.02em; margin-bottom:16px; color:var(--ink); }
.theme-brutalist .scene-desc { font-size:15px; color:var(--ink-soft); line-height:1.65; }

/* ============ FOR FANS OF ============ */
.theme-brutalist .fans-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:0; border:2px solid var(--ink); }
.theme-brutalist .fan-card { padding:48px 32px; border-right:2px solid var(--ink); position:relative; transition:all 0.2s; }
.theme-brutalist .fan-card:last-child { border-right:none; }
.theme-brutalist .fan-card:hover { background:var(--ink); color:var(--paper); }
.theme-brutalist .fan-card:hover .fan-name { color:var(--paper); }
.theme-brutalist .fan-card:hover .fan-num { color:var(--red); }
.theme-brutalist .fan-card:hover .fan-tag { color:var(--red); border-color:var(--red); }
.theme-brutalist .fan-num { font-family:'JetBrains Mono',monospace; font-size:14px; font-weight:600; color:var(--red); margin-bottom:24px; transition:color 0.2s; }
.theme-brutalist .fan-name { font-family:'Archivo Black',sans-serif; font-size:44px; line-height:0.95; letter-spacing:-0.03em; margin-bottom:16px; color:var(--ink); transition:color 0.2s; }
.theme-brutalist .fan-tag { font-family:'JetBrains Mono',monospace; font-size:10px; text-transform:uppercase; color:var(--gray); display:inline-block; padding:4px 10px; border:1px solid var(--gray); letter-spacing:0.08em; transition:all 0.2s; }

/* ============ TOUR ============ */
.theme-brutalist .tour { background:var(--ink); color:var(--paper); }
.theme-brutalist .tour .section-head { border-bottom-color:rgba(244,240,232,0.15); }
.theme-brutalist .tour .section-num { background:var(--red); color:var(--paper); }
.theme-brutalist .tour .section-label, .theme-brutalist .tour .section-divider { color:rgba(244,240,232,0.6); }
.theme-brutalist .tour-headline { display:grid; grid-template-columns:1fr 1fr; gap:60px; margin-bottom:64px; padding-bottom:56px; border-bottom:1px solid rgba(244,240,232,0.2); }
.theme-brutalist .tour-stat-num { font-family:'Archivo Black',sans-serif; font-size:clamp(120px,16vw,240px); line-height:0.82; letter-spacing:-0.06em; color:var(--paper); }
.theme-brutalist .tour-stat-num em { font-family:'Instrument Serif',serif; font-style:italic; font-weight:400; color:var(--red); }
.theme-brutalist .tour-stat-label { font-family:'JetBrains Mono',monospace; font-size:12px; text-transform:uppercase; margin-top:16px; letter-spacing:0.08em; font-weight:600; }
.theme-brutalist .tour-stat-detail { font-family:'JetBrains Mono',monospace; font-size:11px; text-transform:uppercase; color:rgba(244,240,232,0.6); margin-top:8px; letter-spacing:0.05em; }
.theme-brutalist .tour-item { display:grid; grid-template-columns:80px 1fr 240px; gap:32px; padding:18px 0; border-bottom:1px solid rgba(244,240,232,0.15); align-items:baseline; }
.theme-brutalist .tour-year { font-family:'Archivo Black',sans-serif; font-size:22px; letter-spacing:-0.01em; color:var(--red); }
.theme-brutalist .tour-event { font-family:'Archivo Black',sans-serif; font-size:20px; font-weight:400; letter-spacing:-0.01em; color:var(--paper); }
.theme-brutalist .tour-location { font-family:'JetBrains Mono',monospace; font-size:10px; text-transform:uppercase; color:rgba(244,240,232,0.55); text-align:right; letter-spacing:0.08em; }

/* ============ PRESS ============ */
.theme-brutalist .press-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:0; border-top:2px solid var(--ink); border-bottom:2px solid var(--ink); }
.theme-brutalist .press-item { padding:40px 32px; border-right:2px solid var(--ink); }
.theme-brutalist .press-item:last-child { border-right:none; }
.theme-brutalist .press-quote { font-family:'Instrument Serif',serif; font-style:italic; font-size:28px; line-height:1.4; color:var(--ink); margin-bottom:28px; }
.theme-brutalist .press-quote::before { content:'“'; font-family:'Archivo Black',sans-serif; font-style:normal; font-size:60px; color:var(--red); display:block; line-height:0.5; margin-bottom:12px; }
.theme-brutalist .press-source { font-family:'JetBrains Mono',monospace; font-size:12px; text-transform:uppercase; color:var(--red); letter-spacing:0.08em; font-weight:600; text-decoration:none; }
.theme-brutalist a.press-source { border-bottom:1px solid var(--red); padding-bottom:1px; }
.theme-brutalist .press-date { font-family:'JetBrains Mono',monospace; font-size:11px; text-transform:uppercase; color:var(--gray); margin-top:6px; letter-spacing:0.05em; }

/* ============ OTONAMI BADGE ============ */
.theme-brutalist .otonami-badge { background:var(--red); color:var(--paper); padding:100px 24px; text-align:center; position:relative; overflow:hidden; border-bottom:2px solid var(--ink); }
.theme-brutalist .otonami-badge::before { content:''; position:absolute; inset:0; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.85' numOctaves='3'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E"); mix-blend-mode:multiply; opacity:0.4; }
.theme-brutalist .otonami-badge-inner { position:relative; z-index:2; max-width:900px; margin:0 auto; }
.theme-brutalist .otonami-eyebrow { font-family:'JetBrains Mono',monospace; font-size:11px; text-transform:uppercase; letter-spacing:0.2em; display:inline-block; padding:6px 14px; border:1.5px solid var(--paper); margin-bottom:32px; font-weight:600; }
.theme-brutalist .otonami-h { font-family:'Archivo Black',sans-serif; font-size:clamp(56px,9vw,128px); line-height:0.85; letter-spacing:-0.04em; margin-bottom:32px; color:var(--paper); }
.theme-brutalist .otonami-h em { font-family:'Instrument Serif',serif; font-style:italic; font-weight:400; color:var(--ink); }
.theme-brutalist .otonami-stat-row { display:grid; grid-template-columns:repeat(3,1fr); gap:0; margin:56px 0; padding:40px 0; border-top:2px solid var(--paper); border-bottom:2px solid var(--paper); }
.theme-brutalist .otonami-stat-row > div { border-right:1.5px solid rgba(244,240,232,0.4); padding:12px 0; }
.theme-brutalist .otonami-stat-row > div:last-child { border-right:none; }
.theme-brutalist .otonami-stat-num { font-family:'Archivo Black',sans-serif; font-size:clamp(56px,8vw,96px); line-height:1; letter-spacing:-0.04em; color:var(--paper); }
.theme-brutalist .otonami-stat-label { font-family:'JetBrains Mono',monospace; font-size:10px; text-transform:uppercase; margin-top:12px; letter-spacing:0.12em; opacity:0.85; font-weight:500; }
.theme-brutalist .otonami-caption { font-family:'Instrument Serif',serif; font-style:italic; font-size:20px; line-height:1.5; max-width:640px; margin:0 auto; }

/* ============ CONNECT ============ */
.theme-brutalist .connect { padding:100px 24px; background:var(--paper); border-bottom:none; }
.theme-brutalist .connect-grid { display:grid; grid-template-columns:1.2fr 1fr; gap:80px; align-items:start; }
.theme-brutalist .connect-h { font-family:'Archivo Black',sans-serif; font-size:clamp(56px,9vw,128px); line-height:0.85; letter-spacing:-0.04em; margin-bottom:32px; color:var(--ink); }
.theme-brutalist .connect-h em { font-family:'Instrument Serif',serif; font-style:italic; font-weight:400; color:var(--red); }
.theme-brutalist .connect-desc { font-family:'Instrument Serif',serif; font-style:italic; font-size:22px; line-height:1.5; color:var(--ink-soft); max-width:480px; margin-bottom:40px; }
.theme-brutalist .connect-buttons { display:flex; flex-direction:column; gap:0; max-width:480px; border:2px solid var(--ink); }
.theme-brutalist .connect-button { display:flex; align-items:center; justify-content:space-between; padding:20px 24px; background:var(--paper); color:var(--ink); font-family:'JetBrains Mono',monospace; font-size:12px; text-transform:uppercase; text-decoration:none; border-bottom:1px solid var(--ink); letter-spacing:0.05em; font-weight:600; transition:all 0.2s; }
.theme-brutalist .connect-button:last-child { border-bottom:none; }
.theme-brutalist .connect-button:hover { background:var(--ink); color:var(--paper); }
.theme-brutalist .connect-button:hover::after { color:var(--red); }
.theme-brutalist .connect-button::after { content:'→'; font-size:18px; transition:color 0.2s; }
.theme-brutalist .connect-button .label::before { content:'→ '; }
.theme-brutalist .connect-contacts { display:grid; gap:28px; }
.theme-brutalist .contact-block { padding:20px 0; border-top:1.5px solid var(--ink); }
.theme-brutalist .contact-role { font-family:'JetBrains Mono',monospace; font-size:10px; text-transform:uppercase; color:var(--red); margin-bottom:8px; letter-spacing:0.12em; font-weight:600; }
.theme-brutalist .contact-name { font-family:'Archivo Black',sans-serif; font-size:24px; letter-spacing:-0.01em; color:var(--ink); margin-bottom:6px; }
.theme-brutalist .contact-email { font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--ink); text-decoration:none; border-bottom:1px solid var(--ink); padding-bottom:1px; }
.theme-brutalist .contact-email:hover { color:var(--red); border-color:var(--red); }

/* ============ FOOTER ============ */
.theme-brutalist .br-footer { background:var(--ink); color:var(--paper); padding:32px 24px; display:flex; justify-content:space-between; align-items:center; font-family:'JetBrains Mono',monospace; font-size:11px; text-transform:uppercase; letter-spacing:0.05em; }
.theme-brutalist .br-footer a { color:var(--red); text-decoration:none; border-bottom:1px solid var(--red); padding-bottom:1px; font-weight:600; }

/* ============ RESPONSIVE ============ */
/* PC-only: tighten the Featured Playlist top padding to match other themes'
   density (mobile keeps the standard 56px section padding). */
@media (min-width:901px) {
  .theme-brutalist .pickup { padding-top:var(--epk-pickup-pad-top); }
}
@media (max-width:900px) {
  .theme-brutalist section { padding:56px 20px; }
  .theme-brutalist .topbar { grid-template-columns:1fr auto; gap:12px; padding:10px 16px; }
  .theme-brutalist .topbar-meta { display:none; }
  .theme-brutalist .hero { padding:24px 20px 20px; }
  .theme-brutalist .hero-issue-bar { grid-template-columns:1fr auto; gap:8px; font-size:10px; }
  .theme-brutalist .hero-issue-bar span.hide-sm { display:none; }
  .theme-brutalist .hero-main { grid-template-columns:1fr; gap:32px; }
  .theme-brutalist .hero h1 { font-size:64px; }
  .theme-brutalist .hero-subhead { font-size:19px; }
  .theme-brutalist .hero-meta-grid { grid-template-columns:repeat(2,1fr); gap:16px; }
  .theme-brutalist .hero-meta-grid > div strong { font-size:18px; }
  .theme-brutalist .hero-right { min-height:320px; }
  .theme-brutalist .hero-ticker { margin:0 -20px; padding:12px 0; }
  .theme-brutalist .hero-ticker-inner { font-size:11px; }
  .theme-brutalist .section-head { grid-template-columns:auto 1fr; gap:12px; }
  .theme-brutalist .section-divider { display:none; }
  .theme-brutalist .pickup-card { grid-template-columns:1fr; }
  .theme-brutalist .pickup-meta { padding:32px 24px; border-right:none; border-bottom:2px solid var(--ink); }
  .theme-brutalist .pickup-title { font-size:48px; }
  .theme-brutalist .pickup-desc { font-size:18px; }
  .theme-brutalist .pickup-visual { min-height:320px; }
  .theme-brutalist .bio-grid { grid-template-columns:1fr; gap:40px; }
  .theme-brutalist .pull-quote { font-size:28px; }
  .theme-brutalist .bio-body { padding-left:20px; }
  .theme-brutalist .bio-body p:first-child::first-letter { font-size:64px; }
  .theme-brutalist .disco-item { grid-template-columns:36px 56px 1fr; gap:16px; padding:14px 0; }
  .theme-brutalist .disco-art { width:56px; height:56px; }
  .theme-brutalist .disco-title { font-size:19px; }
  .theme-brutalist .disco-play { display:none; }
  .theme-brutalist .mood-scenes { grid-template-columns:1fr; }
  .theme-brutalist .scene-card { border-right:none; border-bottom:2px solid var(--ink); }
  .theme-brutalist .scene-card:last-child { border-bottom:none; }
  .theme-brutalist .scene-card:nth-child(2) { background:var(--paper); color:var(--ink); }
  .theme-brutalist .scene-card:nth-child(2) .scene-title { color:var(--ink); }
  .theme-brutalist .scene-card:nth-child(2) .scene-desc { color:var(--ink-soft); }
  .theme-brutalist .fans-grid { grid-template-columns:1fr; }
  .theme-brutalist .fan-card { border-right:none; border-bottom:2px solid var(--ink); padding:32px 24px; }
  .theme-brutalist .fan-card:last-child { border-bottom:none; }
  .theme-brutalist .fan-name { font-size:32px; }
  .theme-brutalist .tour-headline { grid-template-columns:1fr; gap:32px; padding-bottom:32px; }
  .theme-brutalist .tour-item { grid-template-columns:1fr; gap:4px; padding:12px 0; }
  .theme-brutalist .tour-location { text-align:left; }
  .theme-brutalist .press-grid { grid-template-columns:1fr; }
  .theme-brutalist .press-item { border-right:none; border-bottom:2px solid var(--ink); padding:32px 20px; }
  .theme-brutalist .press-item:last-child { border-bottom:none; }
  .theme-brutalist .press-quote { font-size:22px; }
  .theme-brutalist .otonami-badge { padding:64px 20px; }
  .theme-brutalist .otonami-h { font-size:48px; }
  .theme-brutalist .otonami-stat-row { grid-template-columns:1fr; gap:0; padding:24px 0; }
  .theme-brutalist .otonami-stat-row > div { border-right:none; border-bottom:1.5px solid rgba(244,240,232,0.4); }
  .theme-brutalist .otonami-stat-row > div:last-child { border-bottom:none; }
  .theme-brutalist .otonami-stat-num { font-size:56px; padding:16px 0; }
  .theme-brutalist .connect { padding:56px 20px; }
  .theme-brutalist .connect-grid { grid-template-columns:1fr; gap:48px; }
  .theme-brutalist .connect-h { font-size:56px; }
  .theme-brutalist .connect-desc { font-size:18px; }
  .theme-brutalist .br-footer { flex-direction:column; gap:12px; padding:24px 20px; text-align:center; }
}
`;
