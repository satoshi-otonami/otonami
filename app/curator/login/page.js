"use client";
import { useState, useRef, useEffect } from 'react';

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
  green: '#10b981',
  font: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  fontDisplay: "'Sora', 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
};

export default function CuratorLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordNotSet, setPasswordNotSet] = useState(false);

  // OTP state
  const [loginStep, setLoginStep] = useState(1);
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [resendVerifyStatus, setResendVerifyStatus] = useState('');
  const otpRefs = useRef([]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleLogin = async () => {
    if (!email || !password) { setError('Please enter your email and password. / メールアドレスとパスワードを入力してください'); return; }
    setLoading(true);
    setError('');
    setEmailNotVerified(false);
    setPasswordNotSet(false);
    try {
      const res = await fetch('/api/curators/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password }),
      });
      const data = await res.json();
      if (res.status === 409 && data.error === 'password_not_set') {
        setPasswordNotSet(true);
        return;
      }
      if (res.status === 403 && data.error === 'email_not_verified') {
        setEmailNotVerified(true);
        setError(data.message || 'Email not verified.');
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Login failed');
      if (data.step === 'otp_required') {
        setMaskedEmail(data.email);
        setLoginStep(2);
        setResendCooldown(60);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendVerifyStatus('loading');
    try {
      const res = await fetch('/api/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'curator' }),
      });
      if (res.ok) setResendVerifyStatus('sent');
      else setResendVerifyStatus('error');
    } catch { setResendVerifyStatus('error'); }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newValues = [...otpValues];
    newValues[index] = value.slice(-1);
    setOtpValues(newValues);
    setOtpError('');

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    if (value && index === 5 || newValues.every(v => v !== '')) {
      const code = newValues.join('');
      if (code.length === 6) {
        submitOtp(code);
      }
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 0) return;
    const newValues = [...otpValues];
    for (let i = 0; i < 6; i++) {
      newValues[i] = pasted[i] || '';
    }
    setOtpValues(newValues);
    const nextEmpty = newValues.findIndex(v => v === '');
    otpRefs.current[nextEmpty >= 0 ? nextEmpty : 5]?.focus();
    if (pasted.length === 6) {
      submitOtp(pasted);
    }
  };

  const submitOtp = async (code) => {
    setOtpLoading(true);
    setOtpError('');
    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp_code: code, type: 'curator' }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.attemptsRemaining !== undefined) {
          if (data.attemptsRemaining === 0) {
            setOtpError('Too many attempts. Please try again later. / 試行回数を超えました。しばらく経ってから再度お試しください。');
          } else {
            setOtpError(`Invalid code. ${data.attemptsRemaining} attempts remaining. / コードが正しくありません。残り${data.attemptsRemaining}回`);
          }
        } else {
          setOtpError(data.error || 'Verification failed');
        }
        setOtpValues(['', '', '', '', '', '']);
        otpRefs.current[0]?.focus();
        return;
      }
      localStorage.setItem('curator_token', data.token);
      window.location.href = '/curator/dashboard';
    } catch (e) {
      setOtpError(e.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    try {
      await fetch('/api/curators/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password }),
      });
      setResendCooldown(60);
      setOtpValues(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } catch {}
  };

  const inp = {
    width: '100%', padding: '12px 16px', borderRadius: 10,
    border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text,
    fontSize: 16, outline: 'none', marginTop: 6, boxSizing: 'border-box',
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
        .otp-input:focus { border-color: #c4956a !important; box-shadow: 0 0 0 3px rgba(196,149,106,0.12) !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .login-card { margin: 0 16px !important; padding: 28px 20px !important; }
          .login-input { font-size: 16px !important; }
          .otp-input { width: 40px !important; height: 48px !important; font-size: 20px !important; }
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
          <svg width="36" height="36" viewBox="0 0 40 40" style={{ flexShrink: 0 }}><circle cx="20" cy="20" r="16" fill="none" stroke="#FF6B4A" strokeWidth="5"/><g style={{clipPath:'circle(32.5% at 50% 50%)'}} fill="#FF6B4A"><rect x="8" y="17" width="2" height="6" rx="1"/><rect x="12" y="14" width="2" height="12" rx="1"/><rect x="16" y="11" width="2" height="18" rx="1"/><rect x="20" y="8" width="2" height="24" rx="1"/><rect x="24" y="11" width="2" height="18" rx="1"/><rect x="28" y="14" width="2" height="12" rx="1"/><rect x="32" y="17" width="2" height="6" rx="1"/></g></svg>
          <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: '3px', color: '#1a1a1a' }}>OTONAMI</span>
        </a>
        <a href="/curator" style={{ padding: '8px 20px', borderRadius: 100, border: `1.5px solid ${THEME.gold}`, color: THEME.gold, textDecoration: 'none', fontSize: 13, fontWeight: 600, fontFamily: THEME.font }}>Join as Curator</a>
      </header>

      {/* Centered card */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)', padding: 24 }}>
        <div className="login-card" style={{ width: '100%', maxWidth: 440, background: THEME.card, borderRadius: 16, padding: '36px 32px', border: `1px solid ${THEME.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>

          {loginStep === 1 ? (
            <>
              <h1 style={{ fontFamily: THEME.fontDisplay, fontSize: 24, fontWeight: 700, color: THEME.text, margin: '0 0 6px', textAlign: 'center' }}>Curator Login</h1>
              <p style={{ textAlign: 'center', color: THEME.textMuted, fontSize: 13, margin: '0 0 24px', fontFamily: THEME.font }}>キュレーターログイン</p>

              <label style={{ fontSize: 13, color: THEME.textSub, fontWeight: 600, display: 'block', fontFamily: THEME.font }}>Email Address <span style={{ fontSize: 11, color: THEME.textMuted, fontWeight: 400 }}>メールアドレス</span></label>
              <input className="login-input" style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" autoComplete="email" />

              <label style={{ fontSize: 13, color: THEME.textSub, fontWeight: 600, display: 'block', marginTop: 20, fontFamily: THEME.font }}>Password <span style={{ fontSize: 11, color: THEME.textMuted, fontWeight: 400 }}>パスワード</span></label>
              <div style={{ position: 'relative' }}>
                <input className="login-input" style={{ ...inp, paddingRight: 48 }} type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" autoComplete="current-password" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                <button onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: THEME.textMuted, fontSize: 13, fontFamily: THEME.font, marginTop: 3 }}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>

              {passwordNotSet && (
                <div style={{ marginTop: 16, padding: '14px 18px', background: 'rgba(196,149,106,0.08)', border: `1px solid rgba(196,149,106,0.25)`, borderRadius: 10 }}>
                  <p style={{ color: THEME.gold, fontSize: 13, margin: '0 0 6px', fontWeight: 700, fontFamily: THEME.font }}>Password not set / パスワード未設定</p>
                  <p style={{ color: THEME.textSub, fontSize: 12, margin: '0 0 12px', lineHeight: 1.6, fontFamily: THEME.font }}>
                    Your account exists but no password has been set yet.<br />
                    <span style={{ color: THEME.textMuted }}>アカウントは存在しますがパスワードが設定されていません。</span>
                  </p>
                  <a href="/curator/set-password" style={{ display: 'inline-block', padding: '8px 18px', background: THEME.gold, borderRadius: 8, color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700, fontFamily: THEME.font }}>Set your password / パスワードを設定する →</a>
                </div>
              )}

              {error && (
                <div style={{ marginTop: 16, textAlign: 'center' }}>
                  <p style={{ color: THEME.coral, fontSize: 13, fontFamily: THEME.font }}>{error}</p>
                  {emailNotVerified && (
                    <div style={{ marginTop: 12 }}>
                      <button onClick={handleResendVerification} disabled={resendVerifyStatus === 'loading'}
                        style={{ padding: '8px 20px', borderRadius: 100, border: `1.5px solid ${THEME.gold}`, background: 'transparent', color: THEME.gold, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: THEME.font }}>
                        {resendVerifyStatus === 'loading' ? 'Sending... / 送信中...' : 'Resend verification / 認証メールを再送信'}
                      </button>
                      {resendVerifyStatus === 'sent' && <p style={{ color: THEME.green, fontSize: 12, marginTop: 8 }}>Verification email sent! / 認証メールを送信しました</p>}
                    </div>
                  )}
                </div>
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
                    Logging in... / ログイン中...
                  </>
                ) : 'Login / ログイン →'}
              </button>

              <p style={{ textAlign: 'center', fontSize: 12, marginTop: 14 }}>
                <a href="/curator/set-password" style={{ color: THEME.textMuted, textDecoration: 'none', fontFamily: THEME.font }}>Forgot password? / パスワードを忘れた方</a>
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '28px 0' }}>
                <div style={{ flex: 1, height: 1, background: THEME.border }} />
                <span style={{ fontSize: 12, color: THEME.textMuted, fontFamily: THEME.font, whiteSpace: 'nowrap' }}>Don&apos;t have an account?</span>
                <div style={{ flex: 1, height: 1, background: THEME.border }} />
              </div>

              <a href="/curator" style={{
                display: 'block', textAlign: 'center', padding: '12px', borderRadius: 100,
                border: `1.5px solid ${THEME.gold}`, color: THEME.gold,
                textDecoration: 'none', fontSize: 14, fontWeight: 600, fontFamily: THEME.font,
              }}>
                Join as Curator / 新規登録 →
              </a>
            </>
          ) : (
            /* OTP Step */
            <>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${THEME.gold}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>🔐</div>
                <h1 style={{ fontFamily: THEME.fontDisplay, fontSize: 20, fontWeight: 700, color: THEME.text, margin: '0 0 8px' }}>Enter verification code</h1>
                <p style={{ fontSize: 14, color: THEME.textSub, lineHeight: 1.6, margin: '0 0 4px' }}>
                  A 6-digit code was sent to {maskedEmail}
                </p>
                <p style={{ fontSize: 12, color: THEME.textMuted, margin: '0 0 28px' }}>
                  認証コードを送信しました
                </p>
              </div>

              {/* OTP inputs */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
                {otpValues.map((val, i) => (
                  <input
                    key={i}
                    ref={el => otpRefs.current[i] = el}
                    className="otp-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]"
                    maxLength={1}
                    value={val}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    onPaste={i === 0 ? handleOtpPaste : undefined}
                    style={{
                      width: 52, height: 60, textAlign: 'center', fontSize: 28,
                      fontWeight: 700, fontFamily: 'monospace',
                      border: `2px solid ${otpError ? '#ef4444' : THEME.gold}`,
                      borderRadius: 12, outline: 'none', background: '#ffffff',
                      color: '#1a1a1a', caretColor: THEME.coral,
                      transition: 'border-color 0.2s',
                    }}
                  />
                ))}
              </div>

              {otpLoading && (
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" style={{ animation: 'spin 1s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" stroke={THEME.gold} strokeWidth="3" fill="none" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                  </svg>
                </div>
              )}

              {otpError && (
                <p style={{ color: '#ef4444', fontSize: 14, fontWeight: 500, textAlign: 'center', marginBottom: 16, marginTop: 12, fontFamily: THEME.font }}>{otpError}</p>
              )}

              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button onClick={handleResendOtp} disabled={resendCooldown > 0}
                  style={{ background: 'none', border: 'none', color: resendCooldown > 0 ? THEME.textMuted : THEME.gold, fontSize: 13, cursor: resendCooldown > 0 ? 'default' : 'pointer', fontFamily: THEME.font, fontWeight: 500 }}>
                  {resendCooldown > 0 ? `Resend code (${resendCooldown}s) / 再送信` : 'Resend code / 認証コードを再送信'}
                </button>
                <button onClick={() => { setLoginStep(1); setOtpValues(['', '', '', '', '', '']); setOtpError(''); }}
                  style={{ background: 'none', border: 'none', color: THEME.textMuted, fontSize: 13, cursor: 'pointer', fontFamily: THEME.font }}>
                  ← Change email / メールアドレスを変更
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
