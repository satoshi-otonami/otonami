"use client";
import { useState } from 'react';

const THEME = {
  bg: '#f8f7f4',
  card: '#ffffff',
  border: '#e5e2dc',
  text: '#1a1a1a',
  textSub: '#6b6560',
  textMuted: '#9b9590',
  gold: '#c4956a',
  goldDark: '#b8845e',
  coral: '#e85d3a',
  font: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  fontDisplay: "'Playfair Display', Georgia, serif",
};

export default function ArtistLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) { setError('メールアドレスとパスワードを入力してください'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/artists/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      localStorage.setItem('artist_token', data.token);
      window.location.href = '/artist/dashboard';
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const inp = {
    width: '100%', padding: '12px 16px', borderRadius: 10,
    border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text,
    fontSize: 15, outline: 'none', marginTop: 6, boxSizing: 'border-box',
    fontFamily: THEME.font, minHeight: 48,
  };

  return (
    <div style={{ minHeight: '100vh', background: THEME.bg, fontFamily: THEME.font }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f8f7f4; }
        .login-input:focus { border-color: #c4956a !important; box-shadow: 0 0 0 3px rgba(196,149,106,0.12) !important; }
        .login-input:hover { border-color: #9b9590 !important; }
        .btn-gold:hover { background: #b8845e !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .login-card { margin: 0 16px !important; padding: 28px 20px !important; }
          .login-input { font-size: 16px !important; }
        }
      `}</style>

      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${THEME.border}`,
        padding: '0 24px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: THEME.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 17 }}>O</div>
          <span style={{ fontFamily: THEME.fontDisplay, fontSize: 22, fontWeight: 700, color: THEME.gold, letterSpacing: -0.3 }}>OTONAMI</span>
        </a>
        <a href="/artist" style={{ padding: '8px 20px', borderRadius: 100, border: `1.5px solid ${THEME.gold}`, color: THEME.gold, textDecoration: 'none', fontSize: 13, fontWeight: 600, fontFamily: THEME.font }}>新規登録</a>
      </header>

      {/* Centered card */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)', padding: 24 }}>
        <div className="login-card" style={{ width: '100%', maxWidth: 440, background: THEME.card, borderRadius: 16, padding: '36px 32px', border: `1px solid ${THEME.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>

          <h1 style={{ fontFamily: THEME.fontDisplay, fontSize: 24, fontWeight: 700, color: THEME.text, margin: '0 0 24px', textAlign: 'center' }}>ログイン</h1>

          <label style={{ fontSize: 13, color: THEME.textSub, fontWeight: 600, display: 'block', fontFamily: THEME.font }}>メールアドレス</label>
          <input className="login-input" style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" autoComplete="email" />

          <label style={{ fontSize: 13, color: THEME.textSub, fontWeight: 600, display: 'block', marginTop: 20, fontFamily: THEME.font }}>パスワード</label>
          <div style={{ position: 'relative' }}>
            <input className="login-input" style={{ ...inp, paddingRight: 48 }} type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="パスワード" autoComplete="current-password" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            <button onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: THEME.textMuted, fontSize: 13, fontFamily: THEME.font, marginTop: 3 }}>
              {showPassword ? '隠す' : '表示'}
            </button>
          </div>

          {error && (
            <p style={{ color: THEME.coral, fontSize: 13, marginTop: 16, fontFamily: THEME.font, textAlign: 'center' }}>{error}</p>
          )}

          <button onClick={handleLogin} disabled={loading} className="btn-gold" style={{
            width: '100%', marginTop: 28, padding: '14px', borderRadius: 100,
            background: loading ? THEME.border : THEME.gold, border: 'none',
            color: '#fff', fontSize: 15, fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer', fontFamily: THEME.font,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'background 0.15s',
          }}>
            {loading ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="3" fill="none" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                </svg>
                ログイン中...
              </>
            ) : 'ログイン'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '28px 0' }}>
            <div style={{ flex: 1, height: 1, background: THEME.border }} />
            <span style={{ fontSize: 12, color: THEME.textMuted, fontFamily: THEME.font }}>アカウントをお持ちでない方</span>
            <div style={{ flex: 1, height: 1, background: THEME.border }} />
          </div>

          <a href="/artist" style={{
            display: 'block', textAlign: 'center', padding: '12px', borderRadius: 100,
            border: `1.5px solid ${THEME.gold}`, color: THEME.gold,
            textDecoration: 'none', fontSize: 14, fontWeight: 600, fontFamily: THEME.font,
            transition: 'all 0.15s',
          }}>
            新規登録 →
          </a>
        </div>
      </div>
    </div>
  );
}
