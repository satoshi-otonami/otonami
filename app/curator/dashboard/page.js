"use client";
import { useState, useEffect } from 'react';

const STATUS_LABELS = {
  sent:     { en: 'Pending',  ja: '未対応',  color: '#facc15', bg: 'rgba(250,204,21,0.1)' },
  accepted: { en: 'Accepted', ja: '承認済み', color: '#4ade80', bg: 'rgba(74,222,128,0.1)' },
  rejected: { en: 'Rejected', ja: '却下済み', color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
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
  const [updating, setUpdating] = useState(null); // pitchId being updated
  const [feedbackDraft, setFeedbackDraft] = useState({}); // { [pitchId]: { text, rating } }
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
        // トークン検証 & キュレーター情報
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

        // ピッチ取得
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
      if (draft.text?.trim()) body.feedback = draft.text.trim();
      if (draft.rating) body.rating = draft.rating;
      const res = await fetch('/api/curator/dashboard', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) return;
      setPitches(prev => prev.map(p => p.id === pitchId ? { ...p, status, feedback: body.feedback, rating: body.rating } : p));
      setFeedbackDraft(prev => { const n = {...prev}; delete n[pitchId]; return n; });
      showToast('✅ Feedback submitted');
    } finally {
      setUpdating(null);
    }
  };

  const handleFeedbackOnly = async (pitchId) => {
    const draft = feedbackDraft[pitchId] || {};
    if (!draft.text?.trim() && !draft.rating) return;
    await handleAction(pitchId, 'feedback');
  };

  const setDraft = (pitchId, key, val) =>
    setFeedbackDraft(prev => ({ ...prev, [pitchId]: { ...(prev[pitchId] || {}), [key]: val } }));

  const handleLogout = () => {
    localStorage.removeItem('curator_token');
    window.location.href = '/curator';
  };

  // ── スタイル定数 ──
  const card = {
    background: '#13132a', border: '1px solid #1e1e3a',
    borderRadius: 14, padding: '20px 22px', marginBottom: 14,
  };

  // ── 未ログイン画面 ──
  if (!loading && (authError === 'not_logged_in' || authError === 'invalid_token')) return (
    <div style={{ minHeight: '100vh', background: '#0a0a18', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', color: '#fff', maxWidth: 420 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 10 }}>
          Login Required
        </h1>
        <p style={{ color: '#888', fontSize: 14, lineHeight: 1.8, marginBottom: 28 }}>
          Please log in to access the curator dashboard.<br />
          <span style={{ color: '#555', fontSize: 12 }}>ダッシュボードにアクセスするにはログインしてください。</span>
        </p>
        <a href="/curator" style={{
          display: 'inline-block', padding: '13px 32px',
          background: 'linear-gradient(135deg,#7c3aed,#2563eb)',
          borderRadius: 24, color: '#fff', textDecoration: 'none', fontWeight: 700,
        }}>Go to Login / ログイン →</a>
      </div>
    </div>
  );

  // ── ローディング ──
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a18', display: 'flex',
                  alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#555', fontSize: 14 }}>Loading... / 読み込み中...</p>
    </div>
  );

  // ── エラー ──
  if (authError === 'error') return (
    <div style={{ minHeight: '100vh', background: '#0a0a18', display: 'flex',
                  alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#f87171', fontSize: 14 }}>Something went wrong. Please try again.</p>
    </div>
  );

  const filteredPitches = pitches;
  const counts = {
    all: pitches.length,
    sent: pitches.filter(p => p.status === 'sent').length,
    accepted: pitches.filter(p => p.status === 'accepted').length,
    rejected: pitches.filter(p => p.status === 'rejected').length,
  };

  // Render pitch body with clickable URLs
  const renderBody = (text) => {
    if (!text) return null;
    const parts = text.split(/(https?:\/\/[^\s]+)/g);
    return parts.map((part, i) =>
      /^https?:\/\//.test(part)
        ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#a78bfa', wordBreak: 'break-all' }}>{part}</a>
        : part
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a18', padding: '0 0 80px' }}>
      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#1a3a2a', border: '1px solid #4ade80', borderRadius: 10,
          padding: '10px 22px', color: '#4ade80', fontWeight: 700, fontSize: 14,
          zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>{toast}</div>
      )}

      {/* ── Header ── */}
      <div style={{
        background: '#0d0d20', borderBottom: '1px solid #1e1e3a',
        padding: '16px 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/curator" style={{
            fontSize: 18, fontWeight: 900, color: '#a78bfa',
            textDecoration: 'none', letterSpacing: 2,
          }}>OTONAMI</a>
          <span style={{ color: '#2a2a4a', fontSize: 18 }}>|</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Curator Dashboard</span>
          <span style={{ color: '#555', fontSize: 12 }}>キュレーターダッシュボード</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {curator && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{curator.name}</div>
              <div style={{ color: '#555', fontSize: 11 }}>{curator.email}</div>
            </div>
          )}
          <button onClick={handleLogout} style={{
            padding: '7px 16px', border: '1px solid #2a2a4a',
            borderRadius: 8, background: 'transparent', color: '#888',
            fontSize: 12, cursor: 'pointer',
          }}>Logout</button>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 16px' }}>

        {/* ── 概要カード ── */}
        {curator && (
          <div style={{ ...card, display: 'flex', gap: 20, alignItems: 'center', marginBottom: 28 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'linear-gradient(135deg,#7c3aed,#2563eb)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, flexShrink: 0,
            }}>
              {curator.icon || '🎵'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 17 }}>{curator.name}</div>
              <div style={{ color: '#888', fontSize: 13, marginTop: 2 }}>
                {curator.playlist || curator.type}
                {curator.region && <span style={{ color: '#555', marginLeft: 8 }}>· {curator.region}</span>}
              </div>
              {curator.genres?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                  {curator.genres.slice(0, 6).map(g => (
                    <span key={g} style={{
                      padding: '2px 9px', borderRadius: 12, fontSize: 11,
                      background: 'rgba(124,58,237,0.15)', color: '#a78bfa',
                      border: '1px solid rgba(124,58,237,0.3)',
                    }}>{g}</span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 20, textAlign: 'center', flexShrink: 0 }}>
              {[
                { label: 'Total', ja: '合計', val: counts.all },
                { label: 'Pending', ja: '未対応', val: counts.sent, color: '#facc15' },
                { label: 'Accepted', ja: '承認', val: counts.accepted, color: '#4ade80' },
                { label: 'Rejected', ja: '却下', val: counts.rejected, color: '#f87171' },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color || '#fff' }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: '#555', lineHeight: 1.4 }}>{s.label}<br />{s.ja}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── フィルタータブ ── */}
        <div style={{
          display: 'flex', gap: 6, marginBottom: 20,
          background: '#0f0f2a', borderRadius: 12, padding: 4,
          border: '1px solid #1e1e3a',
        }}>
          {FILTER_TABS.map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)} style={{
              flex: 1, padding: '9px 6px', border: 'none', borderRadius: 9,
              cursor: 'pointer', fontWeight: 700, fontSize: 13, transition: 'all 0.2s',
              background: filter === t.key ? 'linear-gradient(135deg,#7c3aed,#2563eb)' : 'transparent',
              color: filter === t.key ? '#fff' : '#555',
            }}>
              {t.en}
              <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 4, opacity: 0.8 }}>
                / {t.ja}
              </span>
              {t.key !== 'all' && counts[t.key] > 0 && (
                <span style={{
                  marginLeft: 6, background: filter === t.key ? 'rgba(255,255,255,0.2)' : '#1e1e3a',
                  borderRadius: 10, padding: '1px 7px', fontSize: 11, color: filter === t.key ? '#fff' : '#888',
                }}>{counts[t.key]}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── ピッチ一覧 ── */}
        {filteredPitches.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <p style={{ color: '#555', fontSize: 14 }}>
              No pitches yet. / まだピッチはありません。
            </p>
          </div>
        ) : (
          filteredPitches.map(pitch => {
            const s = STATUS_LABELS[pitch.status] || STATUS_LABELS.sent;
            const isExpanded = expanded === pitch.id;
            const isBusy = updating === pitch.id;

            return (
              <div key={pitch.id} style={card}>
                {/* ── ピッチヘッダー ── */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                    background: '#0d0d1f', border: '1px solid #2a2a4a',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                  }}>🎵</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>
                        {pitch.artist_name || 'Unknown Artist'}
                      </span>
                      {pitch.artist_genre && (
                        <span style={{ color: '#666', fontSize: 12 }}>{pitch.artist_genre}</span>
                      )}
                      <span style={{
                        padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                        color: s.color, background: s.bg, border: `1px solid ${s.color}44`,
                      }}>{s.en} / {s.ja}</span>
                    </div>
                    <div style={{
                      color: '#aaa', fontSize: 13, marginTop: 4,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {pitch.subject || '(no subject)'}
                    </div>
                    <div style={{ color: '#444', fontSize: 11, marginTop: 4 }}>
                      {pitch.sent_at
                        ? new Date(pitch.sent_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })
                        : pitch.created_at
                        ? new Date(pitch.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })
                        : ''}
                    </div>
                  </div>

                  {/* ── アクションボタン ── */}
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                    <button
                      onClick={() => setExpanded(isExpanded ? null : pitch.id)}
                      style={{
                        padding: '7px 14px', border: '1px solid #2a2a4a',
                        borderRadius: 8, background: 'transparent',
                        color: '#888', fontSize: 12, cursor: 'pointer',
                      }}
                    >
                      {isExpanded ? 'Close / 閉じる' : 'Read / 読む'}
                    </button>
                    {pitch.status === 'sent' && (
                      <>
                        <button
                          onClick={() => handleAction(pitch.id, 'accepted')}
                          disabled={isBusy}
                          style={{
                            padding: '7px 14px', border: 'none', borderRadius: 8,
                            background: isBusy ? '#1a2a1a' : 'rgba(74,222,128,0.15)',
                            color: isBusy ? '#444' : '#4ade80',
                            fontSize: 12, fontWeight: 700, cursor: isBusy ? 'not-allowed' : 'pointer',
                            border: '1px solid rgba(74,222,128,0.3)',
                          }}
                        >
                          {isBusy ? '...' : 'Accept / 承認'}
                        </button>
                        <button
                          onClick={() => handleAction(pitch.id, 'rejected')}
                          disabled={isBusy}
                          style={{
                            padding: '7px 14px', border: 'none', borderRadius: 8,
                            background: isBusy ? '#2a1a1a' : 'rgba(248,113,113,0.1)',
                            color: isBusy ? '#444' : '#f87171',
                            fontSize: 12, fontWeight: 700, cursor: isBusy ? 'not-allowed' : 'pointer',
                            border: '1px solid rgba(248,113,113,0.3)',
                          }}
                        >
                          {isBusy ? '...' : 'Reject / 却下'}
                        </button>
                      </>
                    )}
                    {pitch.status !== 'sent' && (
                      <button
                        onClick={() => handleAction(pitch.id, 'sent')}
                        disabled={isBusy}
                        style={{
                          padding: '7px 14px', border: '1px solid #2a2a4a',
                          borderRadius: 8, background: 'transparent',
                          color: '#555', fontSize: 11, cursor: isBusy ? 'not-allowed' : 'pointer',
                        }}
                      >
                        Undo / 取り消し
                      </button>
                    )}
                  </div>
                </div>

                {/* ── ピッチ本文 + フィードバックUI（展開時） ── */}
                {isExpanded && (
                  <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid #1e1e3a' }}>
                    {/* Pitch body */}
                    {pitch.body ? (
                      <pre style={{
                        color: '#ccc', fontSize: 13, lineHeight: 1.8,
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        margin: '0 0 20px', background: '#0d0d1f', borderRadius: 10,
                        padding: '16px 18px', border: '1px solid #1e1e3a',
                      }}>
                        {renderBody(pitch.body)}
                      </pre>
                    ) : (
                      <p style={{
                        color: '#555', fontSize: 13, textAlign: 'center',
                        padding: '20px', background: '#0d0d1f', borderRadius: 10,
                        border: '1px solid #1e1e3a', margin: '0 0 20px',
                      }}>
                        Pitch content not stored for this entry.<br />
                        <span style={{ fontSize: 11 }}>このピッチの本文データは保存されていません。</span>
                      </p>
                    )}

                    {/* ── Feedback UI ── */}
                    <div style={{
                      background: '#0d0d1f', border: '1px solid #1e1e3a',
                      borderRadius: 12, padding: '16px 18px',
                    }}>
                      <div style={{ color: '#888', fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
                        FEEDBACK / フィードバック
                      </div>

                      {/* Star rating */}
                      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                        {[1,2,3,4,5].map(star => (
                          <button
                            key={star}
                            onClick={() => setDraft(pitch.id, 'rating', star === (feedbackDraft[pitch.id]?.rating) ? 0 : star)}
                            style={{
                              fontSize: 22, background: 'none', border: 'none',
                              cursor: 'pointer', padding: '2px 3px',
                              color: star <= (feedbackDraft[pitch.id]?.rating || 0) ? '#facc15' : '#333',
                              filter: star <= (feedbackDraft[pitch.id]?.rating || 0) ? 'none' : 'grayscale(1)',
                            }}
                          >★</button>
                        ))}
                        {feedbackDraft[pitch.id]?.rating > 0 && (
                          <span style={{ color: '#facc15', fontSize: 12, alignSelf: 'center' }}>
                            {feedbackDraft[pitch.id].rating}/5
                          </span>
                        )}
                      </div>

                      {/* Feedback textarea */}
                      <textarea
                        value={feedbackDraft[pitch.id]?.text || ''}
                        onChange={e => setDraft(pitch.id, 'text', e.target.value)}
                        placeholder="Share your thoughts on this track..."
                        rows={4}
                        style={{
                          width: '100%', background: '#0a0a18', border: '1px solid #2a2a4a',
                          borderRadius: 8, color: '#ccc', fontSize: 13, lineHeight: 1.6,
                          padding: '10px 12px', resize: 'vertical', fontFamily: 'inherit',
                          boxSizing: 'border-box',
                        }}
                      />

                      {/* Action buttons with feedback */}
                      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                        {pitch.status === 'sent' || pitch.status === 'feedback' ? (
                          <>
                            <button
                              onClick={() => handleAction(pitch.id, 'accepted')}
                              disabled={isBusy}
                              style={{
                                padding: '8px 16px', border: '1px solid rgba(74,222,128,0.3)',
                                borderRadius: 8, background: 'rgba(74,222,128,0.15)',
                                color: '#4ade80', fontSize: 12, fontWeight: 700,
                                cursor: isBusy ? 'not-allowed' : 'pointer',
                              }}
                            >{isBusy ? '...' : 'Accept / 承認'}</button>
                            <button
                              onClick={() => handleAction(pitch.id, 'rejected')}
                              disabled={isBusy}
                              style={{
                                padding: '8px 16px', border: '1px solid rgba(248,113,113,0.3)',
                                borderRadius: 8, background: 'rgba(248,113,113,0.1)',
                                color: '#f87171', fontSize: 12, fontWeight: 700,
                                cursor: isBusy ? 'not-allowed' : 'pointer',
                              }}
                            >{isBusy ? '...' : 'Reject / 却下'}</button>
                          </>
                        ) : null}
                        <button
                          onClick={() => handleFeedbackOnly(pitch.id)}
                          disabled={isBusy || (!feedbackDraft[pitch.id]?.text?.trim() && !feedbackDraft[pitch.id]?.rating)}
                          style={{
                            padding: '8px 16px', border: '1px solid #2a2a4a',
                            borderRadius: 8, background: 'rgba(124,58,237,0.15)',
                            color: '#a78bfa', fontSize: 12, fontWeight: 700,
                            cursor: 'pointer', opacity: (!feedbackDraft[pitch.id]?.text?.trim() && !feedbackDraft[pitch.id]?.rating) ? 0.4 : 1,
                          }}
                        >Submit Feedback</button>
                      </div>

                      {/* Existing feedback display */}
                      {pitch.feedback && (
                        <div style={{ marginTop: 14, padding: '10px 14px', background: '#131328', borderRadius: 8, border: '1px solid #1e1e3a' }}>
                          <div style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>Previous feedback / 過去のフィードバック</div>
                          <div style={{ color: '#aaa', fontSize: 13 }}>{pitch.feedback}</div>
                          {pitch.rating && <div style={{ color: '#facc15', fontSize: 13, marginTop: 4 }}>{'★'.repeat(pitch.rating)}{'☆'.repeat(5 - pitch.rating)}</div>}
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
    </div>
  );
}
