"use client";
import { useState, useEffect } from 'react';
import { T } from '@/lib/design-tokens';

const STATUS_LABELS = {
  sent:     { en: 'Pending',  ja: '未対応',  color: '#92400e', bg: '#fef3c7' },
  accepted: { en: 'Accepted', ja: '承認済み', color: '#065f46', bg: '#d1fae5' },
  rejected: { en: 'Declined', ja: '却下済み', color: '#991b1b', bg: '#fee2e2' },
  feedback: { en: 'Feedback', ja: 'FB受信',   color: '#1e40af', bg: '#dbeafe' },
};

const FILTER_TABS = [
  { key: 'all',      en: 'All',      ja: 'すべて' },
  { key: 'sent',     en: 'Pending',  ja: '未対応' },
  { key: 'accepted', en: 'Accepted', ja: '承認' },
  { key: 'rejected', en: 'Rejected', ja: '却下' },
];

export default function CuratorDashboard() {
  const [curator, setCurator] = useState(null);
  const [pitches, setPitches] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [feedbackDraft, setFeedbackDraft] = useState({});
  const [toast, setToast] = useState('');

  // ── 認証 + 初期データ取得 ──
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('curator_token') : null;
    if (!token) {
      setAuthError('not_logged_in');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch('/api/curators/login', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setAuthError('invalid_token');
          setLoading(false);
          return;
        }
        const { curator: c } = await res.json();
        setCurator(c);

        const pr = await fetch('/api/curator/dashboard', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const { pitches: p } = await pr.json();
        setPitches(p || []);
      } catch {
        setAuthError('error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // フィルター変更時にピッチ再取得
  useEffect(() => {
    if (!curator) return;
    const token = localStorage.getItem('curator_token');
    const url = filter === 'all'
      ? '/api/curator/dashboard'
      : `/api/curator/dashboard?status=${filter}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setPitches(d.pitches || []));
  }, [filter, curator]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAction = async (pitchId, status) => {
    const token = localStorage.getItem('curator_token');
    const draft = feedbackDraft[pitchId] || {};
    setUpdating(pitchId);
    try {
      const body = { pitchId, status };
      if (draft.text?.trim()) body.feedback_message = draft.text.trim();
      if (status === 'accepted' && draft.featured && draft.url?.trim()) {
        body.placement_url = draft.url.trim();
        body.placement_platform = draft.platform || 'Other';
        body.placement_date = draft.date || new Date().toISOString().slice(0, 10);
      }
      const res = await fetch('/api/curator/dashboard', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) return;
      setPitches(prev => prev.map(p => p.id === pitchId ? {
        ...p, status,
        feedback_message: body.feedback_message,
        placement_url: body.placement_url,
        placement_platform: body.placement_platform,
      } : p));
      setFeedbackDraft(prev => { const n = {...prev}; delete n[pitchId]; return n; });
      showToast('✅ Feedback submitted');
    } finally {
      setUpdating(null);
    }
  };

  const handleFeedbackOnly = async (pitchId) => {
    const draft = feedbackDraft[pitchId] || {};
    if (!draft.text?.trim()) return;
    await handleAction(pitchId, 'feedback');
  };

  const setDraft = (pitchId, key, val) =>
    setFeedbackDraft(prev => ({ ...prev, [pitchId]: { ...(prev[pitchId] || {}), [key]: val } }));

  const handleLogout = () => {
    localStorage.removeItem('curator_token');
    window.location.href = '/curator';
  };

  // Render pitch body with clickable URLs
  const renderBody = (text) => {
    if (!text) return null;
    const parts = text.split(/(https?:\/\/[^\s]+)/g);
    return parts.map((part, i) =>
      /^https?:\/\//.test(part)
        ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: T.accent, wordBreak: 'break-all' }}>{part}</a>
        : part
    );
  };

  // ── 未ログイン画面 ──
  if (!loading && (authError === 'not_logged_in' || authError === 'invalid_token')) return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 10, color: T.text, fontFamily: T.fontDisplay }}>
          Login Required
        </h1>
        <p style={{ color: T.textSub, fontSize: 14, lineHeight: 1.8, marginBottom: 28, fontFamily: T.font }}>
          Please log in to access the curator dashboard.<br />
          <span style={{ color: T.textMuted, fontSize: 12 }}>ダッシュボードにアクセスするにはログインしてください。</span>
        </p>
        <a href="/curator" style={{
          display: 'inline-block', padding: '13px 32px',
          background: T.accentGrad,
          borderRadius: 24, color: '#fff', textDecoration: 'none', fontWeight: 700,
          fontFamily: T.font,
        }}>Go to Login / ログイン →</a>
      </div>
    </div>
  );

  // ── ローディング ──
  if (loading) return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex',
                  alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: T.textMuted, fontSize: 14, fontFamily: T.font }}>Loading... / 読み込み中...</p>
    </div>
  );

  // ── エラー ──
  if (authError === 'error') return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex',
                  alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#ef4444', fontSize: 14, fontFamily: T.font }}>Something went wrong. Please try again.</p>
    </div>
  );

  const filteredPitches = pitches;
  const counts = {
    all: pitches.length,
    sent: pitches.filter(p => p.status === 'sent').length,
    accepted: pitches.filter(p => p.status === 'accepted').length,
    rejected: pitches.filter(p => p.status === 'rejected').length,
  };

  // Shared input style for feedback area
  const fbInp = {
    width: '100%', background: T.white, border: `1px solid ${T.border}`,
    borderRadius: 8, color: T.text, fontSize: 13, padding: '9px 12px',
    outline: 'none', fontFamily: T.font, boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: T.font }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${T.bg}; overflow-x: hidden; }

        .pitch-card { transition: box-shadow 0.2s, transform 0.2s; }
        .pitch-card:hover { box-shadow: 0 4px 16px rgba(14,165,233,0.08), 0 2px 8px rgba(0,0,0,0.06) !important; transform: translateY(-1px); }

        .dash-tab-btn { transition: all 0.2s; }
        .dash-tab-btn:hover { color: ${T.accent} !important; }

        .fb-input:focus { border-color: ${T.accent} !important; box-shadow: 0 0 0 3px rgba(14,165,233,0.1) !important; outline: none !important; }

        @media (max-width: 768px) {
          .dash-header { padding: 0 16px !important; }
          .profile-card { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; }
          .stats-row { flex-direction: row !important; gap: 16px !important; }
          .pitch-header { flex-wrap: wrap !important; }
          .pitch-actions { flex-wrap: wrap !important; margin-top: 8px !important; }
          .action-btns-row { flex-wrap: wrap !important; }
        }
      `}</style>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: T.white, border: `1px solid #bbf7d0`, borderRadius: 10,
          padding: '10px 22px', color: '#065f46', fontWeight: 700, fontSize: 14,
          zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontFamily: T.font,
        }}>{toast}</div>
      )}

      {/* ── Header ── */}
      <header className="dash-header" style={{
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
          <span style={{ color: T.text, fontWeight: 700, fontSize: 14 }}>Curator Dashboard</span>
          <span style={{ color: T.textMuted, fontSize: 12 }}>キュレーターダッシュボード</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {curator && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: T.text, fontSize: 13, fontWeight: 700 }}>{curator.name}</div>
              <div style={{ color: T.textMuted, fontSize: 11 }}>{curator.email}</div>
            </div>
          )}
          <button onClick={handleLogout} style={{
            padding: '7px 16px', border: `1px solid ${T.border}`,
            borderRadius: 8, background: T.white, color: T.textSub,
            fontSize: 12, cursor: 'pointer', fontFamily: T.font,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSub; }}
          >Logout</button>
        </div>
      </header>

      <div style={{ maxWidth: 780, margin: '0 auto', padding: '32px 16px 96px' }}>

        {/* ── プロフィールカード ── */}
        {curator && (
          <div className="profile-card" style={{
            background: T.white, border: `1px solid ${T.border}`, borderRadius: T.radiusLg,
            padding: '20px 24px', marginBottom: 28, boxShadow: T.shadow,
            display: 'flex', gap: 20, alignItems: 'center',
          }}>
            {curator.icon_url ? (
              <img src={curator.icon_url} alt={curator.name} style={{
                width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                objectFit: 'cover', border: `1px solid ${T.border}`,
              }} />
            ) : (
              <div style={{
                width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                background: T.accentGrad,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22,
              }}>
                {curator.icon || '🎵'}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: T.text, fontWeight: 800, fontSize: 17, fontFamily: T.font }}>{curator.name}</div>
              <div style={{ color: T.textSub, fontSize: 13, marginTop: 2, fontFamily: T.font }}>
                {curator.playlist || curator.type}
                {curator.region && <span style={{ color: T.textMuted, marginLeft: 8 }}>· {curator.region}</span>}
              </div>
              {curator.bio && (
                <div style={{ color: T.textSub, fontSize: 12, marginTop: 6, lineHeight: 1.5, fontFamily: T.font, maxWidth: 400 }}>
                  {curator.bio}
                </div>
              )}
              {curator.genres?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                  {curator.genres.slice(0, 6).map(g => (
                    <span key={g} style={{
                      padding: '2px 9px', borderRadius: 12, fontSize: 11,
                      background: T.accentLight, color: T.accent,
                      border: `1px solid ${T.accentBorder}`,
                      fontFamily: T.font,
                    }}>{g}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="stats-row" style={{ display: 'flex', gap: 24, textAlign: 'center', flexShrink: 0 }}>
              {[
                { label: 'Total', ja: '合計', val: counts.all, color: T.text },
                { label: 'Pending', ja: '未対応', val: counts.sent, color: '#eab308' },
                { label: 'Accepted', ja: '承認', val: counts.accepted, color: '#10b981' },
                { label: 'Rejected', ja: '却下', val: counts.rejected, color: '#ef4444' },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: T.fontDisplay }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: T.textMuted, lineHeight: 1.4, fontFamily: T.font }}>{s.label}<br />{s.ja}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── フィルタータブ ── */}
        <div style={{
          display: 'flex', marginBottom: 24,
          borderBottom: `2px solid ${T.border}`,
        }}>
          {FILTER_TABS.map(t => {
            const cnt = t.key === 'all' ? null : counts[t.key];
            const isActive = filter === t.key;
            return (
              <button key={t.key} onClick={() => setFilter(t.key)} className="dash-tab-btn" style={{
                flex: 1, padding: '11px 8px', border: 'none', background: 'transparent',
                cursor: 'pointer', fontWeight: isActive ? 700 : 500, fontSize: 13,
                color: isActive ? T.accent : T.textSub,
                borderBottom: isActive ? `2px solid ${T.accent}` : '2px solid transparent',
                marginBottom: -2, fontFamily: T.font,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <span>{t.en}<span style={{ fontSize: 10, fontWeight: 400, color: isActive ? T.accent : T.textMuted, marginLeft: 3 }}>/ {t.ja}</span></span>
                {cnt != null && cnt > 0 && (
                  <span style={{
                    background: isActive ? T.accent : T.border,
                    color: isActive ? '#fff' : T.textSub,
                    borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700,
                    fontFamily: T.font,
                  }}>{cnt}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── ピッチ一覧 ── */}
        {filteredPitches.length === 0 ? (
          <div style={{
            background: T.white, border: `1px solid ${T.border}`, borderRadius: T.radiusLg,
            textAlign: 'center', padding: '48px 24px', boxShadow: T.shadow,
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <p style={{ color: T.textMuted, fontSize: 14, fontFamily: T.font }}>
              No pitches yet. / まだピッチはありません。
            </p>
          </div>
        ) : (
          filteredPitches.map(pitch => {
            const s = STATUS_LABELS[pitch.status] || STATUS_LABELS.sent;
            const isExpanded = expanded === pitch.id;
            const isBusy = updating === pitch.id;

            return (
              <div key={pitch.id} className="pitch-card" style={{
                background: T.white, border: `1px solid ${T.border}`,
                borderRadius: 12, padding: '18px 20px', marginBottom: 12,
                boxShadow: T.shadow,
              }}>
                {/* ── ピッチヘッダー ── */}
                <div className="pitch-header" style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                    background: T.accentLight, border: `1px solid ${T.accentBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                  }}>🎵</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ color: T.text, fontWeight: 700, fontSize: 15, fontFamily: T.font }}>
                        {pitch.artist_name || 'Unknown Artist'}
                      </span>
                      {pitch.artist_genre && (
                        <span style={{ color: T.textMuted, fontSize: 12, fontFamily: T.font }}>{pitch.artist_genre}</span>
                      )}
                      <span style={{
                        padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                        color: s.color, background: s.bg, fontFamily: T.font,
                      }}>{s.en} / {s.ja}</span>
                    </div>
                    <div style={{
                      color: '#374151', fontSize: 13, marginTop: 4,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      fontFamily: T.font,
                    }}>
                      {pitch.subject || '(no subject)'}
                    </div>
                    <div style={{ color: T.textMuted, fontSize: 11, marginTop: 4, fontFamily: T.font }}>
                      {pitch.sent_at
                        ? new Date(pitch.sent_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })
                        : pitch.created_at
                        ? new Date(pitch.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })
                        : ''}
                    </div>
                  </div>

                  {/* ── アクションボタン ── */}
                  <div className="pitch-actions" style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                    <button
                      onClick={() => setExpanded(isExpanded ? null : pitch.id)}
                      style={{
                        padding: '7px 14px', border: `1px solid ${T.accent}`,
                        borderRadius: 8, background: T.white,
                        color: T.accent, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', fontFamily: T.font,
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = T.accentLight; }}
                      onMouseLeave={e => { e.currentTarget.style.background = T.white; }}
                    >
                      {isExpanded ? 'Close / 閉じる' : 'Read / 読む'}
                    </button>
                    {pitch.status !== 'sent' && (
                      <button
                        onClick={() => handleAction(pitch.id, 'sent')}
                        disabled={isBusy}
                        style={{
                          padding: '7px 14px', border: `1px solid ${T.border}`,
                          borderRadius: 8, background: T.white,
                          color: T.textSub, fontSize: 11,
                          cursor: isBusy ? 'not-allowed' : 'pointer', fontFamily: T.font,
                        }}
                      >
                        Undo / 取り消し
                      </button>
                    )}
                  </div>
                </div>

                {/* ── ピッチ本文 + フィードバックUI（展開時） ── */}
                {isExpanded && (
                  <div style={{ marginTop: 18, paddingTop: 18, borderTop: `1px solid ${T.border}` }}>
                    {/* Pitch body */}
                    {pitch.body ? (
                      <pre style={{
                        color: '#374151', fontSize: 13, lineHeight: 1.8,
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        fontFamily: T.font,
                        margin: '0 0 20px', background: T.bg, borderRadius: 10,
                        padding: '16px 18px', border: `1px solid ${T.border}`,
                      }}>
                        {renderBody(pitch.body)}
                      </pre>
                    ) : (
                      <p style={{
                        color: T.textMuted, fontSize: 13, textAlign: 'center',
                        padding: '20px', background: T.bg, borderRadius: 10,
                        border: `1px solid ${T.border}`, margin: '0 0 20px',
                        fontFamily: T.font,
                      }}>
                        Pitch content not stored for this entry.<br />
                        <span style={{ fontSize: 11 }}>このピッチの本文データは保存されていません。</span>
                      </p>
                    )}

                    {/* ── Feedback UI ── */}
                    <div style={{
                      background: T.bg, border: `1px solid ${T.border}`,
                      borderRadius: 12, padding: '16px 18px',
                    }}>
                      <div style={{ color: T.textSub, fontSize: 12, fontWeight: 700, marginBottom: 12, letterSpacing: 0.5, fontFamily: T.font }}>
                        FEEDBACK / フィードバック
                      </div>

                      {/* Star rating */}
                      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                        {[1,2,3,4,5].map(star => (
                          <button
                            key={star}
                            onClick={() => setDraft(pitch.id, 'rating', star === (feedbackDraft[pitch.id]?.rating) ? 0 : star)}
                            style={{
                              fontSize: 22, background: 'none', border: 'none',
                              cursor: 'pointer', padding: '2px 3px',
                              color: star <= (feedbackDraft[pitch.id]?.rating || 0) ? '#f59e0b' : '#d1d5db',
                            }}
                          >★</button>
                        ))}
                        {feedbackDraft[pitch.id]?.rating > 0 && (
                          <span style={{ color: '#f59e0b', fontSize: 12, alignSelf: 'center', fontFamily: T.font }}>
                            {feedbackDraft[pitch.id].rating}/5
                          </span>
                        )}
                      </div>

                      {/* Feedback textarea */}
                      <textarea
                        className="fb-input"
                        value={feedbackDraft[pitch.id]?.text || ''}
                        onChange={e => setDraft(pitch.id, 'text', e.target.value)}
                        placeholder="Share your thoughts on this track... (Required for payment)"
                        rows={4}
                        style={{
                          ...fbInp,
                          border: `1px solid ${(feedbackDraft[pitch.id]?.text?.trim().length > 0 && feedbackDraft[pitch.id]?.text?.trim().length < 20) ? '#ef4444' : T.border}`,
                          resize: 'vertical',
                        }}
                      />
                      {feedbackDraft[pitch.id]?.text?.trim().length > 0 && feedbackDraft[pitch.id]?.text?.trim().length < 20 && (
                        <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4, fontFamily: T.font }}>
                          Minimum 20 characters ({feedbackDraft[pitch.id].text.trim().length}/20)
                        </div>
                      )}

                      {/* Placement section */}
                      <div style={{ marginTop: 14, padding: '12px 14px', background: T.accentLight, border: `1px solid ${T.accentBorder}`, borderRadius: 10 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={feedbackDraft[pitch.id]?.featured || false}
                            onChange={e => setDraft(pitch.id, 'featured', e.target.checked)}
                            style={{ accentColor: T.accent, width: 15, height: 15 }}
                          />
                          <span style={{ color: T.accent, fontSize: 13, fontWeight: 700, fontFamily: T.font }}>
                            Yes, I featured this track / はい、紹介しました
                          </span>
                        </label>
                        {feedbackDraft[pitch.id]?.featured && (
                          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <select
                              className="fb-input"
                              value={feedbackDraft[pitch.id]?.platform || ''}
                              onChange={e => setDraft(pitch.id, 'platform', e.target.value)}
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
                              className="fb-input"
                              value={feedbackDraft[pitch.id]?.url || ''}
                              onChange={e => setDraft(pitch.id, 'url', e.target.value)}
                              placeholder="https://open.spotify.com/playlist/... *required"
                              style={{
                                ...fbInp,
                                border: `1px solid ${feedbackDraft[pitch.id]?.featured && !feedbackDraft[pitch.id]?.url?.trim() ? '#ef4444' : T.accent}`,
                              }}
                            />
                            <input
                              type="date"
                              className="fb-input"
                              value={feedbackDraft[pitch.id]?.date || new Date().toISOString().slice(0, 10)}
                              onChange={e => setDraft(pitch.id, 'date', e.target.value)}
                              style={fbInp}
                            />
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      {(() => {
                        const draftText = feedbackDraft[pitch.id]?.text?.trim() || '';
                        const validFeedback = draftText.length >= 20;
                        const featured = feedbackDraft[pitch.id]?.featured || false;
                        const placementUrl = feedbackDraft[pitch.id]?.url?.trim() || '';
                        const canAccept = !isBusy && validFeedback && (!featured || placementUrl.length > 0);
                        const canOther = !isBusy && validFeedback;
                        return (
                          <div className="action-btns-row" style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                            {(pitch.status === 'sent' || pitch.status === 'feedback') && (
                              <>
                                <button
                                  onClick={() => handleAction(pitch.id, 'accepted')}
                                  disabled={!canAccept}
                                  style={{
                                    padding: '9px 18px', border: 'none',
                                    borderRadius: 8, background: canAccept ? '#10b981' : T.border,
                                    color: '#fff', fontSize: 12, fontWeight: 700,
                                    cursor: canAccept ? 'pointer' : 'not-allowed',
                                    fontFamily: T.font, transition: 'background 0.15s',
                                  }}
                                >{isBusy ? '...' : '✅ Accept & Featured'}</button>
                                <button
                                  onClick={() => handleFeedbackOnly(pitch.id)}
                                  disabled={!canOther}
                                  style={{
                                    padding: '9px 18px', border: 'none',
                                    borderRadius: 8, background: canOther ? T.accent : T.border,
                                    color: '#fff', fontSize: 12, fontWeight: 700,
                                    cursor: canOther ? 'pointer' : 'not-allowed',
                                    fontFamily: T.font, transition: 'background 0.15s',
                                  }}
                                >{isBusy ? '...' : '💬 Feedback Only'}</button>
                                <button
                                  onClick={() => handleAction(pitch.id, 'rejected')}
                                  disabled={!canOther}
                                  style={{
                                    padding: '9px 18px',
                                    border: `1px solid ${canOther ? '#ef4444' : T.border}`,
                                    borderRadius: 8, background: T.white,
                                    color: canOther ? '#ef4444' : T.textMuted,
                                    fontSize: 12, fontWeight: 700,
                                    cursor: canOther ? 'pointer' : 'not-allowed',
                                    fontFamily: T.font, transition: 'all 0.15s',
                                  }}
                                >{isBusy ? '...' : '❌ Decline'}</button>
                              </>
                            )}
                          </div>
                        );
                      })()}

                      {/* Existing feedback display */}
                      {(pitch.feedback_message || pitch.placement_url) && (
                        <div style={{ marginTop: 14, padding: '10px 14px', background: T.white, borderRadius: 8, border: `1px solid ${T.border}` }}>
                          <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 6, fontFamily: T.font }}>Previous feedback / 過去のフィードバック</div>
                          {pitch.feedback_message && <div style={{ color: T.textSub, fontSize: 13, fontFamily: T.font }}>{pitch.feedback_message}</div>}
                          {pitch.placement_url && (
                            <div style={{ marginTop: 6 }}>
                              <span style={{ color: T.accent, fontSize: 11, fontWeight: 700, fontFamily: T.font }}>{pitch.placement_platform || 'Placement'}: </span>
                              <a href={pitch.placement_url} target="_blank" rel="noopener noreferrer" style={{ color: T.accent, fontSize: 12, wordBreak: 'break-all', fontFamily: T.font }}>{pitch.placement_url}</a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

      </div>

      {/* ── Footer ── */}
      <footer style={{
        padding: '32px 24px', background: T.white, borderTop: `1px solid ${T.border}`,
        textAlign: 'center', fontFamily: T.font, fontSize: 13, color: T.textMuted,
      }}>
        <div>
          <span>OTONAMI — Connecting Japanese Music to the World</span>
          <span style={{ margin: '0 8px' }}>·</span>
          <span>TYCompany LLC / ILCJ</span>
        </div>
      </footer>
    </div>
  );
}
