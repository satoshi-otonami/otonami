"use client";
import { useState, useEffect } from 'react';

const THEME = {
  bg: '#f8f7f4', card: '#ffffff', border: '#e5e2dc',
  text: '#1a1a1a', textSub: '#6b6560', textMuted: '#9b9590',
  gold: '#c4956a', coral: '#e85d3a',
  font: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  fontDisplay: "'Playfair Display', Georgia, serif",
};

export default function VerifyErrorPage() {
  const [type, setType] = useState('artist');
  const [reason, setReason] = useState('');
  const [email, setEmail] = useState('');
  const [showResend, setShowResend] = useState(false);
  const [resendStatus, setResendStatus] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('type') === 'curator') setType('curator');
    setReason(params.get('reason') || '');
  }, []);

  const handleResend = async () => {
    if (!email) return;
    setResendStatus('loading');
    try {
      const res = await fetch('/api/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type }),
      });
      const data = await res.json();
      if (res.status === 429) { setResendStatus('rate_limited'); return; }
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResendStatus('sent');
    } catch (e) {
      setResendStatus('error');
    }
  };

  const loginUrl = type === 'artist' ? '/artist/login' : '/curator';

  return (
    <div style={{ minHeight: '100vh', background: THEME.bg, fontFamily: THEME.font, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <style>{`*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; } body { background: #f8f7f4; } .resend-input:focus { border-color: #c4956a !important; box-shadow: 0 0 0 3px rgba(196,149,106,0.12) !important; }`}</style>
      <div style={{ textAlign: 'center', maxWidth: 440, width: '100%', background: THEME.card, borderRadius: 16, padding: '48px 32px', border: `1px solid ${THEME.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: THEME.coral, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </div>
        <h1 style={{ fontFamily: THEME.fontDisplay, fontSize: 24, fontWeight: 700, color: THEME.text, marginBottom: 12 }}>
          認証リンクが無効です
        </h1>
        <p style={{ fontSize: 14, color: THEME.textSub, lineHeight: 1.7, marginBottom: 24 }}>
          {reason === 'expired' ? 'リンクの有効期限が切れました。認証メールを再送信してください。' : 'リンクの有効期限が切れたか、既に認証済みです。'}
        </p>

        {!showResend ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <button onClick={() => setShowResend(true)} style={{
              padding: '14px 40px', borderRadius: 9999,
              background: THEME.coral, color: '#fff', border: 'none',
              fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: THEME.font,
            }}>
              認証メールを再送信
            </button>
            <a href={loginUrl} style={{ color: THEME.gold, fontSize: 14, textDecoration: 'none', fontFamily: THEME.font }}>
              ログインへ →
            </a>
          </div>
        ) : (
          <div>
            <input className="resend-input" type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="メールアドレスを入力"
              style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: `1px solid ${THEME.border}`, fontSize: 15, outline: 'none', marginBottom: 12, boxSizing: 'border-box', fontFamily: THEME.font }} />
            <button onClick={handleResend} disabled={resendStatus === 'loading'}
              style={{
                width: '100%', padding: '14px', borderRadius: 9999,
                background: resendStatus === 'loading' ? THEME.border : THEME.coral,
                color: '#fff', border: 'none', fontWeight: 700, fontSize: 15,
                cursor: resendStatus === 'loading' ? 'not-allowed' : 'pointer', fontFamily: THEME.font,
              }}>
              {resendStatus === 'loading' ? '送信中...' : '再送信する'}
            </button>
            {resendStatus === 'sent' && <p style={{ color: THEME.green, fontSize: 13, marginTop: 12 }}>認証メールを送信しました。メールをご確認ください。</p>}
            {resendStatus === 'rate_limited' && <p style={{ color: THEME.coral, fontSize: 13, marginTop: 12 }}>60秒後に再度お試しください。</p>}
            {resendStatus === 'error' && <p style={{ color: THEME.coral, fontSize: 13, marginTop: 12 }}>送信に失敗しました。メールアドレスを確認してください。</p>}
            <a href={loginUrl} style={{ display: 'block', marginTop: 16, color: THEME.gold, fontSize: 14, textDecoration: 'none', fontFamily: THEME.font }}>
              ログインへ →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
