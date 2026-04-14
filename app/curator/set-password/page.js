'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CL as T } from '@/lib/design-tokens';

const inp = {
  width: '100%', padding: '13px 16px', borderRadius: 8,
  border: `1px solid ${T.border}`, background: T.white, color: T.text,
  fontSize: 16, outline: 'none', marginTop: 6, boxSizing: 'border-box',
  fontFamily: T.font,
};
const lbl = {
  fontSize: 14, color: T.textSub, display: 'block', marginTop: 18,
  fontWeight: 600, fontFamily: T.font,
};

/* ── モードA: メールアドレス入力フォーム ── */
function EmailForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setStatus('loading');
    setError('');
    try {
      const res = await fetch('/api/curators/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send email');
      setStatus('sent');
    } catch (e) {
      setError(e.message);
      setStatus('error');
    }
  };

  if (status === 'sent') return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>📬</div>
      <h2 style={{ color: T.text, fontSize: 20, fontWeight: 800, marginBottom: 12, fontFamily: T.fontDisplay }}>
        Check your email!
      </h2>
      <p style={{ color: T.textSub, fontSize: 14, lineHeight: 1.75, marginBottom: 8, fontFamily: T.font }}>
        We sent a password setup link to <strong style={{ color: T.accent }}>{email}</strong>.<br />
        <span style={{ color: T.textMuted, fontSize: 12 }}>パスワード設定リンクをメールに送信しました。</span>
      </p>
      <p style={{ color: T.textMuted, fontSize: 12, marginTop: 16, fontFamily: T.font }}>
        Didn't receive it? Check spam or{' '}
        <button onClick={() => setStatus('idle')} style={{
          background: 'none', border: 'none', color: T.accent,
          cursor: 'pointer', fontSize: 12, textDecoration: 'underline', fontFamily: T.font,
        }}>try again</button>.
      </p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit}>
      <p style={{ color: T.textSub, fontSize: 13, margin: '0 0 20px', lineHeight: 1.7, fontFamily: T.font }}>
        Enter your email address to receive a password setup link.<br />
        <span style={{ color: T.textMuted, fontSize: 12 }}>メールアドレスを入力してパスワード設定リンクを受け取ってください。</span>
      </p>

      <label style={lbl}>
        Email Address <span style={{ fontSize: 11, color: T.textMuted, marginLeft: 4 }}>メールアドレス</span>
      </label>
      <input
        style={inp} type="email" value={email}
        placeholder="your@email.com" autoFocus
        onChange={e => setEmail(e.target.value)}
      />

      {error && (
        <p style={{ color: '#ef4444', fontSize: 13, marginTop: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, fontFamily: T.font }}>
          {error}
        </p>
      )}

      <button type="submit" disabled={status === 'loading'} style={{
        width: '100%', marginTop: 24, padding: '14px', height: 48,
        background: status === 'loading' ? T.border : T.accent,
        border: 'none', borderRadius: 12, color: '#fff',
        fontSize: 15, fontWeight: 700, cursor: status === 'loading' ? 'not-allowed' : 'pointer',
        fontFamily: T.font, transition: 'background 0.15s',
      }}>
        {status === 'loading' ? 'Sending... / 送信中...' : 'Send Link / リンクを送信 →'}
      </button>

      <p style={{ textAlign: 'center', color: T.textMuted, fontSize: 12, marginTop: 16, fontFamily: T.font }}>
        <a href="/curator" style={{ color: T.accent, textDecoration: 'none' }}>← Back to Login</a>
      </p>
    </form>
  );
}

/* ── モードB: パスワード入力フォーム ── */
function SetPasswordForm({ token, email: initialEmail }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters. / パスワードは8文字以上にしてください。');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match. / パスワードが一致しません。');
      return;
    }
    setStatus('loading');
    setError('');
    try {
      const res = await fetch('/api/curators/set-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: initialEmail, token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to set password');
      setStatus('success');
      setTimeout(() => { router.push('/curator'); }, 3000);
    } catch (e) {
      setError(e.message);
      setStatus('error');
    }
  };

  if (status === 'success') return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
      <h2 style={{ color: '#10b981', fontSize: 20, fontWeight: 800, marginBottom: 12, fontFamily: T.fontDisplay }}>
        Password set successfully!
      </h2>
      <p style={{ color: T.textSub, fontSize: 14, lineHeight: 1.75, fontFamily: T.font }}>
        パスワード設定完了！<br />
        <span style={{ color: T.textMuted, fontSize: 12 }}>Redirecting to login... / ログイン画面に移動します...</span>
      </p>
      <div style={{ marginTop: 20 }}>
        <div style={{
          width: 200, height: 4, background: T.border, borderRadius: 2,
          margin: '0 auto', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', background: '#10b981', borderRadius: 2,
            animation: 'progress 3s linear forwards',
          }}/>
        </div>
      </div>
      <style>{`@keyframes progress { from { width: 0% } to { width: 100% } }`}</style>
    </div>
  );

  return (
    <form onSubmit={handleSubmit}>
      <p style={{ color: T.textSub, fontSize: 13, margin: '0 0 20px', lineHeight: 1.7, fontFamily: T.font }}>
        Set a new password for <strong style={{ color: T.accent }}>{initialEmail}</strong>.<br />
        <span style={{ color: T.textMuted, fontSize: 12 }}>新しいパスワードを設定してください。（8文字以上）</span>
      </p>

      <label style={lbl}>
        New Password <span style={{ fontSize: 11, color: T.textMuted, marginLeft: 4 }}>新しいパスワード</span>
      </label>
      <input
        style={inp} type="password" value={password}
        placeholder="Minimum 8 characters" autoFocus
        onChange={e => setPassword(e.target.value)}
      />

      <label style={{ ...lbl, marginTop: 16 }}>
        Confirm Password <span style={{ fontSize: 11, color: T.textMuted, marginLeft: 4 }}>パスワード確認</span>
      </label>
      <input
        style={{
          ...inp,
          border: `1px solid ${confirm && password !== confirm ? '#ef4444' : T.border}`,
        }}
        type="password" value={confirm}
        placeholder="Re-enter your password"
        onChange={e => setConfirm(e.target.value)}
      />
      {confirm && password !== confirm && (
        <p style={{ color: '#ef4444', fontSize: 12, marginTop: 6, fontFamily: T.font }}>Passwords do not match.</p>
      )}

      {/* Password strength indicator */}
      {password.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: i <= Math.min(4, Math.floor(password.length / 3))
                ? ['#ef4444','#f97316','#eab308','#10b981'][Math.min(3, Math.floor(password.length / 3) - 1)]
                : T.border,
            }}/>
          ))}
        </div>
      )}

      {error && (
        <p style={{ color: '#ef4444', fontSize: 13, marginTop: 14, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, fontFamily: T.font }}>
          {error === 'Invalid or expired reset link. Please request a new one.' ? (
            <>
              {error}{' '}
              <a href="/curator/set-password" style={{ color: T.accent, textDecoration: 'underline' }}>
                Request new link →
              </a>
            </>
          ) : error}
        </p>
      )}

      <button type="submit" disabled={status === 'loading' || password !== confirm || password.length < 8} style={{
        width: '100%', marginTop: 24, padding: '14px', height: 48,
        background: (status === 'loading' || password !== confirm || password.length < 8)
          ? T.border : T.accent,
        border: 'none', borderRadius: 12, color: '#fff',
        fontSize: 15, fontWeight: 700,
        cursor: (status === 'loading' || password !== confirm || password.length < 8) ? 'not-allowed' : 'pointer',
        fontFamily: T.font, transition: 'background 0.15s',
      }}>
        {status === 'loading' ? 'Setting password... / 設定中...' : 'Set Password / パスワード設定 →'}
      </button>
    </form>
  );
}

/* ── メインページ（useSearchParams はSuspense内で使用） ── */
function SetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const hasToken = !!(token && email);

  const navItems = [
    { href: '/#how-it-works', label: '使い方' },
    { href: '/curators',       label: 'キュレーターを探す' },
    { href: '/studio',         label: 'アーティストの方' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: T.font }}>
      <style>{`*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }`}</style>

      {/* ── Header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${T.border}`,
        padding: '0 24px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontFamily: T.font,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <svg width="36" height="36" viewBox="0 0 40 40" style={{ flexShrink: 0 }}><circle cx="20" cy="20" r="16" fill="none" stroke="#FF6B4A" strokeWidth="5"/><g style={{clipPath:'circle(32.5% at 50% 50%)'}} fill="#FF6B4A"><rect x="8" y="17" width="2" height="6" rx="1"/><rect x="12" y="14" width="2" height="12" rx="1"/><rect x="16" y="11" width="2" height="18" rx="1"/><rect x="20" y="8" width="2" height="24" rx="1"/><rect x="24" y="11" width="2" height="18" rx="1"/><rect x="28" y="14" width="2" height="12" rx="1"/><rect x="32" y="17" width="2" height="6" rx="1"/></g></svg>
            <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: '3px', color: '#1a1a1a' }}>OTONAMI</span>
          </a>
          <nav style={{ display: 'flex', gap: 4 }}>
            {navItems.map(item => (
              <a key={item.href} href={item.href} style={{
                background: 'transparent', color: T.textSub,
                padding: '8px 14px', borderRadius: 8, fontSize: 14, fontWeight: 500,
                textDecoration: 'none', fontFamily: T.font,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = T.accentLight; e.currentTarget.style.color = T.accent; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textSub; }}
              >{item.label}</a>
            ))}
          </nav>
        </div>
        <a href="/curator" style={{
          padding: '8px 16px', fontSize: 13, fontWeight: 600,
          background: T.accent, color: '#fff', borderRadius: T.radius,
          textDecoration: 'none', fontFamily: T.font,
        }}
        onMouseEnter={e => e.currentTarget.style.background = T.accentDark}
        onMouseLeave={e => e.currentTarget.style.background = T.accent}
        >キュレーター登録</a>
      </header>

      {/* ── Page body ── */}
      <div style={{ padding: '64px 16px 96px' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>

          {/* Hero */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '5px 16px', background: T.accentLight,
              borderRadius: 24, fontSize: 12, fontWeight: 600, color: T.accent,
              border: `1px solid ${T.accentBorder}`, marginBottom: 20,
            }}>🔐 Curator Account</div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: T.text, margin: '0 0 8px', fontFamily: T.fontDisplay }}>
              {hasToken ? 'Set Your Password' : 'Password Setup'}
            </h1>
            <p style={{ color: T.textSub, fontSize: 13, fontFamily: T.font }}>
              {hasToken ? 'パスワード設定' : 'パスワード設定リンクを受け取る'}
            </p>
          </div>

          {/* Card */}
          <div style={{
            background: T.white, borderRadius: T.radiusLg, padding: '28px 24px',
            border: `1px solid ${T.border}`, boxShadow: T.shadow,
          }}>
            {hasToken
              ? <SetPasswordForm token={token} email={email} />
              : <EmailForm />
            }
          </div>

          {/* Footer link */}
          <p style={{ textAlign: 'center', color: T.textMuted, fontSize: 12, marginTop: 20, fontFamily: T.font }}>
            <a href="/curator" style={{ color: T.accent, textDecoration: 'none' }}>
              ← Curator Portal / キュレーターポータル
            </a>
          </p>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer style={{
        padding: '32px 24px', background: T.white, borderTop: `1px solid ${T.border}`,
        textAlign: 'center', fontFamily: T.font, fontSize: 13, color: T.textMuted,
      }}>
        <span>OTONAMI — Connecting Japanese Music to the World</span>
        <span style={{ margin: '0 8px' }}>·</span>
        <span>TYCompany LLC</span>
      </footer>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: T.textMuted, fontSize: 14, fontFamily: T.font }}>Loading... / 読み込み中...</p>
      </div>
    }>
      <SetPasswordContent />
    </Suspense>
  );
}
