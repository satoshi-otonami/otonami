'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { T } from '@/lib/design-tokens';

function renderBody(text) {
  if (!text) return null;
  return text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
    /^https?:\/\//.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer"
          style={{ color: T.accent, wordBreak: 'break-all' }}>{part}</a>
      : part
  );
}

const STATUS_COLORS = {
  sent:     { color: '#92400e', bg: '#fef3c7', label: 'Pending / 未対応' },
  accepted: { color: '#065f46', bg: '#d1fae5', label: 'Accepted / 承認済み' },
  rejected: { color: '#991b1b', bg: '#fee2e2', label: 'Declined / 却下済み' },
  feedback: { color: '#1e40af', bg: '#dbeafe', label: 'Feedback Sent / FB送信済み' },
};

/* ── ログインフォーム ── */
function LoginForm({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordNotSet, setPasswordNotSet] = useState(false);

  const inp = {
    width: '100%', padding: '12px 16px', borderRadius: 8,
    border: `1px solid ${T.border}`, background: T.white, color: T.text,
    fontSize: 14, outline: 'none', marginTop: 6, boxSizing: 'border-box',
    fontFamily: T.font,
  };

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
      minHeight: '100vh', background: T.bg, fontFamily: T.font,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', justifyContent: 'center', marginBottom: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: T.accentGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18 }}>O</div>
            <span style={{ fontFamily: T.fontDisplay, fontSize: 22, fontWeight: 700, color: T.accent }}>OTONAMI</span>
          </a>
          <p style={{ color: T.textSub, fontSize: 14, lineHeight: 1.6, fontFamily: T.font }}>
            Log in to respond to this pitch.<br />
            <span style={{ fontSize: 12, color: T.textMuted }}>このピッチに返信するにはログインしてください。</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{
          background: T.white, border: `1px solid ${T.border}`,
          borderRadius: T.radiusLg, padding: '28px 24px', boxShadow: T.shadow,
        }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: '#374151', fontSize: 13, fontWeight: 500, marginBottom: 6, fontFamily: T.font }}>
              Email Address <span style={{ fontSize: 11, color: T.textMuted, marginLeft: 4 }}>メールアドレス</span>
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required autoFocus style={inp} placeholder="your@email.com"
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: '#374151', fontSize: 13, fontWeight: 500, marginBottom: 6, fontFamily: T.font }}>
              Password <span style={{ fontSize: 11, color: T.textMuted, marginLeft: 4 }}>パスワード</span>
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required style={inp} placeholder="Your password"
            />
          </div>
          {passwordNotSet && (
            <div style={{ marginBottom: 16, padding: '14px 16px', background: T.accentLight, border: `1px solid ${T.accentBorder}`, borderRadius: 10 }}>
              <p style={{ color: T.accent, fontSize: 13, margin: '0 0 6px', fontWeight: 700, fontFamily: T.font }}>Password not set / パスワード未設定</p>
              <p style={{ color: T.textSub, fontSize: 12, margin: '0 0 10px', lineHeight: 1.6, fontFamily: T.font }}>
                Your account exists but no password has been set yet.
              </p>
              <a href="/curator/set-password" style={{
                display: 'inline-block', padding: '7px 16px',
                background: T.accent,
                borderRadius: 8, color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 700,
              }}>Set password →</a>
            </div>
          )}
          {error && (
            <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 14, padding: '8px 12px', background: '#fef2f2', borderRadius: 8, fontFamily: T.font }}>
              {error}
            </div>
          )}
          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', padding: '13px', border: 'none', borderRadius: 10, height: 48,
              background: loading ? T.border : T.accent,
              color: '#fff', fontWeight: 700, fontSize: 15,
              cursor: loading ? 'not-allowed' : 'pointer', fontFamily: T.font,
              transition: 'background 0.15s',
            }}
          >{loading ? 'Logging in...' : 'Log In / ログイン'}</button>
          <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a href="/curator" style={{ color: T.textMuted, fontSize: 12, textDecoration: 'none', fontFamily: T.font }}>
              No account? Register as curator →
            </a>
            <a href="/curator/set-password" style={{ color: T.textMuted, fontSize: 12, textDecoration: 'none', fontFamily: T.font }}>
              Forgot password? / パスワードを忘れた方
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── ピッチ詳細ビュー ── */
function PitchView({ pitchId }) {
  const [pitch, setPitch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [featured, setFeatured] = useState(false);
  const [placementPlatform, setPlacementPlatform] = useState('');
  const [placementUrl, setPlacementUrl] = useState('');
  const [placementDate, setPlacementDate] = useState(new Date().toISOString().slice(0, 10));
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
          if (d.pitch.feedback_message) setFeedbackText(d.pitch.feedback_message);
        }
      })
      .catch(() => setError('Failed to load pitch.'))
      .finally(() => setLoading(false));
  }, [pitchId]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const submit = async (status) => {
    if (feedbackText.trim().length < 20) return;
    if (status === 'accepted' && featured && !placementUrl.trim()) return;
    const token = localStorage.getItem('curator_token');
    setUpdating(true);
    try {
      const body = { status, feedback_message: feedbackText.trim() };
      if (status === 'accepted' && featured && placementUrl.trim()) {
        body.placement_url = placementUrl.trim();
        body.placement_platform = placementPlatform || 'Other';
        body.placement_date = placementDate;
      }
      const res = await fetch(`/api/curator/pitch/${pitchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) { showToast('❌ Failed to submit. Please try again.'); return; }
      setPitch(prev => ({ ...prev, status, feedback_message: feedbackText.trim(), placement_url: body.placement_url, placement_platform: body.placement_platform }));
      setDone(true);
      showToast('✅ Feedback submitted!');
    } finally {
      setUpdating(false);
    }
  };

  const fbInp = {
    width: '100%', background: T.white, border: `1px solid ${T.border}`,
    borderRadius: 8, color: T.text, fontSize: 13, padding: '10px 12px',
    outline: 'none', fontFamily: T.font, boxSizing: 'border-box',
  };

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: T.textMuted, fontSize: 14, fontFamily: T.font }}>Loading pitch... / 読み込み中...</p>
    </div>
  );

  if (error) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 40 }}>⚠️</div>
      <p style={{ color: '#ef4444', fontSize: 14, fontFamily: T.font }}>{error}</p>
      <a href="/curator/dashboard" style={{ color: T.accent, fontSize: 13, fontFamily: T.font }}>← Go to Dashboard</a>
    </div>
  );

  if (!pitch) return null;

  const alreadyResponded = ['accepted', 'rejected', 'feedback'].includes(pitch.status);
  const validFeedback = feedbackText.trim().length >= 20;
  const canSubmit = validFeedback && !updating && !done;
  const st = STATUS_COLORS[pitch.status] || STATUS_COLORS.sent;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 16px 80px' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: T.white, border: '1px solid #bbf7d0', borderRadius: 10,
          padding: '10px 22px', color: '#065f46', fontWeight: 700, fontSize: 14,
          zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', whiteSpace: 'nowrap',
          fontFamily: T.font,
        }}>{toast}</div>
      )}

      {/* Back link */}
      <a href="/curator/dashboard" style={{ color: T.textSub, fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24, fontFamily: T.font }}>
        ← Back to Dashboard
      </a>

      {/* Pitch header card */}
      <div style={{
        background: T.white, border: `1px solid ${T.border}`, borderRadius: T.radiusLg,
        padding: '20px 22px', marginBottom: 14, boxShadow: T.shadow,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: T.accentLight, border: `1px solid ${T.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>🎵</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{ color: T.text, fontWeight: 800, fontSize: 18, fontFamily: T.font }}>
                {pitch.artist_name || 'Unknown Artist'}
              </span>
              {pitch.artist_genre && (
                <span style={{ color: T.textMuted, fontSize: 13, fontFamily: T.font }}>{pitch.artist_genre}</span>
              )}
              <span style={{
                padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                color: st.color, background: st.bg, fontFamily: T.font,
              }}>{st.label}</span>
            </div>
            {pitch.song_title && (
              <div style={{ color: T.textSub, fontSize: 14, marginBottom: 6, fontFamily: T.font }}>
                🎵 &ldquo;{pitch.song_title}&rdquo;
              </div>
            )}
            {pitch.song_link && (
              <a href={pitch.song_link} target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                color: T.accent, fontSize: 13, textDecoration: 'none',
                padding: '5px 12px', background: T.accentLight,
                borderRadius: 8, border: `1px solid ${T.accentBorder}`,
                fontFamily: T.font,
              }}>
                ▶ Listen to Track
              </a>
            )}
          </div>
          <div style={{ color: T.textMuted, fontSize: 11, flexShrink: 0, fontFamily: T.font }}>
            {pitch.sent_at
              ? new Date(pitch.sent_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })
              : pitch.created_at
              ? new Date(pitch.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })
              : ''}
          </div>
        </div>
      </div>

      {/* Pitch body */}
      <div style={{
        background: T.white, border: `1px solid ${T.border}`, borderRadius: T.radiusLg,
        padding: '20px 22px', marginBottom: 14, boxShadow: T.shadow,
      }}>
        <div style={{ color: T.textSub, fontSize: 11, fontWeight: 700, marginBottom: 12, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: T.font }}>Pitch Message</div>
        {pitch.body ? (
          <pre style={{
            color: '#374151', fontSize: 13, lineHeight: 1.85,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            fontFamily: T.font, margin: 0,
          }}>
            {renderBody(pitch.body)}
          </pre>
        ) : (
          <p style={{ color: T.textMuted, fontSize: 13, textAlign: 'center', padding: 20, fontFamily: T.font }}>
            Pitch content not available.
          </p>
        )}
      </div>

      {/* Feedback UI */}
      <div style={{
        background: T.white, border: `1px solid ${T.border}`, borderRadius: T.radiusLg,
        padding: '20px 22px', boxShadow: T.shadow,
      }}>
        <div style={{ color: T.textSub, fontSize: 11, fontWeight: 700, marginBottom: 16, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: T.font }}>
          Your Feedback / フィードバック
        </div>

        {done || (alreadyResponded && pitch.feedback_message) ? (
          /* 送信済み */
          <div>
            <div style={{ color: '#065f46', fontWeight: 700, fontSize: 15, marginBottom: 12, fontFamily: T.font }}>
              ✅ Feedback submitted! / フィードバックを送信しました
            </div>
            {pitch.feedback_message && (
              <div style={{ color: T.textSub, fontSize: 13, lineHeight: 1.7, background: T.bg, borderRadius: 10, padding: '12px 16px', border: `1px solid ${T.border}`, marginBottom: 10, fontFamily: T.font }}>
                {pitch.feedback_message}
              </div>
            )}
            {pitch.placement_url && (
              <div style={{ padding: '10px 14px', background: T.accentLight, border: `1px solid ${T.accentBorder}`, borderRadius: 10, marginBottom: 10 }}>
                <div style={{ color: T.accent, fontSize: 11, fontWeight: 700, marginBottom: 4, fontFamily: T.font }}>
                  {pitch.placement_platform || 'Placement'} — Placement URL
                </div>
                <a href={pitch.placement_url} target="_blank" rel="noopener noreferrer" style={{ color: T.accent, fontSize: 13, wordBreak: 'break-all', fontFamily: T.font }}>
                  {pitch.placement_url}
                </a>
              </div>
            )}
            <a href="/curator/dashboard" style={{
              display: 'inline-block', marginTop: 6,
              padding: '10px 20px', borderRadius: 10,
              background: T.accentGrad,
              color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 13,
              fontFamily: T.font,
            }}>← Back to Dashboard</a>
          </div>
        ) : (
          /* フィードバック入力フォーム */
          <>
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: T.textSub, fontSize: 12, marginBottom: 8, fontFamily: T.font }}>
                Comments <span style={{ color: '#ef4444' }}>*</span>
                <span style={{ color: T.textMuted, marginLeft: 4 }}>(min 20 characters / 最低20文字)</span>
              </div>
              <textarea
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
                placeholder="Share your honest thoughts on this track — what works, what doesn't, and whether it fits your audience..."
                rows={5}
                style={{
                  ...fbInp,
                  border: `1px solid ${feedbackText.trim().length > 0 && feedbackText.trim().length < 20 ? '#ef4444' : T.border}`,
                  resize: 'vertical', lineHeight: 1.7,
                }}
              />
              {feedbackText.trim().length > 0 && feedbackText.trim().length < 20 && (
                <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4, fontFamily: T.font }}>
                  {feedbackText.trim().length}/20 characters — {20 - feedbackText.trim().length} more needed
                </div>
              )}
            </div>

            {/* Placement section */}
            <div style={{ marginBottom: 16, padding: '12px 14px', background: T.accentLight, border: `1px solid ${T.accentBorder}`, borderRadius: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={e => setFeatured(e.target.checked)}
                  style={{ accentColor: T.accent, width: 15, height: 15 }}
                />
                <span style={{ color: T.accent, fontSize: 13, fontWeight: 700, fontFamily: T.font }}>
                  Yes, I featured this track / はい、紹介しました
                </span>
              </label>
              {featured && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <select
                    value={placementPlatform}
                    onChange={e => setPlacementPlatform(e.target.value)}
                    style={fbInp}
                  >
                    <option value="">Platform / プラットフォーム...</option>
                    <option value="Spotify Playlist">Spotify Playlist</option>
                    <option value="Blog">Blog</option>
                    <option value="YouTube">YouTube</option>
                    <option value="Radio">Radio</option>
                    <option value="Other">Other</option>
                  </select>
                  <input
                    type="url"
                    value={placementUrl}
                    onChange={e => setPlacementUrl(e.target.value)}
                    placeholder="https://open.spotify.com/playlist/... *required"
                    style={{
                      ...fbInp,
                      border: `1px solid ${featured && !placementUrl.trim() ? '#ef4444' : T.accent}`,
                    }}
                  />
                  {featured && !placementUrl.trim() && (
                    <div style={{ color: '#ef4444', fontSize: 11, fontFamily: T.font }}>URL is required when accepting as featured / URLは必須です</div>
                  )}
                  <input
                    type="date"
                    value={placementDate}
                    onChange={e => setPlacementDate(e.target.value)}
                    style={fbInp}
                  />
                </div>
              )}
            </div>

            {/* Action buttons */}
            {(() => {
              const canAccept = canSubmit && (!featured || placementUrl.trim().length > 0);
              return (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => submit('accepted')}
                    disabled={!canAccept}
                    style={{
                      flex: 1, minWidth: 140, padding: '11px 16px',
                      border: 'none', borderRadius: 10,
                      background: canAccept ? '#10b981' : T.border,
                      color: '#fff',
                      fontWeight: 700, fontSize: 13, cursor: canAccept ? 'pointer' : 'not-allowed',
                      fontFamily: T.font, transition: 'background 0.15s',
                    }}
                  >{updating ? '...' : '✅ Accept & Featured'}</button>

                  <button
                    onClick={() => submit('feedback')}
                    disabled={!canSubmit}
                    style={{
                      flex: 1, minWidth: 140, padding: '11px 16px',
                      border: 'none', borderRadius: 10,
                      background: canSubmit ? T.accent : T.border,
                      color: '#fff',
                      fontWeight: 700, fontSize: 13, cursor: canSubmit ? 'pointer' : 'not-allowed',
                      fontFamily: T.font, transition: 'background 0.15s',
                    }}
                  >{updating ? '...' : '💬 Feedback Only'}</button>

                  <button
                    onClick={() => submit('rejected')}
                    disabled={!canSubmit}
                    style={{
                      flex: 1, minWidth: 140, padding: '11px 16px',
                      border: `1px solid ${canSubmit ? '#ef4444' : T.border}`, borderRadius: 10,
                      background: T.white,
                      color: canSubmit ? '#ef4444' : T.textMuted,
                      fontWeight: 700, fontSize: 13, cursor: canSubmit ? 'pointer' : 'not-allowed',
                      fontFamily: T.font, transition: 'all 0.15s',
                    }}
                  >{updating ? '...' : '❌ Decline'}</button>
                </div>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}

/* ── メインページ ── */
export default function PitchRespondPage() {
  const { id: pitchId } = useParams();
  const [authState, setAuthState] = useState('loading');
  const [curator, setCurator] = useState(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('curator_token') : null;
    if (!token) { setAuthState('unauthed'); return; }

    fetch('/api/curators/login', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setCurator(d.curator); setAuthState('authed'); })
      .catch(() => { localStorage.removeItem('curator_token'); setAuthState('unauthed'); });
  }, []);

  if (authState === 'loading') return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: T.textMuted, fontSize: 14, fontFamily: T.font }}>Loading... / 読み込み中...</p>
    </div>
  );

  if (authState === 'unauthed') return (
    <LoginForm onLogin={(c) => { setCurator(c); setAuthState('authed'); }} />
  );

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: T.font }}>
      <style>{`*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }`}</style>

      {/* ── Header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${T.border}`,
        padding: '0 24px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontFamily: T.font,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: T.accentGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 17 }}>O</div>
            <span style={{ fontFamily: T.fontDisplay, fontSize: 20, fontWeight: 700, color: T.accent, letterSpacing: -0.3 }}>OTONAMI</span>
          </a>
          <span style={{ color: T.border, fontSize: 20 }}>|</span>
          <span style={{ color: T.text, fontWeight: 700, fontSize: 14, fontFamily: T.font }}>Respond to Pitch</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {curator && (
            <span style={{ color: T.textSub, fontSize: 12, fontFamily: T.font }}>{curator.name}</span>
          )}
          <a href="/curator/dashboard" style={{
            color: T.textSub, fontSize: 12, textDecoration: 'none',
            padding: '6px 14px', border: `1px solid ${T.border}`, borderRadius: 8,
            fontFamily: T.font, transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSub; }}
          >Dashboard</a>
          <button
            onClick={() => { localStorage.removeItem('curator_token'); window.location.href = '/curator'; }}
            style={{
              background: 'none', border: `1px solid ${T.border}`, borderRadius: 8,
              color: T.textSub, fontSize: 12, padding: '6px 12px', cursor: 'pointer',
              fontFamily: T.font, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSub; }}
          >Logout</button>
        </div>
      </header>

      <PitchView pitchId={pitchId} />

      {/* ── Footer ── */}
      <footer style={{
        padding: '32px 24px', background: T.white, borderTop: `1px solid ${T.border}`,
        textAlign: 'center', fontFamily: T.font, fontSize: 13, color: T.textMuted,
      }}>
        <span>OTONAMI — Connecting Japanese Music to the World</span>
        <span style={{ margin: '0 8px' }}>·</span>
        <span>TYCompany LLC / ILCJ</span>
      </footer>
    </div>
  );
}
