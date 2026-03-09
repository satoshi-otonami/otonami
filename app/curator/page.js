"use client";
import { useState, useEffect, useRef } from 'react';
import { T } from '@/lib/design-tokens';

const GENRE_OPTIONS = [
  'J-Pop','J-Rock','City Pop','Anime','Visual Kei','Vocaloid','Enka','Kayokyoku',
  'Indie Rock','Indie Pop','Shoegaze','Post Rock','Noise','Garage Rock',
  'Post Punk','Math Rock','Emo','Alt Rock','Dream Pop','Lo-Fi',
  'Electronic','Ambient','IDM','Techno','House','Club','Synth Pop','Chillout',
  'Jazz','Fusion','City Jazz','Soul','Funk','R&B','Neo Soul',
  'Hip-Hop','Trap','J-Hip-Hop','Boom Bap',
  'Folk','Acoustic','Singer-Songwriter','Americana',
  'Experimental','Avant-garde','Classical','Metal','Punk','Hardcore',
];

const TYPE_OPTIONS = [
  { value: 'blog',     en: 'Blog / Media',        ja: 'ブログ・メディア' },
  { value: 'playlist', en: 'Playlist Curator',     ja: 'プレイリスト' },
  { value: 'radio',    en: 'Radio / Podcast',      ja: 'ラジオ・ポッドキャスト' },
  { value: 'label',    en: 'Record Label',         ja: 'レコードレーベル' },
];

const REGION_OPTIONS = [
  'Global','EN/Global','JP/EN','JP/Global','Asia','Europe','US/Global','Latin America','Africa','Middle East'
];

export default function CuratorRegistrationPage() {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [lang, setLang] = useState('ja');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Login state
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginStatus, setLoginStatus] = useState(null);
  const [loginError, setLoginError] = useState('');
  const [loggedInCurator, setLoggedInCurator] = useState(null);

  // Register state
  const [form, setForm] = useState({
    name: '', email: '', password: '', type: 'blog',
    outletName: '', url: '', bio: '', followers: '',
    region: 'Global', genres: [], paypalEmail: '',
  });
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('otonami_locale');
      if (saved === 'ja' || saved === 'en') { setLang(saved); return; }
      if (navigator.language?.startsWith('ja')) setLang('ja');
      else setLang('en');
    } catch {}
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

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const toggleGenre = (g) => set('genres',
    form.genres.includes(g) ? form.genres.filter(x => x !== g) : [...form.genres, g]
  );

  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) {
      setLoginError('Email and password are required. / メールとパスワードを入力してください。');
      return;
    }
    setLoginStatus('loading');
    setLoginError('');
    try {
      const res = await fetch('/api/curators/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email: loginForm.email, password: loginForm.password }),
      });
      const data = await res.json();
      if (res.status === 409 && data.error === 'password_not_set') {
        setLoginStatus('password_not_set');
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Login failed');
      localStorage.setItem('curator_token', data.token);
      setLoggedInCurator(data.curator);
      setLoginStatus('success');
      window.location.href = '/curator/dashboard';
    } catch (e) {
      setLoginError(e.message);
      setLoginStatus('error');
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password || !form.outletName) {
      setError('Please fill in all required fields. / 必須項目を入力してください。');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters. / パスワードは8文字以上にしてください。');
      return;
    }
    setStatus('loading');
    setError('');
    try {
      const res = await fetch('/api/curator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setStatus('success');
    } catch (e) {
      setError(e.message);
      setStatus('error');
    }
  };

  const navItems = [
    { href: '/#how-it-works', label: lang === 'ja' ? '使い方' : 'How It Works' },
    { href: '/curators',       label: lang === 'ja' ? 'キュレーターを探す' : 'Find Curators' },
    { href: '/studio',         label: lang === 'ja' ? 'アーティストの方' : 'For Artists' },
  ];

  const navCtaLabel = lang === 'ja' ? 'キュレーター登録' : 'Join as Curator';

  // Input style (light theme)
  const inp = {
    width: '100%', padding: '12px 16px', borderRadius: 8,
    border: `1px solid ${T.border}`, background: T.white, color: T.text,
    fontSize: 14, outline: 'none', marginTop: 6, boxSizing: 'border-box',
    fontFamily: T.font,
  };
  const lbl = {
    fontSize: 13, color: '#374151', display: 'block', marginTop: 18,
    fontWeight: 500, fontFamily: T.font,
  };
  const sub = { fontSize: 11, color: T.textMuted, marginLeft: 6, fontWeight: 400 };

  // ── ログイン成功画面 ──
  if (loginStatus === 'success' && loggedInCurator) return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ fontSize: 72, marginBottom: 20 }}>👋</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12, color: T.text, fontFamily: T.fontDisplay }}>
          Welcome back, {loggedInCurator.name}!
        </h1>
        <p style={{ color: T.textSub, lineHeight: 1.8, fontSize: 15, fontFamily: T.font }}>
          You are now logged in as a curator.<br />
          <span style={{ color: T.textMuted, fontSize: 13 }}>キュレーターとしてログインしました。</span>
        </p>
        <a href="/" style={{
          display: 'inline-block', marginTop: 28, padding: '13px 32px',
          background: T.accentGrad,
          borderRadius: 24, color: '#fff', textDecoration: 'none', fontWeight: 700,
          fontFamily: T.font,
        }}>← Back to OTONAMI</a>
      </div>
    </div>
  );

  // ── 登録成功画面 ──
  if (status === 'success') return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ fontSize: 72, marginBottom: 20 }}>🎉</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12, color: T.text, fontFamily: T.fontDisplay }}>
          Registration Received!
        </h1>
        <p style={{ color: T.textSub, lineHeight: 1.8, fontSize: 15, fontFamily: T.font }}>
          Thank you for joining OTONAMI as a curator.<br />
          <span style={{ color: T.textMuted, fontSize: 13 }}>
            キュレーターとしてご登録いただきありがとうございます。
          </span><br /><br />
          We'll review your profile and be in touch within 2–3 business days.<br />
          <span style={{ color: T.textMuted, fontSize: 13 }}>
            2〜3営業日以内にご連絡いたします。
          </span>
        </p>
        <a href="/" style={{
          display: 'inline-block', marginTop: 28, padding: '13px 32px',
          background: T.accentGrad,
          borderRadius: 24, color: '#fff', textDecoration: 'none', fontWeight: 700,
          fontFamily: T.font,
        }}>← Back to OTONAMI</a>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: T.font }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: ${T.bg}; overflow-x: hidden; }

        .hamburger-btn { display: none; }
        .mobile-menu-overlay { display: none; }

        @media (max-width: 768px) {
          .nav-links-center { display: none !important; }
          .hamburger-btn {
            display: flex !important;
            align-items: center; justify-content: center;
            background: none; border: 1px solid ${T.border};
            border-radius: 8px; width: 44px; height: 44px;
            font-size: 20px; cursor: pointer; color: ${T.text};
            flex-shrink: 0; touch-action: manipulation;
          }
          .logo-text { font-size: 18px !important; }
          .header-pad { padding: 0 16px !important; }
          .nav-cta-label { display: none; }
          .nav-cta-short { display: inline !important; }
          .lang-btn { padding: 6px 9px !important; font-size: 11px !important; }
          .header-cta { padding: 8px 11px !important; font-size: 12px !important; }
          .mobile-menu-overlay {
            display: flex !important;
            position: fixed; inset: 0; z-index: 200;
            background: #fff;
            flex-direction: column;
          }
          .curator-hero { padding: 56px 18px 48px !important; }
          .curator-hero h1 { font-size: 26px !important; }
          .curator-card { padding: 20px !important; }
          .curator-form-wrap { padding: 0 0 80px !important; }
        }

        .curator-input:focus {
          border-color: ${T.accent} !important;
          box-shadow: 0 0 0 3px rgba(14,165,233,0.12) !important;
          outline: none !important;
        }
        .curator-input:hover { border-color: #94a3b8 !important; }

        .curator-tab-btn { transition: all 0.2s; }
        .curator-tab-btn:hover { color: ${T.accent} !important; }

        .genre-tag { transition: all 0.15s; }
        .genre-tag:hover { border-color: ${T.accent} !important; background: ${T.accentLight} !important; color: ${T.accent} !important; }
      `}</style>

      {/* ── Mobile Menu Overlay ── */}
      {menuOpen && (
        <div className="mobile-menu-overlay" ref={menuRef}>
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
            }}>{navCtaLabel}</a>
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
            <span className="nav-cta-label">{navCtaLabel}</span>
            <span className="nav-cta-short" style={{ display: 'none' }}>登録</span>
          </a>
          <button className="hamburger-btn" onClick={() => setMenuOpen(true)} aria-label="メニューを開く">☰</button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="curator-hero" style={{
        textAlign: 'center', padding: '72px 24px 60px',
        background: 'linear-gradient(180deg, rgba(14,165,233,0.06) 0%, rgba(248,250,252,0) 100%)',
        borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '5px 16px', background: T.accentLight,
            borderRadius: 24, fontSize: 12, fontWeight: 600, color: T.accent,
            border: `1px solid ${T.accentBorder}`, marginBottom: 24,
          }}>♪ Curator Network</div>
          <h1 style={{
            fontFamily: T.fontDisplay, fontSize: 36, fontWeight: 700,
            color: T.text, lineHeight: 1.2, marginBottom: 16,
          }}>
            Curator Portal<br />
            <span style={{ fontSize: 22, fontWeight: 500, color: T.textSub, fontFamily: T.font }}>キュレーターポータル</span>
          </h1>
          <p style={{ fontSize: 15, color: T.textSub, lineHeight: 1.75, maxWidth: 480, margin: '0 auto', fontFamily: T.font }}>
            Sign in to manage your pitches or join our network.<br />
            <span style={{ fontSize: 13, color: T.textMuted }}>日本のアーティストの音楽を世界に届けるお手伝いをしてください。</span>
          </p>
        </div>
      </section>

      {/* ── Form area ── */}
      <div className="curator-form-wrap" style={{ padding: '48px 16px 96px' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>

          {/* Tab switcher */}
          <div style={{ display: 'flex', marginBottom: 32, borderBottom: `2px solid ${T.border}` }}>
            {[
              { key: 'login', en: 'Login', ja: 'ログイン' },
              { key: 'register', en: 'Join as Curator', ja: '新規登録' },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} className="curator-tab-btn" style={{
                flex: 1, padding: '12px 8px', border: 'none', background: 'transparent',
                cursor: 'pointer', fontWeight: tab === t.key ? 700 : 500, fontSize: 14,
                color: tab === t.key ? T.accent : T.textSub,
                borderBottom: tab === t.key ? `2px solid ${T.accent}` : '2px solid transparent',
                marginBottom: -2, fontFamily: T.font,
              }}>
                {t.en} <span style={{ fontSize: 11, fontWeight: 400, color: tab === t.key ? T.accent : T.textMuted }}>/ {t.ja}</span>
              </button>
            ))}
          </div>

          {/* ── LOGIN TAB ── */}
          {tab === 'login' && (
            <div className="curator-card" style={{
              background: T.white, borderRadius: T.radiusLg, padding: 32,
              border: `1px solid ${T.border}`, boxShadow: T.shadow,
            }}>
              <p style={{ color: T.textSub, fontSize: 13, marginTop: 0, marginBottom: 24, lineHeight: 1.6, fontFamily: T.font }}>
                Already registered? Log in to your curator account.<br />
                <span style={{ color: T.textMuted, fontSize: 12 }}>登録済みのキュレーターの方はこちら</span>
              </p>

              <label style={lbl}>
                Email Address <span style={sub}>メールアドレス</span>
              </label>
              <input
                className="curator-input"
                style={inp} type="text" value={loginForm.email}
                placeholder="your@email.com"
                onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
              />

              <label style={lbl}>
                Password <span style={sub}>パスワード</span>
              </label>
              <input
                className="curator-input"
                style={inp} type="password" value={loginForm.password}
                placeholder="Your password"
                onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />

              {loginStatus === 'password_not_set' && (
                <div style={{ marginTop: 16, padding: '14px 18px', background: T.accentLight, border: `1px solid ${T.accentBorder}`, borderRadius: 10 }}>
                  <p style={{ color: T.accent, fontSize: 13, margin: '0 0 6px', fontWeight: 700, fontFamily: T.font }}>
                    Password not set / パスワード未設定
                  </p>
                  <p style={{ color: T.textSub, fontSize: 12, margin: '0 0 12px', lineHeight: 1.6, fontFamily: T.font }}>
                    Your account exists but no password has been set yet.<br />
                    <span style={{ color: T.textMuted }}>アカウントは存在しますがパスワードが設定されていません。</span>
                  </p>
                  <a href="/curator/set-password" style={{
                    display: 'inline-block', padding: '8px 18px',
                    background: T.accent,
                    borderRadius: 8, color: '#fff', textDecoration: 'none',
                    fontSize: 13, fontWeight: 700, fontFamily: T.font,
                  }}>Set your password → / パスワードを設定する</a>
                </div>
              )}

              {loginError && (
                <p style={{ color: '#ef4444', fontSize: 13, marginTop: 14, fontFamily: T.font }}>{loginError}</p>
              )}

              <button onClick={handleLogin} disabled={loginStatus === 'loading'} style={{
                width: '100%', marginTop: 28, padding: '14px',
                height: 48,
                background: loginStatus === 'loading' ? T.border : T.accent,
                border: 'none', borderRadius: 10, color: '#fff',
                fontSize: 15, fontWeight: 700, cursor: loginStatus === 'loading' ? 'not-allowed' : 'pointer',
                fontFamily: T.font, transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (loginStatus !== 'loading') e.currentTarget.style.background = T.accentDark; }}
              onMouseLeave={e => { if (loginStatus !== 'loading') e.currentTarget.style.background = T.accent; }}
              >
                {loginStatus === 'loading' ? 'Logging in... / ログイン中...' : 'Login / ログイン →'}
              </button>

              <p style={{ textAlign: 'center', color: T.textMuted, fontSize: 12, marginTop: 18, fontFamily: T.font }}>
                Not registered yet?{' '}
                <button onClick={() => setTab('register')} style={{
                  background: 'none', border: 'none', color: T.accent,
                  cursor: 'pointer', fontSize: 12, textDecoration: 'underline', fontFamily: T.font,
                }}>Join as a Curator / 新規登録</button>
              </p>
              <p style={{ textAlign: 'center', fontSize: 12, marginTop: 8 }}>
                <a href="/curator/set-password" style={{ color: T.textMuted, textDecoration: 'none', fontFamily: T.font }}>
                  Forgot password? / パスワードを忘れた方
                </a>
              </p>
            </div>
          )}

          {/* ── REGISTER TAB ── */}
          {tab === 'register' && (
            <>
              <p style={{ color: T.textSub, fontSize: 13, textAlign: 'center', marginBottom: 20, lineHeight: 1.6, fontFamily: T.font }}>
                Discover emerging Japanese indie artists and receive curated pitches.<br />
                <span style={{ color: T.textMuted, fontSize: 12 }}>
                  日本のインディーアーティストから厳選されたピッチを受け取れます。
                </span>
              </p>

              {/* Payout notice */}
              <div style={{
                background: T.accentLight, border: `1px solid ${T.accentBorder}`,
                borderRadius: 12, padding: '14px 18px', marginBottom: 24,
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                <span style={{ fontSize: 20 }}>💰</span>
                <div>
                  <p style={{ color: T.accent, fontWeight: 700, margin: 0, fontSize: 14, fontFamily: T.font }}>
                    Curator Payout Policy
                  </p>
                  <p style={{ color: T.textSub, fontSize: 12, margin: '4px 0 0', lineHeight: 1.6, fontFamily: T.font }}>
                    Minimum payout: <strong style={{ color: T.text }}>¥5,000 / $50 USD</strong> via PayPal.<br />
                    <span style={{ color: T.textMuted }}>最低支払い額：PayPal経由で5,000円 / 50ドル以上</span>
                  </p>
                </div>
              </div>

              <div className="curator-card" style={{
                background: T.white, borderRadius: T.radiusLg, padding: 32,
                border: `1px solid ${T.border}`, boxShadow: T.shadow,
              }}>

                <label style={lbl}>Your Name * <span style={sub}>お名前</span></label>
                <input className="curator-input" style={inp} value={form.name} placeholder="e.g. Taro Yamada"
                       onChange={e => set('name', e.target.value)} />

                <label style={lbl}>Email Address * <span style={sub}>メールアドレス</span></label>
                <input className="curator-input" style={inp} type="text" value={form.email}
                       placeholder="your@email.com"
                       onChange={e => set('email', e.target.value)} />

                <label style={lbl}>Password * <span style={sub}>パスワード（8文字以上）</span></label>
                <input className="curator-input" style={inp} type="password" value={form.password}
                       placeholder="Minimum 8 characters"
                       onChange={e => set('password', e.target.value)} />

                <label style={lbl}>Outlet / Playlist Name * <span style={sub}>媒体名・プレイリスト名</span></label>
                <input className="curator-input" style={inp} value={form.outletName}
                       placeholder="e.g. Tokyo Sound Journal"
                       onChange={e => set('outletName', e.target.value)} />

                <label style={lbl}>Type <span style={sub}>種別</span></label>
                <select className="curator-input" style={inp} value={form.type}
                        onChange={e => set('type', e.target.value)}>
                  {TYPE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.en} / {o.ja}</option>
                  ))}
                </select>

                <label style={lbl}>Website / Playlist URL <span style={sub}>ウェブサイト・URL</span></label>
                <input className="curator-input" style={inp} type="text" value={form.url}
                       placeholder="https://your-site.com"
                       onChange={e => set('url', e.target.value)} />

                <label style={lbl}>Followers / Subscribers <span style={sub}>フォロワー・読者数</span></label>
                <input className="curator-input" style={inp} type="number" value={form.followers}
                       placeholder="e.g. 5000"
                       onChange={e => set('followers', e.target.value)} />

                <label style={lbl}>Primary Region <span style={sub}>主な活動地域</span></label>
                <select className="curator-input" style={inp} value={form.region}
                        onChange={e => set('region', e.target.value)}>
                  {REGION_OPTIONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>

                <label style={lbl}>Genres You Cover <span style={sub}>カバーするジャンル</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>
                  {GENRE_OPTIONS.map(g => (
                    <button key={g} onClick={() => toggleGenre(g)} className="genre-tag" style={{
                      padding: '5px 11px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                      border: '1px solid',
                      borderColor: form.genres.includes(g) ? T.accent : T.border,
                      background: form.genres.includes(g) ? T.accentLight : T.white,
                      color: form.genres.includes(g) ? T.accent : T.textSub,
                      fontFamily: T.font,
                    }}>{g}</button>
                  ))}
                </div>

                <label style={lbl}>Brief Bio <span style={sub}>自己紹介</span></label>
                <textarea className="curator-input" style={{ ...inp, height: 100, resize: 'vertical' }}
                          value={form.bio}
                          placeholder="Tell artists what you cover and what you're looking for... / どんな音楽を探しているか教えてください"
                          onChange={e => set('bio', e.target.value)} />

                <div style={{
                  background: T.bg, border: `1px solid ${T.border}`,
                  borderRadius: 10, padding: '16px', marginTop: 20,
                }}>
                  <label style={{ ...lbl, marginTop: 0, color: T.accent }}>
                    💰 PayPal Email <span style={sub}>支払い受取用PayPalメール</span>
                  </label>
                  <input className="curator-input" style={{ ...inp, marginTop: 8 }} type="text"
                         value={form.paypalEmail}
                         placeholder="paypal@email.com"
                         onChange={e => set('paypalEmail', e.target.value)} />
                  <p style={{ color: T.textMuted, fontSize: 11, marginTop: 8, lineHeight: 1.6, fontFamily: T.font }}>
                    Payouts processed via PayPal when balance reaches ¥5,000 / $50 USD.<br />
                    残高が5,000円/$50に達した時点でPayPal経由でお支払いします。
                  </p>
                </div>

                {error && (
                  <p style={{ color: '#ef4444', fontSize: 13, marginTop: 14, fontFamily: T.font }}>{error}</p>
                )}

                <button onClick={handleSubmit} disabled={status === 'loading'} style={{
                  width: '100%', marginTop: 28, padding: '14px',
                  height: 48,
                  background: status === 'loading' ? T.border : T.accent,
                  border: 'none', borderRadius: 10, color: '#fff',
                  fontSize: 15, fontWeight: 700, cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                  fontFamily: T.font, transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (status !== 'loading') e.currentTarget.style.background = T.accentDark; }}
                onMouseLeave={e => { if (status !== 'loading') e.currentTarget.style.background = T.accent; }}
                >
                  {status === 'loading' ? 'Submitting... / 送信中...' : 'Join as Curator / キュレーターとして参加 →'}
                </button>
              </div>

              <p style={{ textAlign: 'center', color: T.textMuted, fontSize: 11, marginTop: 20, lineHeight: 1.7, fontFamily: T.font }}>
                By submitting, you agree to receive pitch emails from Japanese indie artists via OTONAMI.<br />
                送信することで、OTONAMIを通じて日本のインディーアーティストからのピッチメール受信に同意します。
              </p>
            </>
          )}

        </div>
      </div>

      {/* ── Footer ── */}
      <footer style={{
        padding: '32px 24px', background: T.white, borderTop: `1px solid ${T.border}`,
        textAlign: 'center', fontFamily: T.font, fontSize: 13, color: T.textMuted,
      }}>
        <div>
          <span>OTONAMI — Connecting Japanese Music to the World</span>
          <span style={{ margin: '0 8px' }}>·</span>
          <span>TYCompany LLC / ILCJ</span>
        </div>
      </footer>
    </div>
  );
}
