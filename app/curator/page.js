"use client";
import { useState, useEffect, useRef } from 'react';
import { T } from '@/lib/design-tokens';
import { supabase } from '@/lib/supabase';

const TYPE_OPTIONS = [
  { value: 'playlist', en: 'Playlist Curator',  ja: 'プレイリスト' },
  { value: 'blog',     en: 'Blog',              ja: 'ブログ' },
  { value: 'media',    en: 'Media Outlet',      ja: 'メディア' },
  { value: 'radio',    en: 'Radio / Podcast',   ja: 'ラジオ・ポッドキャスト' },
  { value: 'label',    en: 'Record Label',      ja: 'レコードレーベル' },
  { value: 'other',    en: 'Other',             ja: 'その他' },
];

const REGION_OPTIONS = [
  'Japan', 'United States', 'United Kingdom', 'Germany', 'France',
  'Australia', 'Canada', 'South Korea', 'Brazil', 'Mexico',
  'Spain', 'Italy', 'Netherlands', 'Sweden', 'Norway',
  'Denmark', 'Finland', 'Portugal', 'Poland', 'India',
  'Singapore', 'Thailand', 'Indonesia', 'Philippines',
  'South Africa', 'Nigeria', 'Argentina', 'Colombia', 'Global', 'Other',
];

const GENRE_OPTIONS = [
  'Jazz', 'Rock', 'Pop', 'Hip-hop', 'R&B', 'Electronic', 'Folk',
  'Classical', 'Indie', 'Alternative', 'Latin', 'Ambient', 'Experimental',
  'Instrumental', 'Dance music', 'Jazz fusion', 'Film music', 'Lo-fi',
  'Rap', 'Trap', 'Disco', 'Funk', 'Soul', 'World music', 'J-Pop', 'J-Rock',
];

const MOOD_OPTIONS = [
  'Authentic', 'Eclectic', 'Creative', 'Danceable', 'Downbeat',
  'Engaged', 'Energetic', 'Melancholic', 'Uplifting', 'Chill',
  'Dramatic', 'Groovy', 'Atmospheric', 'Experimental',
];

const OPPORTUNITY_OPTIONS = [
  { value: 'playlist',   en: 'Add to my playlist(s)',               ja: 'プレイリストに追加' },
  { value: 'blog',       en: 'Write a blog post / review',          ja: 'ブログ記事・レビューを書く' },
  { value: 'social',     en: 'Feature on social media',             ja: 'SNSで紹介' },
  { value: 'radio',      en: 'Radio play',                          ja: 'ラジオで放送' },
  { value: 'reel',       en: 'Create post or reel on social media', ja: 'SNS投稿・リールを作成' },
  { value: 'interview',  en: 'Interview',                           ja: 'インタビュー' },
];

export default function CuratorRegistrationPage() {
  const [tab, setTab] = useState('login');
  const [registerStep, setRegisterStep] = useState(1);
  const [lang, setLang] = useState('ja');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const avatarInputRef = useRef(null);

  // Login state
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginStatus, setLoginStatus] = useState(null);
  const [loginError, setLoginError] = useState('');
  const [loggedInCurator, setLoggedInCurator] = useState(null);

  // Register state
  const [form, setForm] = useState({
    // Step 1
    name: '', email: '', password: '', type: 'playlist',
    outletName: '', url: '', region: 'Global',
    // Step 2
    bio: '', followers: '', paypalEmail: '',
    genres: [], accepts: [], moods: [], opportunities: [],
    similarArtists: '', playlistUrl: '',
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarDragOver, setAvatarDragOver] = useState(false);
  const [step1Error, setStep1Error] = useState('');
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

  const toggleArray = (key, val, max) => {
    setForm(f => {
      const arr = f[key] || [];
      if (arr.includes(val)) return { ...f, [key]: arr.filter(x => x !== val) };
      if (max != null && arr.length >= max) return f;
      return { ...f, [key]: [...arr, val] };
    });
  };

  const applyAvatarFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file. / 画像ファイルを選択してください。');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be under 2MB. / ファイルサイズは2MB以下にしてください。');
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleAvatarChange = (e) => applyAvatarFile(e.target.files?.[0]);

  const handleAvatarDrop = (e) => {
    e.preventDefault();
    setAvatarDragOver(false);
    applyAvatarFile(e.dataTransfer.files?.[0]);
  };

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

  const goToStep2 = () => {
    setStep1Error('');
    if (!form.name.trim()) { setStep1Error('Name is required. / 名前は必須です。'); return; }
    if (!form.email.trim()) { setStep1Error('Email is required. / メールアドレスは必須です。'); return; }
    if (form.password.length < 8) { setStep1Error('Password must be at least 8 characters. / パスワードは8文字以上にしてください。'); return; }
    if (!form.outletName.trim()) { setStep1Error('Platform name is required. / プラットフォーム名は必須です。'); return; }
    setRegisterStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    setStatus('loading');
    setError('');

    // Upload avatar if selected
    let iconUrl = '';
    if (avatarFile) {
      setAvatarUploading(true);
      try {
        const ext = avatarFile.name.split('.').pop().toLowerCase();
        const slug = form.email.replace(/[^a-z0-9]/gi, '-').toLowerCase();
        const fileName = `curator-${slug}-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { contentType: avatarFile.type, upsert: true });
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
          iconUrl = publicUrl;
        }
      } catch { /* skip image on error */ } finally {
        setAvatarUploading(false);
      }
    }

    try {
      const similarArtistsArr = form.similarArtists
        .split(',').map(s => s.trim()).filter(Boolean).slice(0, 5);

      const res = await fetch('/api/curator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, iconUrl, similarArtists: similarArtistsArr }),
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

  const inp = {
    width: '100%', padding: '12px 16px', borderRadius: 8,
    border: `1px solid ${T.border}`, background: T.white, color: T.text,
    fontSize: 14, outline: 'none', marginTop: 6, boxSizing: 'border-box',
    fontFamily: T.font,
  };
  const lbl = { fontSize: 13, color: '#374151', display: 'block', marginTop: 18, fontWeight: 500, fontFamily: T.font };
  const sub = { fontSize: 11, color: T.textMuted, marginLeft: 6, fontWeight: 400 };

  // ── ログイン成功画面 ──
  if (loginStatus === 'success' && loggedInCurator) return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ fontSize: 72, marginBottom: 20 }}>👋</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12, color: T.text, fontFamily: T.fontDisplay }}>
          Welcome back, {loggedInCurator.name}!
        </h1>
        <p style={{ color: T.textSub, lineHeight: 1.8, fontSize: 15, fontFamily: T.font }}>
          You are now logged in as a curator.<br />
          <span style={{ color: T.textMuted, fontSize: 13 }}>キュレーターとしてログインしました。</span>
        </p>
        <a href="/" style={{ display: 'inline-block', marginTop: 28, padding: '13px 32px', background: T.accentGrad, borderRadius: 24, color: '#fff', textDecoration: 'none', fontWeight: 700, fontFamily: T.font }}>← Back to OTONAMI</a>
      </div>
    </div>
  );

  // ── 登録成功画面 ──
  if (status === 'success') return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ fontSize: 72, marginBottom: 20 }}>🎉</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12, color: T.text, fontFamily: T.fontDisplay }}>
          Registration Received!
        </h1>
        <p style={{ color: T.textSub, lineHeight: 1.8, fontSize: 15, fontFamily: T.font }}>
          Thank you for joining OTONAMI as a curator.<br />
          <span style={{ color: T.textMuted, fontSize: 13 }}>キュレーターとしてご登録いただきありがとうございます。</span><br /><br />
          We'll review your profile and be in touch within 2–3 business days.<br />
          <span style={{ color: T.textMuted, fontSize: 13 }}>2〜3営業日以内にご連絡いたします。</span>
        </p>
        <a href="/" style={{ display: 'inline-block', marginTop: 28, padding: '13px 32px', background: T.accentGrad, borderRadius: 24, color: '#fff', textDecoration: 'none', fontWeight: 700, fontFamily: T.font }}>← Back to OTONAMI</a>
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
            display: flex !important; align-items: center; justify-content: center;
            background: none; border: 1px solid ${T.border}; border-radius: 8px;
            width: 44px; height: 44px; font-size: 20px; cursor: pointer; color: ${T.text};
            flex-shrink: 0; touch-action: manipulation;
          }
          .logo-text { font-size: 18px !important; }
          .header-pad { padding: 0 16px !important; }
          .nav-cta-label { display: none; }
          .nav-cta-short { display: inline !important; }
          .lang-btn { padding: 6px 9px !important; font-size: 11px !important; }
          .header-cta { padding: 8px 11px !important; font-size: 12px !important; }
          .mobile-menu-overlay {
            display: flex !important; position: fixed; inset: 0; z-index: 200;
            background: #fff; flex-direction: column;
          }
          .curator-hero { padding: 56px 18px 48px !important; }
          .curator-form-wrap { padding: 0 0 80px !important; }
        }
        .curator-input:focus { border-color: ${T.accent} !important; box-shadow: 0 0 0 3px rgba(14,165,233,0.12) !important; }
        .curator-input:hover { border-color: #94a3b8 !important; }
        .pill-tag { transition: all 0.15s; }
        .pill-tag:hover { border-color: ${T.accent} !important; background: ${T.accentLight} !important; color: ${T.accent} !important; }
        .curator-tab-btn { transition: all 0.2s; }
        .curator-tab-btn:hover { color: ${T.accent} !important; }
      `}</style>

      {/* ── Mobile Menu Overlay ── */}
      {menuOpen && (
        <div className="mobile-menu-overlay" ref={menuRef}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 64, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
            <a href="/" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: T.accentGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16 }}>O</div>
              <span style={{ fontFamily: T.fontDisplay, fontSize: 18, fontWeight: 700, color: T.accent }}>OTONAMI</span>
            </a>
            <button onClick={() => setMenuOpen(false)} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 8, width: 40, height: 40, fontSize: 20, cursor: 'pointer', color: T.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 0' }}>
            {navItems.map(item => (
              <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)} style={{ display: 'block', padding: '16px 24px', fontSize: 16, fontWeight: 600, color: T.text, textDecoration: 'none', borderBottom: `1px solid ${T.borderLight}`, fontFamily: T.font }}>{item.label}</a>
            ))}
            <a href="/curator" onClick={() => setMenuOpen(false)} style={{ display: 'block', margin: '20px 24px 0', padding: '14px 20px', fontSize: 15, fontWeight: 600, background: T.accent, color: '#fff', borderRadius: T.radius, textDecoration: 'none', fontFamily: T.font, textAlign: 'center' }}>{navCtaLabel}</a>
          </nav>
        </div>
      )}

      {/* ── Header ── */}
      <header className="header-pad" style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${T.border}`, padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: T.font }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: T.accentGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 17 }}>O</div>
            <span className="logo-text" style={{ fontFamily: T.fontDisplay, fontSize: 22, fontWeight: 700, color: T.accent, letterSpacing: -0.3 }}>OTONAMI</span>
          </a>
          <nav className="nav-links-center" style={{ display: 'flex', gap: 4 }}>
            {navItems.map(item => (
              <a key={item.href} href={item.href} style={{ background: 'transparent', color: T.textSub, padding: '8px 14px', borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'all 0.15s', fontFamily: T.font }}
              onMouseEnter={e => { e.currentTarget.style.background = T.accentLight; e.currentTarget.style.color = T.accent; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textSub; }}
              >{item.label}</a>
            ))}
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: `1px solid ${T.border}` }}>
            {['EN', 'JP'].map(l => (
              <button key={l} className="lang-btn" onClick={() => switchLang(l === 'JP' ? 'ja' : 'en')} style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, fontFamily: T.font, border: 'none', cursor: 'pointer', transition: 'all 0.15s', background: (l === 'JP' ? lang === 'ja' : lang === 'en') ? T.text : 'transparent', color: (l === 'JP' ? lang === 'ja' : lang === 'en') ? '#fff' : T.textSub }}>{l === 'JP' ? '日本語' : l}</button>
            ))}
          </div>
          <a href="/curator" className="header-cta" style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, background: T.accent, color: '#fff', borderRadius: T.radius, textDecoration: 'none', fontFamily: T.font, transition: 'background 0.15s', whiteSpace: 'nowrap' }}
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
      <section className="curator-hero" style={{ textAlign: 'center', padding: '72px 24px 60px', background: 'linear-gradient(180deg, rgba(14,165,233,0.06) 0%, rgba(248,250,252,0) 100%)', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 16px', background: T.accentLight, borderRadius: 24, fontSize: 12, fontWeight: 600, color: T.accent, border: `1px solid ${T.accentBorder}`, marginBottom: 24 }}>♪ Curator Network</div>
          <h1 style={{ fontFamily: T.fontDisplay, fontSize: 36, fontWeight: 700, color: T.text, lineHeight: 1.2, marginBottom: 16 }}>
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
        <div style={{ maxWidth: 580, margin: '0 auto' }}>

          {/* Tab switcher */}
          <div style={{ display: 'flex', marginBottom: 32, borderBottom: `2px solid ${T.border}` }}>
            {[
              { key: 'login', en: 'Login', ja: 'ログイン' },
              { key: 'register', en: 'Join as Curator', ja: '新規登録' },
            ].map(t => (
              <button key={t.key} onClick={() => { setTab(t.key); if (t.key === 'register') setRegisterStep(1); }} className="curator-tab-btn" style={{ flex: 1, padding: '12px 8px', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: tab === t.key ? 700 : 500, fontSize: 14, color: tab === t.key ? T.accent : T.textSub, borderBottom: tab === t.key ? `2px solid ${T.accent}` : '2px solid transparent', marginBottom: -2, fontFamily: T.font }}>
                {t.en} <span style={{ fontSize: 11, fontWeight: 400, color: tab === t.key ? T.accent : T.textMuted }}>/ {t.ja}</span>
              </button>
            ))}
          </div>

          {/* ── LOGIN TAB ── */}
          {tab === 'login' && (
            <div style={{ background: T.white, borderRadius: T.radiusLg, padding: 32, border: `1px solid ${T.border}`, boxShadow: T.shadow }}>
              <p style={{ color: T.textSub, fontSize: 13, marginTop: 0, marginBottom: 24, lineHeight: 1.6, fontFamily: T.font }}>
                Already registered? Log in to your curator account.<br />
                <span style={{ color: T.textMuted, fontSize: 12 }}>登録済みのキュレーターの方はこちら</span>
              </p>
              <label style={lbl}>Email Address <span style={sub}>メールアドレス</span></label>
              <input className="curator-input" style={inp} type="text" value={loginForm.email} placeholder="your@email.com" onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))} />
              <label style={lbl}>Password <span style={sub}>パスワード</span></label>
              <input className="curator-input" style={inp} type="password" value={loginForm.password} placeholder="Your password" onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleLogin()} />

              {loginStatus === 'password_not_set' && (
                <div style={{ marginTop: 16, padding: '14px 18px', background: T.accentLight, border: `1px solid ${T.accentBorder}`, borderRadius: 10 }}>
                  <p style={{ color: T.accent, fontSize: 13, margin: '0 0 6px', fontWeight: 700, fontFamily: T.font }}>Password not set / パスワード未設定</p>
                  <p style={{ color: T.textSub, fontSize: 12, margin: '0 0 12px', lineHeight: 1.6, fontFamily: T.font }}>
                    Your account exists but no password has been set yet.<br />
                    <span style={{ color: T.textMuted }}>アカウントは存在しますがパスワードが設定されていません。</span>
                  </p>
                  <a href="/curator/set-password" style={{ display: 'inline-block', padding: '8px 18px', background: T.accent, borderRadius: 8, color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700, fontFamily: T.font }}>Set your password → / パスワードを設定する</a>
                </div>
              )}
              {loginError && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 14, fontFamily: T.font }}>{loginError}</p>}

              <button onClick={handleLogin} disabled={loginStatus === 'loading'} style={{ width: '100%', marginTop: 28, padding: '14px', height: 48, background: loginStatus === 'loading' ? T.border : T.accent, border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 700, cursor: loginStatus === 'loading' ? 'not-allowed' : 'pointer', fontFamily: T.font, transition: 'background 0.15s' }}
              onMouseEnter={e => { if (loginStatus !== 'loading') e.currentTarget.style.background = T.accentDark; }}
              onMouseLeave={e => { if (loginStatus !== 'loading') e.currentTarget.style.background = T.accent; }}
              >
                {loginStatus === 'loading' ? 'Logging in... / ログイン中...' : 'Login / ログイン →'}
              </button>
              <p style={{ textAlign: 'center', color: T.textMuted, fontSize: 12, marginTop: 18, fontFamily: T.font }}>
                Not registered yet?{' '}
                <button onClick={() => { setTab('register'); setRegisterStep(1); }} style={{ background: 'none', border: 'none', color: T.accent, cursor: 'pointer', fontSize: 12, textDecoration: 'underline', fontFamily: T.font }}>Join as a Curator / 新規登録</button>
              </p>
              <p style={{ textAlign: 'center', fontSize: 12, marginTop: 8 }}>
                <a href="/curator/set-password" style={{ color: T.textMuted, textDecoration: 'none', fontFamily: T.font }}>Forgot password? / パスワードを忘れた方</a>
              </p>
            </div>
          )}

          {/* ── REGISTER TAB ── */}
          {tab === 'register' && (
            <>
              {/* Progress bar */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 8 }}>
                  {[1, 2].map((s, i) => (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < 1 ? 'none' : 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, fontFamily: T.font, background: registerStep >= s ? T.accent : T.border, color: registerStep >= s ? '#fff' : T.textSub, flexShrink: 0 }}>{s}</div>
                        <span style={{ fontSize: 12, fontWeight: registerStep === s ? 700 : 400, color: registerStep >= s ? T.accent : T.textMuted, fontFamily: T.font, whiteSpace: 'nowrap' }}>
                          {s === 1 ? 'Basic Info / 基本情報' : 'Profile / プロフィール'}
                        </span>
                      </div>
                      {i < 1 && <div style={{ flex: 1, height: 2, background: registerStep > 1 ? T.accent : T.border, margin: '0 10px' }}/>}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── STEP 1: Basic Info ── */}
              {registerStep === 1 && (
                <div style={{ background: T.white, borderRadius: T.radiusLg, padding: 32, border: `1px solid ${T.border}`, boxShadow: T.shadow }}>
                  <p style={{ color: T.textSub, fontSize: 13, marginTop: 0, marginBottom: 24, lineHeight: 1.6, fontFamily: T.font }}>
                    Discover emerging Japanese indie artists and receive curated pitches.<br />
                    <span style={{ color: T.textMuted, fontSize: 12 }}>日本のインディーアーティストから厳選されたピッチを受け取れます。</span>
                  </p>

                  <label style={lbl}>Your Name * <span style={sub}>お名前</span></label>
                  <input className="curator-input" style={inp} value={form.name} placeholder="e.g. Taro Yamada" onChange={e => set('name', e.target.value)} />

                  <label style={lbl}>Email Address * <span style={sub}>メールアドレス</span></label>
                  <input className="curator-input" style={inp} type="email" value={form.email} placeholder="your@email.com" onChange={e => set('email', e.target.value)} />

                  <label style={lbl}>Password * <span style={sub}>パスワード（8文字以上）</span></label>
                  <input className="curator-input" style={inp} type="password" value={form.password} placeholder="Minimum 8 characters" onChange={e => set('password', e.target.value)} />

                  <label style={lbl}>Curator Type * <span style={sub}>タイプ</span></label>
                  <select className="curator-input" style={inp} value={form.type} onChange={e => set('type', e.target.value)}>
                    {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.en} / {o.ja}</option>)}
                  </select>

                  <label style={lbl}>Platform Name * <span style={sub}>プラットフォーム名・媒体名</span></label>
                  <input className="curator-input" style={inp} value={form.outletName} placeholder="e.g. Tokyo Sound Journal, My Indie Playlist" onChange={e => set('outletName', e.target.value)} />

                  <label style={lbl}>Platform URL <span style={sub}>ウェブサイト・URL（任意）</span></label>
                  <input className="curator-input" style={inp} type="url" value={form.url} placeholder="https://your-site.com" onChange={e => set('url', e.target.value)} />

                  <label style={lbl}>Country / Region <span style={sub}>国・地域</span></label>
                  <select className="curator-input" style={inp} value={form.region} onChange={e => set('region', e.target.value)}>
                    {REGION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>

                  {step1Error && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 16, fontFamily: T.font }}>{step1Error}</p>}

                  <button onClick={goToStep2} style={{ width: '100%', marginTop: 28, padding: '14px', height: 48, background: T.accent, border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: T.font, transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = T.accentDark}
                  onMouseLeave={e => e.currentTarget.style.background = T.accent}
                  >
                    Next → / 次へ
                  </button>
                </div>
              )}

              {/* ── STEP 2: Detailed Profile ── */}
              {registerStep === 2 && (
                <>
                  {/* Payout notice */}
                  <div style={{ background: T.accentLight, border: `1px solid ${T.accentBorder}`, borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{ fontSize: 20 }}>💰</span>
                    <div>
                      <p style={{ color: T.accent, fontWeight: 700, margin: 0, fontSize: 14, fontFamily: T.font }}>Curator Payout Policy</p>
                      <p style={{ color: T.textSub, fontSize: 12, margin: '4px 0 0', lineHeight: 1.6, fontFamily: T.font }}>
                        Minimum payout: <strong style={{ color: T.text }}>¥5,000 / $50 USD</strong> via PayPal.<br />
                        <span style={{ color: T.textMuted }}>最低支払い額：PayPal経由で5,000円 / 50ドル以上</span>
                      </p>
                    </div>
                  </div>

                  <div style={{ background: T.white, borderRadius: T.radiusLg, padding: 32, border: `1px solid ${T.border}`, boxShadow: T.shadow }}>

                    {/* ── Profile Image ── */}
                    <div style={{ marginBottom: 4 }}>
                      <div style={{ fontSize: 13, color: '#374151', fontWeight: 600, marginBottom: 14, fontFamily: T.font }}>
                        Profile Photo <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 400, marginLeft: 4 }}>プロフィール写真（任意）</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <div
                          onClick={() => !avatarUploading && avatarInputRef.current?.click()}
                          onDragOver={e => { e.preventDefault(); setAvatarDragOver(true); }}
                          onDragLeave={() => setAvatarDragOver(false)}
                          onDrop={handleAvatarDrop}
                          style={{
                            width: 96, height: 96, borderRadius: '50%',
                            border: `2px dashed ${avatarDragOver ? T.accentDark : avatarPreview ? T.accent : '#d1d5db'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: avatarUploading ? 'default' : 'pointer',
                            overflow: 'hidden', background: avatarDragOver ? T.accentLight : T.bg,
                            flexShrink: 0, transition: 'all 0.15s',
                          }}
                        >
                          {avatarUploading
                            ? <div style={{ textAlign: 'center', color: T.accent }}>
                                <div style={{ fontSize: 18 }}>⏳</div>
                                <div style={{ fontSize: 9, marginTop: 3, fontFamily: T.font }}>Uploading...</div>
                              </div>
                            : avatarPreview
                              ? <img src={avatarPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <div style={{ textAlign: 'center', color: avatarDragOver ? T.accent : T.textMuted }}>
                                  <div style={{ fontSize: 24 }}>📷</div>
                                  <div style={{ fontSize: 10, marginTop: 3, fontFamily: T.font }}>
                                    {avatarDragOver ? 'Drop!' : 'Upload'}
                                  </div>
                                </div>
                          }
                        </div>
                        <div>
                          <button onClick={() => avatarInputRef.current?.click()} disabled={avatarUploading} style={{ padding: '8px 16px', border: `1px solid ${T.border}`, borderRadius: 8, background: T.white, color: T.textSub, fontSize: 13, cursor: avatarUploading ? 'not-allowed' : 'pointer', fontFamily: T.font }}>
                            {avatarPreview ? 'Change Photo / 変更' : '📷 Upload Photo / 写真を追加'}
                          </button>
                          {avatarPreview && !avatarUploading && (
                            <button onClick={() => { setAvatarFile(null); setAvatarPreview(null); }} style={{ marginLeft: 8, padding: '8px 12px', border: 'none', background: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer', fontFamily: T.font }}>Remove</button>
                          )}
                          <p style={{ color: T.textMuted, fontSize: 11, marginTop: 6, fontFamily: T.font }}>
                            JPG, PNG, WebP — max 2MB<br />
                            <span style={{ color: T.textMuted }}>ドラッグ&ドロップも可</span>
                          </p>
                        </div>
                        <input ref={avatarInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" onChange={handleAvatarChange} style={{ display: 'none' }} />
                      </div>
                    </div>

                    {/* Bio */}
                    <label style={lbl}>Bio / 自己紹介 <span style={sub}>最大500文字</span></label>
                    <textarea className="curator-input" value={form.bio} onChange={e => { if (e.target.value.length <= 500) set('bio', e.target.value); }} placeholder="Tell artists about your platform and what you're looking for..." rows={4} style={{ ...inp, height: 110, resize: 'vertical' }} />
                    {form.bio.length > 400 && <p style={{ color: form.bio.length > 480 ? '#ef4444' : T.textMuted, fontSize: 11, marginTop: 4, fontFamily: T.font }}>{form.bio.length}/500</p>}

                    {/* Genres accepted most often */}
                    <label style={lbl}>Genres You Cover <span style={sub}>カバーするジャンル（最大10個）</span></label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>
                      {GENRE_OPTIONS.map(g => {
                        const sel = form.genres.includes(g);
                        const maxed = !sel && form.genres.length >= 10;
                        return (
                          <button key={g} onClick={() => toggleArray('genres', g, 10)} className="pill-tag" disabled={maxed} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: maxed ? 'not-allowed' : 'pointer', border: '1px solid', borderColor: sel ? T.accent : T.border, background: sel ? T.accentLight : T.white, color: sel ? T.accent : maxed ? T.textMuted : T.textSub, fontFamily: T.font, opacity: maxed ? 0.5 : 1 }}>{g}</button>
                        );
                      })}
                    </div>
                    {form.genres.length >= 10 && <p style={{ color: T.textMuted, fontSize: 11, marginTop: 6, fontFamily: T.font }}>Maximum 10 genres selected / 最大10ジャンル選択済み</p>}

                    {/* Also open to */}
                    <label style={lbl}>Also Open To <span style={sub}>こちらも受け付けます（任意）</span></label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>
                      {GENRE_OPTIONS.map(g => {
                        const sel = form.accepts.includes(g);
                        return (
                          <button key={g} onClick={() => toggleArray('accepts', g, null)} className="pill-tag" style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: '1px solid', borderColor: sel ? T.accent : T.border, background: sel ? T.accentLight : T.white, color: sel ? T.accent : T.textSub, fontFamily: T.font }}>{g}</button>
                        );
                      })}
                    </div>

                    {/* Moods */}
                    <label style={lbl}>Moods You Love <span style={sub}>好きなムード</span></label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>
                      {MOOD_OPTIONS.map(m => {
                        const sel = form.moods.includes(m);
                        return (
                          <button key={m} onClick={() => toggleArray('moods', m, null)} className="pill-tag" style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: '1px solid', borderColor: sel ? T.accent : T.border, background: sel ? T.accentLight : T.white, color: sel ? T.accent : T.textSub, fontFamily: T.font }}>{m}</button>
                        );
                      })}
                    </div>

                    {/* Opportunities */}
                    <label style={lbl}>Opportunities You Offer <span style={sub}>提供できる機会</span></label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                      {OPPORTUNITY_OPTIONS.map(o => {
                        const sel = form.opportunities.includes(o.value);
                        return (
                          <label key={o.value} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 14px', borderRadius: 8, border: `1px solid ${sel ? T.accent : T.border}`, background: sel ? T.accentLight : T.white, transition: 'all 0.15s' }}>
                            <input type="checkbox" checked={sel} onChange={() => toggleArray('opportunities', o.value, null)} style={{ accentColor: T.accent, width: 15, height: 15, flexShrink: 0 }} />
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500, color: sel ? T.accent : T.text, fontFamily: T.font }}>{o.en}</div>
                              <div style={{ fontSize: 11, color: sel ? T.accent : T.textMuted, fontFamily: T.font }}>{o.ja}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    {/* Similar Artists */}
                    <label style={lbl}>Music Similar To... <span style={sub}>こんな音楽が好き（カンマ区切り、最大5アーティスト）</span></label>
                    <input className="curator-input" style={inp} value={form.similarArtists} placeholder="e.g. Snarky Puppy, Nujabes, Khruangbin" onChange={e => set('similarArtists', e.target.value)} />
                    <p style={{ color: T.textMuted, fontSize: 11, marginTop: 5, fontFamily: T.font }}>Separate with commas / カンマ区切りで入力</p>

                    {/* Playlist URL */}
                    <label style={lbl}>Spotify / YouTube Playlist URL <span style={sub}>プレイリストURL（任意）</span></label>
                    <input className="curator-input" style={inp} type="url" value={form.playlistUrl} placeholder="https://open.spotify.com/playlist/..." onChange={e => set('playlistUrl', e.target.value)} />

                    {/* Followers + PayPal */}
                    <label style={lbl}>Followers / Subscribers <span style={sub}>フォロワー・読者数</span></label>
                    <input className="curator-input" style={inp} type="number" value={form.followers} placeholder="e.g. 5000" onChange={e => set('followers', e.target.value)} />

                    <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: '16px', marginTop: 20 }}>
                      <label style={{ ...lbl, marginTop: 0, color: T.accent }}>
                        💰 PayPal Email <span style={sub}>支払い受取用PayPalメール</span>
                      </label>
                      <input className="curator-input" style={{ ...inp, marginTop: 8 }} type="email" value={form.paypalEmail} placeholder="paypal@email.com" onChange={e => set('paypalEmail', e.target.value)} />
                      <p style={{ color: T.textMuted, fontSize: 11, marginTop: 8, lineHeight: 1.6, fontFamily: T.font }}>
                        Payouts processed via PayPal when balance reaches ¥5,000 / $50 USD.<br />
                        残高が5,000円/$50に達した時点でPayPal経由でお支払いします。
                      </p>
                    </div>

                    {error && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 14, fontFamily: T.font }}>{error}</p>}

                    <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
                      <button onClick={() => setRegisterStep(1)} style={{ padding: '14px 20px', border: `1px solid ${T.border}`, borderRadius: 10, background: T.white, color: T.textSub, fontSize: 14, cursor: 'pointer', fontFamily: T.font }}>← Back</button>
                      <button onClick={handleSubmit} disabled={status === 'loading' || avatarUploading} style={{ flex: 1, padding: '14px', height: 48, background: (status === 'loading' || avatarUploading) ? T.border : T.accent, border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 700, cursor: (status === 'loading' || avatarUploading) ? 'not-allowed' : 'pointer', fontFamily: T.font, transition: 'background 0.15s' }}
                      onMouseEnter={e => { if (status !== 'loading' && !avatarUploading) e.currentTarget.style.background = T.accentDark; }}
                      onMouseLeave={e => { if (status !== 'loading' && !avatarUploading) e.currentTarget.style.background = T.accent; }}
                      >
                        {avatarUploading ? 'Uploading image... / 画像アップロード中...' : status === 'loading' ? 'Submitting... / 送信中...' : 'Complete Registration / 登録完了 →'}
                      </button>
                    </div>
                  </div>

                  <p style={{ textAlign: 'center', color: T.textMuted, fontSize: 11, marginTop: 20, lineHeight: 1.7, fontFamily: T.font }}>
                    By submitting, you agree to receive pitch emails from Japanese indie artists via OTONAMI.<br />
                    送信することで、OTONAMIを通じて日本のインディーアーティストからのピッチメール受信に同意します。
                  </p>
                </>
              )}
            </>
          )}

        </div>
      </div>

      {/* ── Footer ── */}
      <footer style={{ padding: '32px 24px', background: T.white, borderTop: `1px solid ${T.border}`, textAlign: 'center', fontFamily: T.font, fontSize: 13, color: T.textMuted }}>
        <div>
          <span>OTONAMI — Connecting Japanese Music to the World</span>
          <span style={{ margin: '0 8px' }}>·</span>
          <span>TYCompany LLC / ILCJ</span>
        </div>
      </footer>
    </div>
  );
}
