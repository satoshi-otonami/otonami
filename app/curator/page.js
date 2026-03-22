"use client";
import { useState, useEffect, useRef } from 'react';
import { D as T } from '@/lib/design-tokens';
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
  'Rock', 'Pop', 'Hip-hop', 'R&B', 'Jazz', 'Electronic', 'Folk',
  'Classical', 'Indie', 'Alternative', 'Soul', 'Funk', 'Reggae',
  'Latin', 'World music', 'J-Pop', 'J-Rock', 'City Pop',
  'Ambient', 'Experimental', 'Metal', 'Punk', 'Singer-Songwriter',
  'Instrumental', 'Dance music', 'Jazz fusion', 'Film music',
  'Lo-fi', 'Rap', 'Trap', 'Disco',
];

const MOOD_OPTIONS = [
  'Chill', 'Energetic', 'Melancholic', 'Upbeat', 'Dark', 'Dreamy',
  'Aggressive', 'Romantic', 'Nostalgic', 'Funky', 'Ethereal', 'Raw',
  'Groovy', 'Atmospheric', 'Playful',
];

const OPPORTUNITY_OPTIONS = [
  { value: 'playlist',  icon: '🎵', en: 'Playlist Add',       ja: 'プレイリストに追加' },
  { value: 'blog',      icon: '📝', en: 'Written Review',      ja: 'ブログ記事・レビュー' },
  { value: 'social',    icon: '📱', en: 'Social Media Share',  ja: 'SNSで紹介' },
  { value: 'radio',     icon: '📻', en: 'Radio Play',          ja: 'ラジオで放送' },
  { value: 'reel',      icon: '🎬', en: 'Post / Reel',         ja: 'SNS投稿・リール' },
  { value: 'interview', icon: '🎤', en: 'Interview',           ja: 'インタビュー' },
  { value: 'event',     icon: '🎪', en: 'Event / Festival',    ja: 'イベント・フェス' },
  { value: 'label',     icon: '💿', en: 'Label Consideration', ja: 'レーベル検討' },
];

const RESPONSE_TIME_OPTIONS = [
  { value: '24h',    en: 'Within 24 hours', ja: '24時間以内' },
  { value: '3days',  en: '1–3 days',        ja: '1〜3日' },
  { value: '7days',  en: '3–7 days',        ja: '3〜7日' },
  { value: '2weeks', en: '1–2 weeks',       ja: '1〜2週間' },
];

export default function CuratorRegistrationPage() {
  const [tab, setTab] = useState('login');
  const [registerStep, setRegisterStep] = useState(1);
  const [lang, setLang] = useState('ja');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const avatarInputRef = useRef(null);

  // Login
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginStatus, setLoginStatus] = useState(null);
  const [loginError, setLoginError] = useState('');
  const [loggedInCurator, setLoggedInCurator] = useState(null);

  // Register
  const [form, setForm] = useState({
    name: '', email: '', password: '', type: 'playlist',
    outletName: '', url: '', region: 'Global',
    genres: [], rejectedGenres: [], moods: [], similarArtists: [],
    playlistUrl: '',
    bio: '', followers: '', paypalEmail: '', opportunities: [],
    responseTime: '', featuredTrackUrl: '',
    socialWebsite: '', socialTwitter: '', socialInstagram: '',
    submissionGuidelines: '',
  });
  const [artistInput, setArtistInput] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarDragOver, setAvatarDragOver] = useState(false);
  const [step1Error, setStep1Error] = useState('');
  const [step2Error, setStep2Error] = useState('');
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

  const switchLang = (l) => { setLang(l); try { localStorage.setItem('otonami_locale', l); } catch {} };
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const toggleArray = (key, val, max) => {
    setForm(f => {
      const arr = f[key] || [];
      if (arr.includes(val)) return { ...f, [key]: arr.filter(x => x !== val) };
      if (max != null && arr.length >= max) return f;
      return { ...f, [key]: [...arr, val] };
    });
  };

  const addArtist = () => {
    const val = artistInput.trim();
    if (!val || form.similarArtists.length >= 10) return;
    if (!form.similarArtists.includes(val)) set('similarArtists', [...form.similarArtists, val]);
    setArtistInput('');
  };

  const applyAvatarFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file.'); return; }
    if (file.size > 2 * 1024 * 1024) { alert('File size must be under 2MB.'); return; }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) {
      setLoginError('Email and password are required. / メールとパスワードを入力してください。'); return;
    }
    setLoginStatus('loading'); setLoginError('');
    try {
      const res = await fetch('/api/curators/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email: loginForm.email, password: loginForm.password }),
      });
      const data = await res.json();
      if (res.status === 409 && data.error === 'password_not_set') { setLoginStatus('password_not_set'); return; }
      if (!res.ok) throw new Error(data.error || 'Login failed');
      localStorage.setItem('curator_token', data.token);
      setLoggedInCurator(data.curator); setLoginStatus('success');
      window.location.href = '/curator/dashboard';
    } catch (e) { setLoginError(e.message); setLoginStatus('error'); }
  };

  const goToStep2 = () => {
    setStep1Error('');
    if (!form.name.trim()) { setStep1Error('Name is required. / 名前は必須です。'); return; }
    if (!form.email.trim()) { setStep1Error('Email is required. / メールアドレスは必須です。'); return; }
    if (form.password.length < 8) { setStep1Error('Password must be at least 8 characters. / パスワードは8文字以上にしてください。'); return; }
    if (!form.outletName.trim()) { setStep1Error('Platform name is required. / プラットフォーム名は必須です。'); return; }
    setRegisterStep(2); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToStep3 = () => {
    setStep2Error('');
    if (form.genres.length === 0) { setStep2Error('Please select at least one genre. / ジャンルを1つ以上選択してください。'); return; }
    setRegisterStep(3); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    setStatus('loading'); setError('');
    let iconUrl = '';
    if (avatarFile) {
      setAvatarUploading(true);
      try {
        const ext = avatarFile.name.split('.').pop().toLowerCase();
        const slug = form.email.replace(/[^a-z0-9]/gi, '-').toLowerCase();
        const fileName = `curator-${slug}-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars').upload(fileName, avatarFile, { contentType: avatarFile.type, upsert: true });
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
          iconUrl = publicUrl;
        }
      } catch { /* skip */ } finally { setAvatarUploading(false); }
    }
    try {
      const socialLinks = {};
      if (form.socialWebsite.trim()) socialLinks.website = form.socialWebsite.trim();
      if (form.socialTwitter.trim()) socialLinks.twitter = form.socialTwitter.trim();
      if (form.socialInstagram.trim()) socialLinks.instagram = form.socialInstagram.trim();
      const res = await fetch('/api/curator', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, iconUrl, socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      if (data.token) {
        try { localStorage.setItem('curator_token', data.token); } catch {}
      }
      setStatus('success');
    } catch (e) { setError(e.message); setStatus('error'); }
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
    fontFamily: T.font, minHeight: 48,
  };
  const lbl = { fontSize: 13, color: T.textMuted, display: 'block', marginTop: 18, fontWeight: 500, fontFamily: T.font };
  const sub = { fontSize: 11, color: T.textMuted, marginLeft: 6, fontWeight: 400 };

  // ── Login success screen ──
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

  // ── Register success screen ──
  if (status === 'success') return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 520 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: T.accentGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 24px' }}>✅</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12, color: T.text, fontFamily: T.fontDisplay }}>
          Welcome to OTONAMI!
        </h1>
        <p style={{ color: T.textSub, lineHeight: 1.8, fontSize: 15, fontFamily: T.font, marginBottom: 8 }}>
          Your profile is ready. Artists will start matching with you based on your preferences.<br />
          <span style={{ color: T.textMuted, fontSize: 13 }}>プロフィールが完成しました。好みに基づいてアーティストとのマッチングが始まります。</span>
        </p>
        <p style={{ color: T.textMuted, fontSize: 13, lineHeight: 1.7, fontFamily: T.font, marginBottom: 28 }}>
          We&apos;ll review your profile within 2–3 business days.<br />
          <span style={{ fontSize: 12 }}>2〜3営業日以内にご連絡いたします。</span>
        </p>
        {/* Mini profile preview */}
        <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.radiusLg, padding: '20px 24px', marginBottom: 28, boxShadow: T.shadow, textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: T.accentGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, overflow: 'hidden' }}>
              {avatarPreview ? <img src={avatarPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🎵'}
            </div>
            <div>
              <div style={{ color: T.text, fontWeight: 700, fontSize: 16, fontFamily: T.fontDisplay }}>{form.name}</div>
              <div style={{ color: T.textMuted, fontSize: 12, fontFamily: T.font }}>{form.outletName} · {form.region}</div>
            </div>
          </div>
          {form.genres.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 12 }}>
              {form.genres.slice(0, 6).map(g => (
                <span key={g} style={{ padding: '2px 9px', borderRadius: 12, fontSize: 11, background: T.accentLight, color: T.accent, border: `1px solid ${T.accentBorder}`, fontFamily: T.font }}>{g}</span>
              ))}
            </div>
          )}
        </div>
        <a href="/curator/dashboard" style={{ display: 'inline-block', padding: '14px 36px', background: T.accentGrad, borderRadius: 24, color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 15, fontFamily: T.font }}>
          Go to Dashboard →
        </a>
        <div style={{ marginTop: 16 }}>
          <a href="/" style={{ color: T.textMuted, fontSize: 12, textDecoration: 'none', fontFamily: T.font }}>← Back to OTONAMI</a>
        </div>
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
            background: #1a1a1a; flex-direction: column;
          }
          .curator-hero { padding: 56px 18px 48px !important; }
          .curator-form-wrap { padding: 0 0 80px !important; }
        }
        .curator-input:focus { border-color: ${T.accent} !important; box-shadow: 0 0 0 3px rgba(196,149,106,0.15) !important; }
        .curator-input:hover { border-color: ${T.textMuted} !important; }
        .pill-tag { transition: all 0.15s; }
        .pill-tag:hover { border-color: ${T.accent} !important; background: ${T.accentLight} !important; color: ${T.accent} !important; }
        .pill-tag-sel:hover { opacity: 0.85 !important; }
        .curator-tab-btn { transition: all 0.2s; }
        .curator-tab-btn:hover { color: ${T.accent} !important; }
        @media (max-width: 768px) {
          .curator-input { min-height: 48px !important; font-size: 16px !important; }
          .pill-tag { min-height: 36px !important; padding: 8px 14px !important; font-size: 13px !important; }
          .step-btns-row { flex-direction: column !important; }
          .step-btn-back { width: 100% !important; }
          .avatar-upload-row { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
          .register-card { padding: 20px 16px !important; }
          .payout-notice { padding: 12px 14px !important; }
        }
      `}</style>

      {/* Mobile Menu */}
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

      {/* Header */}
      <header className="header-pad" style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(26,26,26,0.85)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${T.border}`, padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: T.font }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: T.accentGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 17 }}>O</div>
            <span className="logo-text" style={{ fontFamily: T.fontDisplay, fontSize: 22, fontWeight: 700, color: T.accent, letterSpacing: -0.3 }}>OTONAMI</span>
          </a>
          <nav className="nav-links-center" style={{ display: 'flex', gap: 4 }}>
            {navItems.map(item => (
              <a key={item.href} href={item.href} style={{ background: 'transparent', color: T.textSub, padding: '8px 14px', borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: 'none', fontFamily: T.font }}
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

      {/* Hero */}
      <section className="curator-hero" style={{ textAlign: 'center', padding: '72px 24px 60px', background: 'linear-gradient(135deg, #1a1a1a 0%, #2a1f1a 50%, #1a1a1a 100%)', borderBottom: `1px solid ${T.border}` }}>
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

      {/* Form area */}
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
              <input className="curator-input" style={inp} type="email" value={loginForm.email} placeholder="your@email.com" autoComplete="email" onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))} />
              <label style={lbl}>Password <span style={sub}>パスワード</span></label>
              <input className="curator-input" style={inp} type="password" value={loginForm.password} placeholder="Your password" autoComplete="current-password" onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleLogin()} />

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
              {/* 3-step progress bar */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  {[1, 2, 3].map(s => (
                    <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: registerStep >= s ? T.accent : '#3a3a3a', transition: 'background 0.3s' }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['Basic Info', 'Music Taste', 'Profile'].map((label, i) => (
                    <div key={i} style={{ flex: 1, fontSize: 10, fontWeight: registerStep === i + 1 ? 700 : 400, color: registerStep > i + 1 ? T.accent : registerStep === i + 1 ? T.text : T.textMuted, fontFamily: T.font, textAlign: 'center' }}>{label}</div>
                  ))}
                </div>
              </div>

              {/* ── STEP 1: Basic Info ── */}
              {registerStep === 1 && (
                <div className="register-card" style={{ background: T.white, borderRadius: T.radiusLg, padding: 32, border: `1px solid ${T.border}`, boxShadow: T.shadow }}>
                  <h2 style={{ fontFamily: T.fontDisplay, fontSize: 22, fontWeight: 700, color: T.text, margin: '0 0 4px' }}>Tell us about yourself</h2>
                  <p style={{ color: T.textMuted, fontSize: 12, marginBottom: 24, fontFamily: T.font }}>自己紹介を教えてください</p>

                  {/* Profile photo */}
                  <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: 12, color: T.textMuted, fontWeight: 600, marginBottom: 12, fontFamily: T.font }}>
                      Profile Photo <span style={{ fontWeight: 400 }}>プロフィール写真（任意）</span>
                    </div>
                    <div className="avatar-upload-row" style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                      <div
                        onClick={() => avatarInputRef.current?.click()}
                        onDragOver={e => { e.preventDefault(); setAvatarDragOver(true); }}
                        onDragLeave={() => setAvatarDragOver(false)}
                        onDrop={e => { e.preventDefault(); setAvatarDragOver(false); applyAvatarFile(e.dataTransfer.files?.[0]); }}
                        style={{ width: 80, height: 80, borderRadius: '50%', border: `2px dashed ${avatarDragOver ? T.accentDark : avatarPreview ? T.accent : T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', background: avatarDragOver ? T.accentLight : T.bg, flexShrink: 0, transition: 'all 0.15s' }}
                      >
                        {avatarPreview
                          ? <img src={avatarPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ textAlign: 'center', color: avatarDragOver ? T.accent : T.textMuted }}>
                              <div style={{ fontSize: 20 }}>📷</div>
                              <div style={{ fontSize: 9, marginTop: 2, fontFamily: T.font }}>{avatarDragOver ? 'Drop!' : 'Upload'}</div>
                            </div>
                        }
                      </div>
                      <div>
                        <button onClick={() => avatarInputRef.current?.click()} style={{ padding: '7px 14px', border: `1px solid ${T.border}`, borderRadius: 8, background: T.white, color: T.textSub, fontSize: 12, cursor: 'pointer', fontFamily: T.font }}>
                          {avatarPreview ? 'Change / 変更' : '📷 Upload Photo'}
                        </button>
                        {avatarPreview && (
                          <button onClick={() => { setAvatarFile(null); setAvatarPreview(null); }} style={{ marginLeft: 8, background: 'none', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer', fontFamily: T.font }}>Remove</button>
                        )}
                        <p style={{ color: T.textMuted, fontSize: 10, marginTop: 5, fontFamily: T.font }}>JPG / PNG / WebP · max 2MB</p>
                      </div>
                      <input ref={avatarInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" onChange={e => applyAvatarFile(e.target.files?.[0])} style={{ display: 'none' }} />
                    </div>
                  </div>

                  <label style={lbl}>Your Name * <span style={sub}>お名前</span></label>
                  <input className="curator-input" style={inp} value={form.name} placeholder="e.g. Taro Yamada" autoComplete="name" autoCorrect="off" onChange={e => set('name', e.target.value)} />

                  <label style={lbl}>Email Address * <span style={sub}>メールアドレス</span></label>
                  <input className="curator-input" style={inp} type="email" value={form.email} placeholder="your@email.com" autoComplete="email" onChange={e => set('email', e.target.value)} />

                  <label style={lbl}>Password * <span style={sub}>パスワード（8文字以上）</span></label>
                  <input className="curator-input" style={inp} type="password" value={form.password} placeholder="Minimum 8 characters" autoComplete="new-password" onChange={e => set('password', e.target.value)} />

                  <label style={lbl}>Curator Type * <span style={sub}>タイプ</span></label>
                  <select className="curator-input" style={inp} value={form.type} onChange={e => set('type', e.target.value)}>
                    {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.en} / {o.ja}</option>)}
                  </select>

                  <label style={lbl}>Platform Name * <span style={sub}>プラットフォーム名・媒体名</span></label>
                  <input className="curator-input" style={inp} value={form.outletName} placeholder="e.g. Make Believe Melodies, My Indie Playlist" autoComplete="organization" autoCorrect="off" onChange={e => set('outletName', e.target.value)} />

                  <label style={lbl}>Platform URL <span style={sub}>ウェブサイト（任意）</span></label>
                  <input className="curator-input" style={inp} type="url" value={form.url} placeholder="https://your-site.com" autoComplete="url" onChange={e => set('url', e.target.value)} />

                  <label style={lbl}>Country / Region <span style={sub}>国・地域</span></label>
                  <select className="curator-input" style={inp} value={form.region} onChange={e => set('region', e.target.value)}>
                    {REGION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>

                  {step1Error && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 16, fontFamily: T.font }}>{step1Error}</p>}

                  <button onClick={goToStep2} style={{ width: '100%', marginTop: 28, padding: '14px', height: 48, background: T.accent, border: 'none', borderRadius: 10, color: T.bg, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: T.font, transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = T.accentDark}
                  onMouseLeave={e => e.currentTarget.style.background = T.accent}
                  >Next → / 次へ</button>
                </div>
              )}

              {/* ── STEP 2: Music Taste ── */}
              {registerStep === 2 && (
                <div className="register-card" style={{ background: T.white, borderRadius: T.radiusLg, padding: 32, border: `1px solid ${T.border}`, boxShadow: T.shadow }}>
                  <h2 style={{ fontFamily: T.fontDisplay, fontSize: 22, fontWeight: 700, color: T.text, margin: '0 0 4px' }}>What music do you love?</h2>
                  <p style={{ color: T.textMuted, fontSize: 12, marginBottom: 24, fontFamily: T.font }}>どんな音楽が好きですか？</p>

                  {/* Genres */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 13, color: T.textMuted, fontWeight: 600, marginBottom: 10, fontFamily: T.font }}>
                      Genres You Cover * <span style={{ fontWeight: 400, fontSize: 11 }}>カバーするジャンル（必須・最大10個）</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                      {GENRE_OPTIONS.map(g => {
                        const sel = form.genres.includes(g);
                        const maxed = !sel && form.genres.length >= 10;
                        return (
                          <button key={g} onClick={() => toggleArray('genres', g, 10)} className={sel ? 'pill-tag pill-tag-sel' : 'pill-tag'} disabled={maxed}
                            style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: maxed ? 'not-allowed' : 'pointer', border: '1px solid', borderColor: sel ? T.accent : T.border, background: sel ? T.accent : T.white, color: sel ? T.bg : maxed ? T.textMuted : T.textSub, fontFamily: T.font, opacity: maxed ? 0.5 : 1, fontWeight: sel ? 600 : 400 }}>{g}</button>
                        );
                      })}
                    </div>
                    {form.genres.length >= 10 && <p style={{ color: T.textMuted, fontSize: 11, marginTop: 6, fontFamily: T.font }}>Maximum 10 selected / 最大10個</p>}
                  </div>

                  {/* Rejected genres */}
                  <div style={{ marginBottom: 24, paddingTop: 20, borderTop: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: 13, color: T.textMuted, fontWeight: 600, marginBottom: 10, fontFamily: T.font }}>
                      Genres You <span style={{ color: '#e85d3a' }}>DON&apos;T</span> Want <span style={{ fontWeight: 400, fontSize: 11 }}>受け取りたくないジャンル（任意）</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                      {GENRE_OPTIONS.map(g => {
                        const sel = form.rejectedGenres.includes(g);
                        return (
                          <button key={g} onClick={() => toggleArray('rejectedGenres', g, null)} className={sel ? 'pill-tag pill-tag-sel' : 'pill-tag'}
                            style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: '1px solid', borderColor: sel ? '#e85d3a' : T.border, background: sel ? '#e85d3a' : T.white, color: sel ? '#fff' : T.textSub, fontFamily: T.font, fontWeight: sel ? 600 : 400 }}>{g}</button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Moods */}
                  <div style={{ marginBottom: 24, paddingTop: 20, borderTop: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: 13, color: T.textMuted, fontWeight: 600, marginBottom: 10, fontFamily: T.font }}>
                      Moods You Love <span style={{ fontWeight: 400, fontSize: 11 }}>好きなムード（任意）</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                      {MOOD_OPTIONS.map(m => {
                        const sel = form.moods.includes(m);
                        return (
                          <button key={m} onClick={() => toggleArray('moods', m, null)} className={sel ? 'pill-tag pill-tag-sel' : 'pill-tag'}
                            style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: '1px solid', borderColor: sel ? T.accent : T.border, background: sel ? T.accent : T.white, color: sel ? T.bg : T.textSub, fontFamily: T.font, fontWeight: sel ? 600 : 400 }}>{m}</button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Similar Artists tag input */}
                  <div style={{ marginBottom: 24, paddingTop: 20, borderTop: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: 13, color: T.textMuted, fontWeight: 600, marginBottom: 10, fontFamily: T.font }}>
                      Artists Similar To Your Taste <span style={{ fontWeight: 400, fontSize: 11 }}>こんな音楽が好き（任意・最大10）</span>
                    </div>
                    {form.similarArtists.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                        {form.similarArtists.map((a, i) => (
                          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px 3px 11px', borderRadius: 20, background: T.white, border: `1px solid ${T.border}`, fontSize: 12, color: T.text, fontFamily: T.font }}>
                            {a}
                            <button onClick={() => set('similarArtists', form.similarArtists.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        className="curator-input"
                        style={{ ...inp, marginTop: 0, flex: 1 }}
                        value={artistInput}
                        placeholder="e.g. Snarky Puppy, Hiatus Kaiyote, toe"
                        onChange={e => setArtistInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addArtist(); } }}
                        disabled={form.similarArtists.length >= 10}
                      />
                      <button onClick={addArtist} disabled={!artistInput.trim() || form.similarArtists.length >= 10} style={{ padding: '0 16px', height: 48, border: `1px solid ${T.border}`, borderRadius: 8, background: T.white, color: T.textSub, fontSize: 12, cursor: 'pointer', fontFamily: T.font, flexShrink: 0 }}>Add</button>
                    </div>
                    <p style={{ color: T.textMuted, fontSize: 11, marginTop: 5, fontFamily: T.font }}>Press Enter or click Add / Enterキーまたは「Add」で追加</p>
                  </div>

                  {/* Playlist URL */}
                  <div style={{ paddingTop: 20, borderTop: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: 13, color: T.textMuted, fontWeight: 600, marginBottom: 4, fontFamily: T.font }}>
                      Your Playlist or Show URL <span style={{ fontWeight: 400, fontSize: 11 }}>プレイリスト・番組URL（任意）</span>
                    </div>
                    <input className="curator-input" style={{ ...inp, marginTop: 8 }} type="url" value={form.playlistUrl} placeholder="Spotify playlist, YouTube channel, radio show URL..." onChange={e => set('playlistUrl', e.target.value)} />
                  </div>

                  {step2Error && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 16, fontFamily: T.font }}>{step2Error}</p>}

                  <div className="step-btns-row" style={{ display: 'flex', gap: 10, marginTop: 28 }}>
                    <button onClick={() => setRegisterStep(1)} className="step-btn-back" style={{ padding: '14px 20px', height: 48, border: `1px solid ${T.border}`, borderRadius: 10, background: T.white, color: T.textSub, fontSize: 14, cursor: 'pointer', fontFamily: T.font }}>← Back</button>
                    <button onClick={goToStep3} style={{ flex: 1, padding: '14px', height: 48, background: T.accent, border: 'none', borderRadius: 10, color: T.bg, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: T.font, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = T.accentDark}
                    onMouseLeave={e => e.currentTarget.style.background = T.accent}
                    >Next → / 次へ</button>
                  </div>
                </div>
              )}

              {/* ── STEP 3: Profile Details ── */}
              {registerStep === 3 && (
                <>
                  <div className="payout-notice" style={{ background: T.accentLight, border: `1px solid ${T.accentBorder}`, borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{ fontSize: 20 }}>💰</span>
                    <div>
                      <p style={{ color: T.accent, fontWeight: 700, margin: 0, fontSize: 14, fontFamily: T.font }}>Curator Payout Policy</p>
                      <p style={{ color: T.textSub, fontSize: 12, margin: '4px 0 0', lineHeight: 1.6, fontFamily: T.font }}>
                        Minimum payout: <strong style={{ color: T.text }}>¥5,000 / $50 USD</strong> via PayPal.<br />
                        <span style={{ color: T.textMuted }}>最低支払い額：PayPal経由で5,000円 / 50ドル以上</span>
                      </p>
                    </div>
                  </div>

                  <div className="register-card" style={{ background: T.white, borderRadius: T.radiusLg, padding: 32, border: `1px solid ${T.border}`, boxShadow: T.shadow }}>
                    <h2 style={{ fontFamily: T.fontDisplay, fontSize: 22, fontWeight: 700, color: T.text, margin: '0 0 4px' }}>Complete your profile</h2>
                    <p style={{ color: T.textMuted, fontSize: 12, marginBottom: 24, fontFamily: T.font }}>プロフィールを完成させましょう</p>

                    {/* Bio */}
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 13, color: T.textMuted, fontWeight: 600, marginBottom: 4, fontFamily: T.font }}>
                        Bio / 自己紹介 <span style={{ fontWeight: 400, fontSize: 11 }}>最大500文字</span>
                      </div>
                      <textarea className="curator-input" value={form.bio} onChange={e => { if (e.target.value.length <= 500) set('bio', e.target.value); }} placeholder="Tell artists about yourself, your platform, and what kind of music you're looking for..." rows={4} style={{ ...inp, minHeight: 100, height: 100, resize: 'vertical', marginTop: 8 }} />
                      {form.bio.length > 400 && <p style={{ color: form.bio.length > 480 ? '#ef4444' : T.textMuted, fontSize: 11, marginTop: 4, fontFamily: T.font }}>{form.bio.length}/500</p>}
                    </div>

                    {/* Opportunities */}
                    <div style={{ marginBottom: 24, paddingTop: 20, borderTop: `1px solid ${T.border}` }}>
                      <div style={{ fontSize: 13, color: T.textMuted, fontWeight: 600, marginBottom: 10, fontFamily: T.font }}>
                        What opportunities can you offer? <span style={{ fontWeight: 400, fontSize: 11 }}>提供できる機会（任意）</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {OPPORTUNITY_OPTIONS.map(o => {
                          const sel = form.opportunities.includes(o.value);
                          return (
                            <button key={o.value} onClick={() => toggleArray('opportunities', o.value, null)} className={sel ? 'pill-tag pill-tag-sel' : 'pill-tag'}
                              style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: '1px solid', borderColor: sel ? T.accent : T.border, background: sel ? T.accent : T.white, color: sel ? T.bg : T.textSub, fontFamily: T.font, display: 'flex', alignItems: 'center', gap: 5, fontWeight: sel ? 600 : 400 }}>
                              <span>{o.icon}</span><span>{o.en}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Response time */}
                    <div style={{ marginBottom: 24, paddingTop: 20, borderTop: `1px solid ${T.border}` }}>
                      <div style={{ fontSize: 13, color: T.textMuted, fontWeight: 600, marginBottom: 4, fontFamily: T.font }}>
                        Typical response time <span style={{ fontWeight: 400, fontSize: 11 }}>通常の回答目安（任意）</span>
                      </div>
                      <select className="curator-input" style={{ ...inp, marginTop: 8 }} value={form.responseTime} onChange={e => set('responseTime', e.target.value)}>
                        <option value="">Select... / 選択してください</option>
                        {RESPONSE_TIME_OPTIONS.map(r => (
                          <option key={r.value} value={r.value}>{r.en} / {r.ja}</option>
                        ))}
                      </select>
                    </div>

                    {/* Featured track */}
                    <div style={{ marginBottom: 24, paddingTop: 20, borderTop: `1px solid ${T.border}` }}>
                      <div style={{ fontSize: 13, color: T.textMuted, fontWeight: 600, marginBottom: 4, fontFamily: T.font }}>
                        A track you recently loved <span style={{ fontWeight: 400, fontSize: 11 }}>最近気に入った曲（任意）</span>
                      </div>
                      <input className="curator-input" style={{ ...inp, marginTop: 8 }} type="url" value={form.featuredTrackUrl} placeholder="Spotify or YouTube URL..." onChange={e => set('featuredTrackUrl', e.target.value)} />
                    </div>

                    {/* Social links */}
                    <div style={{ marginBottom: 24, paddingTop: 20, borderTop: `1px solid ${T.border}` }}>
                      <div style={{ fontSize: 13, color: T.textMuted, fontWeight: 600, marginBottom: 12, fontFamily: T.font }}>
                        Social links <span style={{ fontWeight: 400, fontSize: 11 }}>SNSリンク（任意）</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[
                          { icon: '🌐', key: 'socialWebsite',   ph: 'https://your-website.com' },
                          { icon: '𝕏',  key: 'socialTwitter',   ph: 'https://x.com/yourhandle' },
                          { icon: '📸', key: 'socialInstagram', ph: 'https://instagram.com/yourhandle' },
                        ].map(({ icon, key, ph }) => (
                          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 18, flexShrink: 0, width: 24, textAlign: 'center' }}>{icon}</span>
                            <input className="curator-input" style={{ ...inp, marginTop: 0, flex: 1 }} type="url" value={form[key]} placeholder={ph} onChange={e => set(key, e.target.value)} />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Submission guidelines */}
                    <div style={{ marginBottom: 24, paddingTop: 20, borderTop: `1px solid ${T.border}` }}>
                      <div style={{ fontSize: 13, color: T.textMuted, fontWeight: 600, marginBottom: 4, fontFamily: T.font }}>
                        Submission guidelines <span style={{ fontWeight: 400, fontSize: 11 }}>受付ガイドライン（任意・最大300文字）</span>
                      </div>
                      <textarea className="curator-input" value={form.submissionGuidelines} onChange={e => { if (e.target.value.length <= 300) set('submissionGuidelines', e.target.value); }} placeholder="Any specific instructions for artists submitting to you?" rows={3} style={{ ...inp, minHeight: 80, height: 80, resize: 'vertical', marginTop: 8 }} />
                      {form.submissionGuidelines.length > 200 && <p style={{ color: form.submissionGuidelines.length > 280 ? '#ef4444' : T.textMuted, fontSize: 11, marginTop: 4, fontFamily: T.font }}>{form.submissionGuidelines.length}/300</p>}
                    </div>

                    {/* Followers + PayPal */}
                    <div style={{ paddingTop: 20, borderTop: `1px solid ${T.border}` }}>
                      <div style={{ fontSize: 13, color: T.textMuted, fontWeight: 600, marginBottom: 4, fontFamily: T.font }}>
                        Followers / Subscribers <span style={{ fontWeight: 400, fontSize: 11 }}>フォロワー・読者数</span>
                      </div>
                      <input className="curator-input" style={{ ...inp, marginTop: 8 }} type="number" value={form.followers} placeholder="e.g. 5000" onChange={e => set('followers', e.target.value)} />
                      <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16, marginTop: 20 }}>
                        <div style={{ fontSize: 13, color: T.accent, fontWeight: 600, marginBottom: 4, fontFamily: T.font }}>
                          💰 PayPal Email <span style={{ fontWeight: 400, fontSize: 11, color: T.textMuted }}>支払い受取用PayPalメール</span>
                        </div>
                        <input className="curator-input" style={{ ...inp, marginTop: 8 }} type="email" value={form.paypalEmail} placeholder="paypal@email.com" onChange={e => set('paypalEmail', e.target.value)} />
                        <p style={{ color: T.textMuted, fontSize: 11, marginTop: 8, lineHeight: 1.6, fontFamily: T.font }}>
                          Payouts processed via PayPal when balance reaches ¥5,000 / $50 USD.<br />
                          残高が5,000円/$50に達した時点でPayPal経由でお支払いします。
                        </p>
                      </div>
                    </div>

                    {error && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 14, fontFamily: T.font }}>{error}</p>}

                    <div className="step-btns-row" style={{ display: 'flex', gap: 10, marginTop: 28 }}>
                      <button onClick={() => setRegisterStep(2)} className="step-btn-back" style={{ padding: '14px 20px', height: 48, border: `1px solid ${T.border}`, borderRadius: 10, background: T.white, color: T.textSub, fontSize: 14, cursor: 'pointer', fontFamily: T.font }}>← Back</button>
                      <button onClick={handleSubmit} disabled={status === 'loading' || avatarUploading} style={{ flex: 1, padding: '14px', height: 48, background: (status === 'loading' || avatarUploading) ? T.border : '#e85d3a', border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 700, cursor: (status === 'loading' || avatarUploading) ? 'not-allowed' : 'pointer', fontFamily: T.font, transition: 'background 0.15s' }}>
                        {avatarUploading ? 'Uploading... / アップロード中...' : status === 'loading' ? 'Submitting... / 送信中...' : 'Complete Registration / 登録完了 →'}
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

      {/* Footer */}
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
