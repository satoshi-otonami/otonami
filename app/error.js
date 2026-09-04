'use client';

import { useEffect } from 'react';

// Route-level error boundary. Deliberately small: a 500 is not the place for
// a joke that lands badly, so the tone stays light but the recovery is first.
export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('[app] route error boundary:', error);
  }, [error]);

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#0f0f1a',
        color: '#f0ede6',
        fontFamily: "'DM Sans', -apple-system, sans-serif",
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
      }}
    >
      <div style={{ maxWidth: 460, width: '100%', textAlign: 'center' }}>
        <p style={{ fontSize: 12, letterSpacing: '3px', textTransform: 'uppercase', color: '#c4956a', marginBottom: 14 }}>
          Error
        </p>
        <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 26, fontWeight: 700, lineHeight: 1.4, margin: '0 0 14px' }}>
          音が途切れました。
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.8, color: 'rgba(240,237,230,0.72)', margin: '0 0 28px' }}>
          こちら側の問題です。もう一度読み込むと、たいていは元に戻ります。
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button type="button" onClick={() => reset()} className="err-btn err-btn-primary">
            もう一度読み込む
          </button>
          <a href="/" className="err-btn">トップに戻る</a>
        </div>
      </div>

      <style>{`
        .err-btn {
          display: block;
          width: 100%;
          padding: 14px 24px;
          border-radius: 9999px;
          border: 1px solid rgba(240,237,230,0.18);
          background: transparent;
          color: #f0ede6;
          font-family: inherit;
          font-size: 15px;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: background var(--t-ui, 0.12s) var(--t-ui-ease, ease),
                      border-color var(--t-ui, 0.12s) var(--t-ui-ease, ease);
        }
        .err-btn:hover { background: rgba(240,237,230,0.08); border-color: rgba(240,237,230,0.38); }
        .err-btn-primary { background: #c4956a; border-color: #c4956a; color: #fff; }
        .err-btn-primary:hover { background: #b8845e; border-color: #b8845e; }
      `}</style>
    </main>
  );
}
