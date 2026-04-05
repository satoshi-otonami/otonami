"use client";
import { useEffect, useState } from 'react';

const THEME = {
  bg: '#f8f7f4', card: '#ffffff', border: '#e5e2dc',
  text: '#1a1a1a', textSub: '#6b6560', textMuted: '#9b9590',
  gold: '#c4956a', coral: '#e85d3a', green: '#10b981',
  font: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  fontDisplay: "'Playfair Display', Georgia, serif",
};

export default function VerifySuccessPage() {
  const [type, setType] = useState('artist');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('type') === 'curator') setType('curator');
  }, []);

  const loginUrl = type === 'artist' ? '/artist/login' : '/curator';

  return (
    <div style={{ minHeight: '100vh', background: THEME.bg, fontFamily: THEME.font, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <style>{`*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; } body { background: #f8f7f4; }`}</style>
      <div style={{ textAlign: 'center', maxWidth: 440, width: '100%', background: THEME.card, borderRadius: 16, padding: '48px 32px', border: `1px solid ${THEME.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: THEME.green, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
        <h1 style={{ fontFamily: THEME.fontDisplay, fontSize: 24, fontWeight: 700, color: THEME.text, marginBottom: 4 }}>
          メール認証が完了しました！
        </h1>
        <p style={{ fontSize: 16, color: THEME.textSub, marginBottom: 12 }}>Email Verified!</p>
        <p style={{ fontSize: 14, color: THEME.textSub, lineHeight: 1.7, marginBottom: 4 }}>
          アカウントが有効になりました。ログインして始めましょう。
        </p>
        <p style={{ fontSize: 13, color: THEME.textMuted, lineHeight: 1.7, marginBottom: 32 }}>
          Your account is now active. Log in to get started.
        </p>
        <a href={loginUrl} style={{
          display: 'inline-block', padding: '14px 40px', borderRadius: 9999,
          background: THEME.coral, color: '#fff', textDecoration: 'none',
          fontWeight: 700, fontSize: 15, fontFamily: THEME.font,
        }}>
          ログインへ / Login →
        </a>
      </div>
    </div>
  );
}
