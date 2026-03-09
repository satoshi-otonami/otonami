'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

/* ── スタイル定数（curator/page.js と統一） ── */
const inp = {
  width: '100%', padding: '11px 14px', borderRadius: 8,
  border: '1px solid #2a2a4a', background: '#0d0d1f', color: '#fff',
  fontSize: 14, outline: 'none', marginTop: 6, boxSizing: 'border-box',
};
const lbl = { fontSize: 13, color: '#888', display: 'block', marginTop: 18 };

/* ── モードA: メールアドレス入力フォーム ── */
function EmailForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'sent' | 'error'
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
      <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 800, marginBottom: 12 }}>
        Check your email!
      </h2>
      <p style={{ color: '#888', fontSize: 14, lineHeight: 1.75, marginBottom: 8 }}>
        We sent a password setup link to <strong style={{ color: '#a78bfa' }}>{email}</strong>.<br />
        <span style={{ color: '#555', fontSize: 12 }}>パスワード設定リンクをメールに送信しました。</span>
      </p>
      <p style={{ color: '#555', fontSize: 12, marginTop: 16 }}>
        Didn't receive it? Check spam or{' '}
        <button onClick={() => setStatus('idle')} style={{
          background: 'none', border: 'none', color: '#a78bfa',
          cursor: 'pointer', fontSize: 12, textDecoration: 'underline',
        }}>try again</button>.
      </p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit}>
      <p style={{ color: '#888', fontSize: 13, margin: '0 0 20px', lineHeight: 1.7 }}>
        Enter your email address to receive a password setup link.<br />
        <span style={{ color: '#555', fontSize: 12 }}>メールアドレスを入力してパスワード設定リンクを受け取ってください。</span>
      </p>

      <label style={lbl}>Email Address <span style={{ fontSize: 11, color: '#555', marginLeft: 4 }}>メールアドレス</span></label>
      <input
        style={inp} type="email" value={email}
        placeholder="your@email.com" autoFocus
        onChange={e => setEmail(e.target.value)}
      />

      {error && (
        <p style={{ color: '#f87171', fontSize: 13, marginTop: 12, padding: '8px 12px', background: 'rgba(248,113,113,0.1)', borderRadius: 8 }}>
          {error}
        </p>
      )}

      <button type="submit" disabled={status === 'loading'} style={{
        width: '100%', marginTop: 24, padding: '14px',
        background: status === 'loading' ? '#333' : 'linear-gradient(135deg,#0ea5e9,#38bdf8)',
        border: 'none', borderRadius: 12, color: '#fff',
        fontSize: 15, fontWeight: 700, cursor: status === 'loading' ? 'not-allowed' : 'pointer',
      }}>
        {status === 'loading' ? 'Sending... / 送信中...' : 'Send Link / リンクを送信 →'}
      </button>

      <p style={{ textAlign: 'center', color: '#555', fontSize: 12, marginTop: 16 }}>
        <a href="/curator" style={{ color: '#a78bfa', textDecoration: 'none' }}>← Back to Login</a>
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
      <h2 style={{ color: '#4ade80', fontSize: 20, fontWeight: 800, marginBottom: 12 }}>
        Password set successfully!
      </h2>
      <p style={{ color: '#888', fontSize: 14, lineHeight: 1.75 }}>
        パスワード設定完了！<br />
        <span style={{ color: '#555', fontSize: 12 }}>Redirecting to login... / ログイン画面に移動します...</span>
      </p>
      <div style={{ marginTop: 20 }}>
        <div style={{
          width: 200, height: 4, background: '#1e1e3a', borderRadius: 2,
          margin: '0 auto', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', background: '#4ade80', borderRadius: 2,
            animation: 'progress 3s linear forwards',
          }}/>
        </div>
      </div>
      <style>{`@keyframes progress { from { width: 0% } to { width: 100% } }`}</style>
    </div>
  );

  return (
    <form onSubmit={handleSubmit}>
      <p style={{ color: '#888', fontSize: 13, margin: '0 0 20px', lineHeight: 1.7 }}>
        Set a new password for <strong style={{ color: '#a78bfa' }}>{initialEmail}</strong>.<br />
        <span style={{ color: '#555', fontSize: 12 }}>新しいパスワードを設定してください。（8文字以上）</span>
      </p>

      <label style={lbl}>New Password <span style={{ fontSize: 11, color: '#555', marginLeft: 4 }}>新しいパスワード</span></label>
      <input
        style={inp} type="password" value={password}
        placeholder="Minimum 8 characters" autoFocus
        onChange={e => setPassword(e.target.value)}
      />

      <label style={{ ...lbl, marginTop: 16 }}>Confirm Password <span style={{ fontSize: 11, color: '#555', marginLeft: 4 }}>パスワード確認</span></label>
      <input
        style={{
          ...inp,
          border: confirm && password !== confirm ? '1px solid #f87171' : '1px solid #2a2a4a',
        }}
        type="password" value={confirm}
        placeholder="Re-enter your password"
        onChange={e => setConfirm(e.target.value)}
      />
      {confirm && password !== confirm && (
        <p style={{ color: '#f87171', fontSize: 12, marginTop: 6 }}>Passwords do not match.</p>
      )}

      {/* Password strength hint */}
      {password.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: i <= Math.min(4, Math.floor(password.length / 3))
                ? ['#f87171','#fb923c','#facc15','#4ade80'][Math.min(3, Math.floor(password.length / 3) - 1)]
                : '#2a2a4a',
            }}/>
          ))}
        </div>
      )}

      {error && (
        <p style={{ color: '#f87171', fontSize: 13, marginTop: 14, padding: '8px 12px', background: 'rgba(248,113,113,0.1)', borderRadius: 8 }}>
          {error === 'Invalid or expired reset link. Please request a new one.' ? (
            <>
              {error}{' '}
              <a href="/curator/set-password" style={{ color: '#a78bfa', textDecoration: 'underline' }}>
                Request new link →
              </a>
            </>
          ) : error}
        </p>
      )}

      <button type="submit" disabled={status === 'loading' || password !== confirm || password.length < 8} style={{
        width: '100%', marginTop: 24, padding: '14px',
        background: (status === 'loading' || password !== confirm || password.length < 8)
          ? '#333' : 'linear-gradient(135deg,#0ea5e9,#38bdf8)',
        border: 'none', borderRadius: 12, color: '#fff',
        fontSize: 15, fontWeight: 700,
        cursor: (status === 'loading' || password !== confirm || password.length < 8) ? 'not-allowed' : 'pointer',
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

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a18', padding: '48px 16px 80px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <a href="/" style={{
            display: 'inline-block', marginBottom: 20,
            fontSize: 22, fontWeight: 900, color: '#a78bfa',
            textDecoration: 'none', letterSpacing: 2,
          }}>OTONAMI</a>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>
            {hasToken ? 'Set Your Password' : 'Password Setup'}
          </h1>
          <p style={{ color: '#555', fontSize: 13 }}>
            {hasToken ? 'パスワード設定' : 'パスワード設定リンクを受け取る'}
          </p>
        </div>

        {/* Card */}
        <div style={{ background: '#13132a', borderRadius: 16, padding: '28px 24px', border: '1px solid #1e1e3a' }}>
          {hasToken
            ? <SetPasswordForm token={token} email={email} />
            : <EmailForm />
          }
        </div>

        {/* Footer link */}
        <p style={{ textAlign: 'center', color: '#555', fontSize: 12, marginTop: 20 }}>
          <a href="/curator" style={{ color: '#666', textDecoration: 'none' }}>
            ← Curator Portal / キュレーターポータル
          </a>
        </p>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0a0a18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#555', fontSize: 14 }}>Loading... / 読み込み中...</p>
      </div>
    }>
      <SetPasswordContent />
    </Suspense>
  );
}
