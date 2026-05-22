'use client';
import React from 'react';

// React error boundaries must be class components — there is no hook
// equivalent for getDerivedStateFromError / componentDidCatch. This is the
// documented exception to the "functional components only" rule.
//
// Without a boundary, any render-time throw in OtonamiApp (e.g. a transient
// hydration mismatch on the first /studio mount) unmounts the entire React
// tree and leaves a blank page with no header. This boundary catches that and
// renders a recoverable fallback instead.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Log message + component stack only — never the full error object, which
    // could contain user data (security rule: do not log sensitive values).
    console.error('[OTONAMI ErrorBoundary]', error?.message, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#f8f7f4', padding: '24px', fontFamily: "'DM Sans', sans-serif",
        }}>
          <div style={{
            maxWidth: 420, width: '100%', textAlign: 'center', background: '#ffffff',
            border: '1px solid #e5e2dc', borderRadius: 16, padding: '32px 24px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>⚠️</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', margin: '0 0 8px' }}>
              読み込みに問題が発生しました
            </h2>
            <p style={{ fontSize: 14, color: '#6b6560', lineHeight: 1.7, margin: '0 0 20px' }}>
              一時的なエラーの可能性があります。再読み込みをお試しください。<br />
              <span style={{ fontSize: 12, color: '#9a958e' }}>
                A temporary error occurred. Please reload.
              </span>
            </p>
            <button
              onClick={() => { if (typeof window !== 'undefined') window.location.reload(); }}
              style={{
                background: '#c4956a', color: '#fff', border: 'none', borderRadius: 10,
                padding: '12px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              再読み込み / Reload
            </button>
            <div style={{ marginTop: 16 }}>
              <a href="/artist/dashboard" style={{ fontSize: 13, color: '#c4956a', textDecoration: 'none' }}>
                ダッシュボードに戻る →
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
