'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

/* ── スタイル定数（dashboardと統一） ── */
const S = {
  bg:      '#0a0a18',
  card:    '#13132a',
  cardBorder: '#1e1e3a',
  sub:     '#0d0d20',
  text:    '#ffffff',
  muted:   '#888888',
  dim:     '#555555',
  purple:  '#a78bfa',
  green:   '#4ade80',
  red:     '#f87171',
  yellow:  '#facc15',
};

function renderBody(text) {
  if (!text) return null;
  return text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
    /^https?:\/\//.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer"
          style={{ color: S.purple, wordBreak: 'break-all' }}>{part}</a>
      : part
  );
}

/* ── ログインフォーム ── */
function LoginForm({ pitchId, onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [passwordNotSet, setPasswordNotSet] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setPasswordNotSet(false);
    setLoading(true);
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
      if (!res.ok) { setError(data.error || 'Login failed'); return; }
      localStorage.setItem('curator_token', data.token);
      onLogin(data.curator);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: S.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <a href="/" style={{ fontSize: 22, fontWeight: 900, color: S.purple, textDecoration: 'none', letterSpacing: 2 }}>OTONAMI</a>
          <p style={{ color: S.muted, fontSize: 14, marginTop: 10, lineHeight: 1.6 }}>
            Log in to respond to this pitch.<br />
            <span style={{ fontSize: 12, color: S.dim }}>このピッチに返信するにはログインしてください。</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{
          background: S.card, border: `1px solid ${S.cardBorder}`,
          borderRadius: 16, padding: '28px 24px',
        }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: S.muted, fontSize: 12, fontWeight: 700, marginBottom: 6 }}>EMAIL</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required autoFocus
              style={{
                width: '100%', background: S.sub, border: `1px solid ${S.cardBorder}`,
                borderRadius: 8, color: S.text, fontSize: 14, padding: '10px 12px',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: S.muted, fontSize: 12, fontWeight: 700, marginBottom: 6 }}>PASSWORD</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: '100%', background: S.sub, border: `1px solid ${S.cardBorder}`,
                borderRadius: 8, color: S.text, fontSize: 14, padding: '10px 12px',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          {passwordNotSet && (
            <div style={{ marginBottom: 14, padding: '12px 14px', background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.25)', borderRadius: 10 }}>
              <p style={{ color: '#38bdf8', fontSize: 13, margin: '0 0 8px', fontWeight: 700 }}>Password not set</p>
              <p style={{ color: '#888', fontSize: 12, margin: '0 0 10px', lineHeight: 1.6 }}>
                Your account exists but no password has been set yet.
              </p>
              <a href="/curator/set-password" style={{
                display: 'inline-block', padding: '7px 16px',
                background: 'linear-gradient(135deg,#0ea5e9,#38bdf8)',
                borderRadius: 8, color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 700,
              }}>Set password →</a>
            </div>
          )}
          {error && (
            <div style={{ color: S.red, fontSize: 12, marginBottom: 14, padding: '8px 12px', background: 'rgba(248,113,113,0.1)', borderRadius: 8 }}>
              {error}
            </div>
          )}
          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', padding: '12px', border: 'none', borderRadius: 10,
              background: loading ? '#2a2a4a' : 'linear-gradient(135deg,#7c3aed,#2563eb)',
              color: loading ? S.dim : S.text, fontWeight: 700, fontSize: 15,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >{loading ? 'Logging in...' : 'Log In / ログイン'}</button>
          <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a href="/curator" style={{ color: S.dim, fontSize: 12, textDecoration: 'none' }}>
              No account? Register as curator →
            </a>
            <a href="/curator/set-password" style={{ color: '#555', fontSize: 12, textDecoration: 'none' }}>
              Forgot password? / パスワードを忘れた方
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── ピッチ詳細ビュー ── */
function PitchView({ pitchId, curator }) {
  const [pitch, setPitch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [updating, setUpdating] = useState(false);
  const [done, setDone] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('curator_token');
    fetch(`/api/curator/pitch/${pitchId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else {
          setPitch(d.pitch);
          if (d.pitch.rating) setRating(d.pitch.rating);
          if (d.pitch.feedback) setFeedbackText(d.pitch.feedback);
        }
      })
      .catch(() => setError('Failed to load pitch.'))
      .finally(() => setLoading(false));
  }, [pitchId]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const submit = async (status) => {
    if (feedbackText.trim().length < 20) return;
    const token = localStorage.getItem('curator_token');
    setUpdating(true);
    try {
      const res = await fetch(`/api/curator/pitch/${pitchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, feedback: feedbackText.trim(), rating: rating || undefined }),
      });
      if (!res.ok) { showToast('❌ Failed to submit. Please try again.'); return; }
      setPitch(prev => ({ ...prev, status, feedback: feedbackText.trim(), rating }));
      setDone(true);
      showToast('✅ Feedback submitted!');
    } finally {
      setUpdating(false);
    }
  };

  const card = { background: S.card, border: `1px solid ${S.cardBorder}`, borderRadius: 14, padding: '20px 22px' };

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: S.dim, fontSize: 14 }}>Loading pitch... / 読み込み中...</p>
    </div>
  );

  if (error) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 40 }}>⚠️</div>
      <p style={{ color: S.red, fontSize: 14 }}>{error}</p>
      <a href="/curator/dashboard" style={{ color: S.purple, fontSize: 13 }}>← Go to Dashboard</a>
    </div>
  );

  if (!pitch) return null;

  const alreadyResponded = ['accepted', 'rejected', 'feedback'].includes(pitch.status);
  const validFeedback = feedbackText.trim().length >= 20;
  const canSubmit = validFeedback && !updating && !done;

  const STATUS_COLORS = {
    sent:     { color: S.yellow, bg: 'rgba(250,204,21,0.1)',  label: 'Pending / 未対応' },
    accepted: { color: S.green,  bg: 'rgba(74,222,128,0.1)',  label: 'Accepted / 承認済み' },
    rejected: { color: S.red,    bg: 'rgba(248,113,113,0.1)', label: 'Declined / 却下済み' },
    feedback: { color: S.purple, bg: 'rgba(167,139,250,0.1)', label: 'Feedback Sent / FB送信済み' },
  };
  const st = STATUS_COLORS[pitch.status] || STATUS_COLORS.sent;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 16px 80px' }}>
      {/* Back link */}
      <a href="/curator/dashboard" style={{ color: S.dim, fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
        ← Back to Dashboard
      </a>

      {/* Pitch header card */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#0d0d1f', border: `1px solid ${S.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>🎵</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{ color: S.text, fontWeight: 800, fontSize: 18 }}>
                {pitch.artist_name || 'Unknown Artist'}
              </span>
              {pitch.artist_genre && (
                <span style={{ color: S.dim, fontSize: 13 }}>{pitch.artist_genre}</span>
              )}
              <span style={{
                padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                color: st.color, background: st.bg, border: `1px solid ${st.color}44`,
              }}>{st.label}</span>
            </div>
            {pitch.song_title && (
              <div style={{ color: S.muted, fontSize: 14, marginBottom: 4 }}>
                🎵 &ldquo;{pitch.song_title}&rdquo;
              </div>
            )}
            {pitch.song_link && (
              <a href={pitch.song_link} target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                color: S.purple, fontSize: 13, textDecoration: 'none',
                padding: '4px 10px', background: 'rgba(124,58,237,0.12)',
                borderRadius: 8, border: '1px solid rgba(124,58,237,0.25)',
              }}>
                ▶ Listen to Track
              </a>
            )}
          </div>
          <div style={{ color: S.dim, fontSize: 11, flexShrink: 0 }}>
            {pitch.sent_at
              ? new Date(pitch.sent_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })
              : pitch.created_at
              ? new Date(pitch.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })
              : ''}
          </div>
        </div>
      </div>

      {/* Pitch body */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ color: S.muted, fontSize: 11, fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>PITCH MESSAGE</div>
        {pitch.body ? (
          <pre style={{
            color: '#ccc', fontSize: 13, lineHeight: 1.85,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            margin: 0,
          }}>
            {renderBody(pitch.body)}
          </pre>
        ) : (
          <p style={{ color: S.dim, fontSize: 13, textAlign: 'center', padding: 20 }}>
            Pitch content not available.
          </p>
        )}
      </div>

      {/* Feedback UI */}
      <div style={{ ...card }}>
        <div style={{ color: S.muted, fontSize: 11, fontWeight: 700, marginBottom: 16, letterSpacing: 1 }}>
          YOUR FEEDBACK / フィードバック
        </div>

        {done || (alreadyResponded && pitch.feedback) ? (
          /* 送信済み */
          <div>
            <div style={{ color: S.green, fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
              ✅ Feedback submitted! / フィードバックを送信しました
            </div>
            {pitch.rating > 0 && (
              <div style={{ color: S.yellow, fontSize: 20, marginBottom: 8 }}>
                {'★'.repeat(pitch.rating)}{'☆'.repeat(5 - pitch.rating)}
              </div>
            )}
            {pitch.feedback && (
              <div style={{ color: '#ccc', fontSize: 13, lineHeight: 1.7, background: S.sub, borderRadius: 10, padding: '12px 16px', border: `1px solid ${S.cardBorder}` }}>
                {pitch.feedback}
              </div>
            )}
            <a href="/curator/dashboard" style={{
              display: 'inline-block', marginTop: 16,
              padding: '10px 20px', borderRadius: 10,
              background: 'linear-gradient(135deg,#7c3aed,#2563eb)',
              color: S.text, textDecoration: 'none', fontWeight: 700, fontSize: 13,
            }}>← Back to Dashboard</a>
          </div>
        ) : (
          /* フィードバック入力フォーム */
          <>
            {/* Star rating */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: S.dim, fontSize: 12, marginBottom: 8 }}>Rating (optional)</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {[1,2,3,4,5].map(star => (
                  <button
                    key={star}
                    onClick={() => setRating(star === rating ? 0 : star)}
                    style={{
                      fontSize: 26, background: 'none', border: 'none',
                      cursor: 'pointer', padding: '2px',
                      color: star <= rating ? S.yellow : '#333',
                      filter: star <= rating ? 'none' : 'grayscale(1)',
                    }}
                  >★</button>
                ))}
                {rating > 0 && <span style={{ color: S.yellow, fontSize: 12, marginLeft: 4 }}>{rating}/5</span>}
              </div>
            </div>

            {/* Feedback textarea */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: S.dim, fontSize: 12, marginBottom: 8 }}>
                Comments <span style={{ color: S.red }}>*</span> (min 20 characters / 最低20文字)
              </div>
              <textarea
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
                placeholder="Share your honest thoughts on this track — what works, what doesn't, and whether it fits your audience..."
                rows={5}
                style={{
                  width: '100%', background: S.sub,
                  border: `1px solid ${feedbackText.trim().length > 0 && feedbackText.trim().length < 20 ? S.red : S.cardBorder}`,
                  borderRadius: 10, color: '#ccc', fontSize: 13, lineHeight: 1.7,
                  padding: '12px 14px', resize: 'vertical', fontFamily: 'inherit',
                  boxSizing: 'border-box', outline: 'none',
                }}
              />
              {feedbackText.trim().length > 0 && feedbackText.trim().length < 20 && (
                <div style={{ color: S.red, fontSize: 11, marginTop: 4 }}>
                  {feedbackText.trim().length}/20 characters — {20 - feedbackText.trim().length} more needed
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => submit('accepted')}
                disabled={!canSubmit}
                style={{
                  flex: 1, minWidth: 140, padding: '11px 16px',
                  border: '1px solid rgba(74,222,128,0.3)', borderRadius: 10,
                  background: canSubmit ? 'rgba(74,222,128,0.15)' : 'transparent',
                  color: canSubmit ? S.green : S.dim,
                  fontWeight: 700, fontSize: 13, cursor: canSubmit ? 'pointer' : 'not-allowed',
                }}
              >{updating ? '...' : '✅ Accept + Feedback'}</button>

              <button
                onClick={() => submit('rejected')}
                disabled={!canSubmit}
                style={{
                  flex: 1, minWidth: 140, padding: '11px 16px',
                  border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10,
                  background: canSubmit ? 'rgba(248,113,113,0.1)' : 'transparent',
                  color: canSubmit ? S.red : S.dim,
                  fontWeight: 700, fontSize: 13, cursor: canSubmit ? 'pointer' : 'not-allowed',
                }}
              >{updating ? '...' : '❌ Decline + Feedback'}</button>

              <button
                onClick={() => submit('feedback')}
                disabled={!canSubmit}
                style={{
                  flex: 1, minWidth: 140, padding: '11px 16px',
                  border: `1px solid ${S.cardBorder}`, borderRadius: 10,
                  background: canSubmit ? 'rgba(124,58,237,0.15)' : 'transparent',
                  color: canSubmit ? S.purple : S.dim,
                  fontWeight: 700, fontSize: 13, cursor: canSubmit ? 'pointer' : 'not-allowed',
                }}
              >{updating ? '...' : '💬 Feedback Only'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── メインページ ── */
export default function PitchRespondPage() {
  const { id: pitchId } = useParams();
  const [authState, setAuthState] = useState('loading'); // 'loading' | 'authed' | 'unauthed'
  const [curator, setCurator] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('curator_token') : null;
    if (!token) { setAuthState('unauthed'); return; }

    fetch('/api/curators/login', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setCurator(d.curator); setAuthState('authed'); })
      .catch(() => { localStorage.removeItem('curator_token'); setAuthState('unauthed'); });
  }, []);

  if (authState === 'loading') return (
    <div style={{ minHeight: '100vh', background: S.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: S.dim, fontSize: 14 }}>Loading... / 読み込み中...</p>
    </div>
  );

  if (authState === 'unauthed') return (
    <LoginForm pitchId={pitchId} onLogin={(c) => { setCurator(c); setAuthState('authed'); }} />
  );

  return (
    <div style={{ minHeight: '100vh', background: S.bg, color: S.text }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#1a3a2a', border: '1px solid #4ade80', borderRadius: 10,
          padding: '10px 22px', color: S.green, fontWeight: 700, fontSize: 14,
          zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.4)', whiteSpace: 'nowrap',
        }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{
        background: '#0d0d20', borderBottom: `1px solid ${S.cardBorder}`,
        padding: '14px 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/curator" style={{ fontSize: 17, fontWeight: 900, color: S.purple, textDecoration: 'none', letterSpacing: 2 }}>OTONAMI</a>
          <span style={{ color: '#2a2a4a', fontSize: 16 }}>|</span>
          <span style={{ color: S.text, fontWeight: 700, fontSize: 14 }}>Respond to Pitch</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {curator && (
            <span style={{ color: S.muted, fontSize: 12 }}>{curator.name}</span>
          )}
          <a href="/curator/dashboard" style={{ color: S.dim, fontSize: 12, textDecoration: 'none', padding: '6px 14px', border: `1px solid ${S.cardBorder}`, borderRadius: 8 }}>
            Dashboard
          </a>
          <button
            onClick={() => { localStorage.removeItem('curator_token'); window.location.href = '/curator'; }}
            style={{ background: 'none', border: `1px solid ${S.cardBorder}`, borderRadius: 8, color: S.dim, fontSize: 12, padding: '6px 12px', cursor: 'pointer' }}
          >Logout</button>
        </div>
      </div>

      <PitchView pitchId={pitchId} curator={curator} />
    </div>
  );
}
