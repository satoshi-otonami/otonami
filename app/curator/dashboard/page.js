"use client";
import { useState, useEffect, useRef } from 'react';
import { T } from '@/lib/design-tokens';
import { supabase } from '@/lib/supabase';

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

const TYPE_OPTIONS = [
  { value: 'playlist', en: 'Playlist Curator',  ja: 'プレイリスト' },
  { value: 'blog',     en: 'Blog',              ja: 'ブログ' },
  { value: 'media',    en: 'Media Outlet',      ja: 'メディア' },
  { value: 'radio',    en: 'Radio / Podcast',   ja: 'ラジオ・ポッドキャスト' },
  { value: 'label',    en: 'Record Label',      ja: 'レコードレーベル' },
  { value: 'other',    en: 'Other',             ja: 'その他' },
];

const REGION_OPTIONS = [
  'Japan', 'United States', 'United Kingdom', 'Germany', 'France',
  'Australia', 'Canada', 'South Korea', 'Brazil', 'Mexico',
  'Spain', 'Italy', 'Netherlands', 'Sweden', 'Norway',
  'Denmark', 'Finland', 'Portugal', 'Poland', 'India',
  'Singapore', 'Thailand', 'Indonesia', 'Philippines',
  'South Africa', 'Nigeria', 'Argentina', 'Colombia', 'Global', 'Other',
];

const GENRE_OPTIONS = [
  'Jazz', 'Rock', 'Pop', 'Hip-hop', 'R&B', 'Electronic', 'Folk',
  'Classical', 'Indie', 'Alternative', 'Latin', 'Ambient', 'Experimental',
  'Instrumental', 'Dance music', 'Jazz fusion', 'Film music', 'Lo-fi',
  'Rap', 'Trap', 'Disco', 'Funk', 'Soul', 'World music', 'J-Pop', 'J-Rock',
];

const MOOD_OPTIONS = [
  'Authentic', 'Eclectic', 'Creative', 'Danceable', 'Downbeat',
  'Engaged', 'Energetic', 'Melancholic', 'Uplifting', 'Chill',
  'Dramatic', 'Groovy', 'Atmospheric', 'Experimental',
];

const OPPORTUNITY_OPTIONS = [
  { value: 'playlist',  en: 'Add to my playlist(s)',               ja: 'プレイリストに追加' },
  { value: 'blog',      en: 'Write a blog post / review',          ja: 'ブログ記事・レビューを書く' },
  { value: 'social',    en: 'Feature on social media',             ja: 'SNSで紹介' },
  { value: 'radio',     en: 'Radio play',                          ja: 'ラジオで放送' },
  { value: 'reel',      en: 'Create post or reel on social media', ja: 'SNS投稿・リールを作成' },
  { value: 'interview', en: 'Interview',                           ja: 'インタビュー' },
];

const TYPE_BADGE = {
  playlist: { bg: '#ede9fe', color: '#7c3aed', label: 'Playlist' },
  blog:     { bg: '#fef3c7', color: '#d97706', label: 'Blog' },
  media:    { bg: '#dbeafe', color: '#1d4ed8', label: 'Media' },
  radio:    { bg: '#d1fae5', color: '#059669', label: 'Radio' },
  label:    { bg: '#fce7f3', color: '#db2777', label: 'Label' },
  other:    { bg: T.bg,      color: T.textSub,  label: 'Other' },
};

// ── ピル表示ヘルパー ──
function PillRow({ items, color = T.accent, bg = T.accentLight, border = T.accentBorder }) {
  if (!items?.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
      {items.map((g, i) => (
        <span key={i} style={{
          padding: '2px 9px', borderRadius: 12, fontSize: 11,
          background: bg, color, border: `1px solid ${border}`,
          fontFamily: T.font,
        }}>{g}</span>
      ))}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: 0.8, marginBottom: 6, fontFamily: T.font, textTransform: 'uppercase' }}>
      {children}
    </div>
  );
}

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

  // Edit profile state
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editAvatarFile, setEditAvatarFile] = useState(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState(null);
  const [editAvatarUploading, setEditAvatarUploading] = useState(false);
  const [editAvatarDragOver, setEditAvatarDragOver] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveError, setSaveError] = useState('');
  const editAvatarRef = useRef(null);

  // ── 認証 + 初期データ取得 ──
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('curator_token') : null;
    if (!token) { setAuthError('not_logged_in'); setLoading(false); return; }

    (async () => {
      try {
        const res = await fetch('/api/curators/login', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) { setAuthError('invalid_token'); setLoading(false); return; }
        const { curator: c } = await res.json();
        setCurator(c);
        const pr = await fetch('/api/curator/dashboard', { headers: { Authorization: `Bearer ${token}` } });
        const { pitches: p } = await pr.json();
        setPitches(p || []);
      } catch { setAuthError('error'); } finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (!curator) return;
    const token = localStorage.getItem('curator_token');
    const url = filter === 'all' ? '/api/curator/dashboard' : `/api/curator/dashboard?status=${filter}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setPitches(d.pitches || []));
  }, [filter, curator]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  // ── Edit profile ──
  const startEdit = () => {
    setEditForm({
      type: curator.type || 'playlist',
      playlist: curator.playlist || '',
      url: curator.url || '',
      region: curator.region || 'Global',
      bio: curator.bio || '',
      followers: curator.followers || '',
      genres: [...(curator.genres || [])],
      accepts: [...(curator.accepts || [])],
      preferred_moods: [...(curator.preferred_moods || [])],
      opportunities: [...(curator.opportunities || [])],
      similar_artists: (curator.similar_artists || []).join(', '),
      playlist_url: curator.playlist_url || '',
    });
    setEditAvatarPreview(curator.icon_url || null);
    setEditAvatarFile(null);
    setSaveError('');
    setSaveStatus('idle');
    setEditMode(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const applyEditAvatar = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file.'); return; }
    if (file.size > 2 * 1024 * 1024) { alert('File size must be under 2MB.'); return; }
    setEditAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setEditAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const toggleEditArray = (key, val, max) => {
    setEditForm(f => {
      const arr = f[key] || [];
      if (arr.includes(val)) return { ...f, [key]: arr.filter(x => x !== val) };
      if (max != null && arr.length >= max) return f;
      return { ...f, [key]: [...arr, val] };
    });
  };

  const handleSave = async () => {
    setSaveStatus('loading');
    setSaveError('');
    let iconUrl = curator.icon_url || '';

    if (editAvatarFile) {
      setEditAvatarUploading(true);
      try {
        const ext = editAvatarFile.name.split('.').pop().toLowerCase();
        const slug = curator.email.replace(/[^a-z0-9]/gi, '-').toLowerCase();
        const fileName = `curator-${slug}-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, editAvatarFile, { contentType: editAvatarFile.type, upsert: true });
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
          iconUrl = publicUrl;
        }
      } catch { /* skip on error */ } finally { setEditAvatarUploading(false); }
    }

    try {
      const token = localStorage.getItem('curator_token');
      const similarArtistsArr = typeof editForm.similar_artists === 'string'
        ? editForm.similar_artists.split(',').map(s => s.trim()).filter(Boolean).slice(0, 5)
        : editForm.similar_artists;

      const res = await fetch('/api/curator', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...editForm, similar_artists: similarArtistsArr, icon_url: iconUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setCurator(data.curator);
      setEditMode(false);
      showToast('✅ Profile updated! / プロフィールを更新しました');
    } catch (e) {
      setSaveError(e.message);
      setSaveStatus('error');
    } finally {
      if (saveStatus !== 'error') setSaveStatus('idle');
    }
  };

  // ── Pitch actions ──
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
    } finally { setUpdating(null); }
  };

  const handleFeedbackOnly = async (pitchId) => {
    const draft = feedbackDraft[pitchId] || {};
    if (!draft.text?.trim()) return;
    await handleAction(pitchId, 'feedback');
  };

  const setDraft = (pitchId, key, val) =>
    setFeedbackDraft(prev => ({ ...prev, [pitchId]: { ...(prev[pitchId] || {}), [key]: val } }));

  const handleLogout = () => { localStorage.removeItem('curator_token'); window.location.href = '/curator'; };

  const renderBody = (text) => {
    if (!text) return null;
    const parts = text.split(/(https?:\/\/[^\s]+)/g);
    return parts.map((part, i) =>
      /^https?:\/\//.test(part)
        ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: T.accent, wordBreak: 'break-all' }}>{part}</a>
        : part
    );
  };

  // ── Guards ──
  if (!loading && (authError === 'not_logged_in' || authError === 'invalid_token')) return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 10, color: T.text, fontFamily: T.fontDisplay }}>Login Required</h1>
        <p style={{ color: T.textSub, fontSize: 14, lineHeight: 1.8, marginBottom: 28, fontFamily: T.font }}>
          Please log in to access the curator dashboard.<br />
          <span style={{ color: T.textMuted, fontSize: 12 }}>ダッシュボードにアクセスするにはログインしてください。</span>
        </p>
        <a href="/curator" style={{ display: 'inline-block', padding: '13px 32px', background: T.accentGrad, borderRadius: 24, color: '#fff', textDecoration: 'none', fontWeight: 700, fontFamily: T.font }}>Go to Login →</a>
      </div>
    </div>
  );

  if (loading) return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: T.textMuted, fontSize: 14, fontFamily: T.font }}>Loading... / 読み込み中...</p>
    </div>
  );

  if (authError === 'error') return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#ef4444', fontSize: 14, fontFamily: T.font }}>Something went wrong. Please try again.</p>
    </div>
  );

  const counts = {
    all: pitches.length,
    sent: pitches.filter(p => p.status === 'sent').length,
    accepted: pitches.filter(p => p.status === 'accepted').length,
    rejected: pitches.filter(p => p.status === 'rejected').length,
  };

  const fbInp = {
    width: '100%', background: T.white, border: `1px solid ${T.border}`,
    borderRadius: 8, color: T.text, fontSize: 13, padding: '9px 12px',
    outline: 'none', fontFamily: T.font, boxSizing: 'border-box', minHeight: 44,
  };
  const editInp = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: `1px solid ${T.border}`, background: T.white, color: T.text,
    fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: T.font, minHeight: 44,
  };
  const editLbl = { fontSize: 12, color: '#374151', display: 'block', marginBottom: 5, fontWeight: 600, fontFamily: T.font };

  const typeBadge = curator ? (TYPE_BADGE[curator.type] || TYPE_BADGE.other) : TYPE_BADGE.other;
  const editTypeBadge = editMode ? (TYPE_BADGE[editForm.type] || TYPE_BADGE.other) : null;

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
        .edit-input:focus { border-color: ${T.accent} !important; box-shadow: 0 0 0 3px rgba(14,165,233,0.1) !important; outline: none !important; }
        .pill-tag-edit { transition: all 0.12s; }
        .pill-tag-edit:hover { border-color: ${T.accent} !important; background: ${T.accentLight} !important; color: ${T.accent} !important; }
        @media (max-width: 768px) {
          .dash-header { padding: 0 16px !important; }
          .dash-header-subtitle { display: none !important; }
          .dash-header-meta { display: none !important; }
          .profile-top { flex-direction: column !important; align-items: flex-start !important; }
          .pitch-header { flex-wrap: wrap !important; }
          .pitch-actions { flex-wrap: wrap !important; margin-top: 8px !important; width: 100% !important; }
          .pitch-actions button { flex: 1; min-height: 40px !important; }
          .action-btns-row { flex-wrap: wrap !important; gap: 8px !important; }
          .action-btns-row button { flex: 1 1 calc(50% - 4px); min-height: 44px !important; font-size: 13px !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .edit-2col-grid { grid-template-columns: 1fr !important; }
          .edit-avatar-row { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
          .edit-save-btns { flex-direction: column !important; }
          .edit-save-btns button { width: 100% !important; min-height: 48px !important; }
          .edit-input { min-height: 48px !important; font-size: 16px !important; }
          .edit-bio-textarea { min-height: 120px !important; font-size: 16px !important; }
          .fb-input { font-size: 16px !important; }
          .fb-textarea { min-height: 100px !important; font-size: 16px !important; }
          .pill-tag-edit { min-height: 36px !important; padding: 6px 12px !important; }
          .pitch-fb-stars button { min-width: 44px !important; min-height: 44px !important; font-size: 26px !important; padding: 0 !important; }
          .dash-filter-tabs { overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; flex-wrap: nowrap !important; }
          .dash-filter-tabs button { flex-shrink: 0 !important; min-height: 44px !important; }
        }
      `}</style>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: T.white, border: `1px solid #bbf7d0`, borderRadius: 10,
          padding: '12px 24px', color: '#065f46', fontWeight: 700, fontSize: 14,
          zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontFamily: T.font,
          whiteSpace: 'nowrap',
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
          <span className="dash-header-subtitle" style={{ color: T.border, fontSize: 20 }}>|</span>
          <span className="dash-header-subtitle" style={{ color: T.text, fontWeight: 700, fontSize: 14 }}>Curator Dashboard</span>
          <span className="dash-header-subtitle" style={{ color: T.textMuted, fontSize: 12 }}>キュレーターダッシュボード</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {curator && (
            <div className="dash-header-meta" style={{ textAlign: 'right' }}>
              <div style={{ color: T.text, fontSize: 13, fontWeight: 700 }}>{curator.name}</div>
              <div style={{ color: T.textMuted, fontSize: 11 }}>{curator.email}</div>
            </div>
          )}
          <button onClick={handleLogout} style={{
            padding: '7px 16px', border: `1px solid ${T.border}`,
            borderRadius: 8, background: T.white, color: T.textSub,
            fontSize: 12, cursor: 'pointer', fontFamily: T.font, transition: 'all 0.15s',
            minHeight: 40, minWidth: 44,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSub; }}
          >Logout</button>
        </div>
      </header>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 16px calc(96px + env(safe-area-inset-bottom))' }}>

        {/* ── プロフィールカード ── */}
        {curator && (
          <div style={{
            background: T.white, border: `1px solid ${T.border}`, borderRadius: T.radiusLg,
            padding: '24px', marginBottom: 20, boxShadow: T.shadow,
          }}>
            {editMode ? (
              /* ════════════════════════════════════════
                 EDIT MODE
              ════════════════════════════════════════ */
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: T.fontDisplay, margin: 0 }}>
                    Edit Profile <span style={{ fontSize: 12, fontWeight: 400, color: T.textMuted, fontFamily: T.font }}>/ プロフィール編集</span>
                  </h3>
                  <button onClick={() => setEditMode(false)} style={{ background: 'none', border: 'none', color: T.textMuted, fontSize: 13, cursor: 'pointer', fontFamily: T.font }}>✕ Cancel</button>
                </div>

                {/* Avatar upload */}
                <div style={{ marginBottom: 20 }}>
                  <div style={editLbl}>Profile Photo / プロフィール写真</div>
                  <div className="edit-avatar-row" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div
                      onClick={() => !editAvatarUploading && editAvatarRef.current?.click()}
                      onDragOver={e => { e.preventDefault(); setEditAvatarDragOver(true); }}
                      onDragLeave={() => setEditAvatarDragOver(false)}
                      onDrop={e => { e.preventDefault(); setEditAvatarDragOver(false); applyEditAvatar(e.dataTransfer.files?.[0]); }}
                      style={{
                        width: 80, height: 80, borderRadius: '50%', flexShrink: 0,
                        border: `2px dashed ${editAvatarDragOver ? T.accentDark : editAvatarPreview ? T.accent : '#d1d5db'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: editAvatarUploading ? 'default' : 'pointer',
                        overflow: 'hidden', background: editAvatarDragOver ? T.accentLight : T.bg,
                        flexShrink: 0, transition: 'all 0.15s',
                      }}
                    >
                      {editAvatarPreview
                        ? <img src={editAvatarPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ textAlign: 'center', color: T.textMuted }}>
                            <div style={{ fontSize: 20 }}>📷</div>
                            <div style={{ fontSize: 9, fontFamily: T.font }}>Upload</div>
                          </div>
                      }
                    </div>
                    <div>
                      <button onClick={() => editAvatarRef.current?.click()} style={{ padding: '7px 14px', border: `1px solid ${T.border}`, borderRadius: 8, background: T.white, color: T.textSub, fontSize: 12, cursor: 'pointer', fontFamily: T.font }}>
                        {editAvatarPreview ? 'Change / 変更' : '📷 Upload'}
                      </button>
                      {editAvatarPreview && (
                        <button onClick={() => { setEditAvatarFile(null); setEditAvatarPreview(null); }} style={{ marginLeft: 8, background: 'none', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer', fontFamily: T.font }}>Remove</button>
                      )}
                      <p style={{ color: T.textMuted, fontSize: 11, marginTop: 4, fontFamily: T.font }}>JPG / PNG / WebP — max 2MB</p>
                    </div>
                    <input ref={editAvatarRef} type="file" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" onChange={e => applyEditAvatar(e.target.files?.[0])} style={{ display: 'none' }} />
                  </div>
                </div>

                {/* 2-column grid for basic fields */}
                <div className="edit-2col-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={editLbl}>Curator Type / タイプ</label>
                    <select className="edit-input" style={editInp} value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}>
                      {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.en} / {o.ja}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={editLbl}>Country / Region / 地域</label>
                    <select className="edit-input" style={editInp} value={editForm.region} onChange={e => setEditForm(f => ({ ...f, region: e.target.value }))}>
                      {REGION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={editLbl}>Platform Name / プラットフォーム名</label>
                    <input className="edit-input" style={editInp} value={editForm.playlist} placeholder="e.g. My Indie Playlist" onChange={e => setEditForm(f => ({ ...f, playlist: e.target.value }))} />
                  </div>
                  <div>
                    <label style={editLbl}>Followers / フォロワー数</label>
                    <input className="edit-input" style={editInp} type="number" value={editForm.followers} placeholder="e.g. 5000" onChange={e => setEditForm(f => ({ ...f, followers: e.target.value }))} />
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={editLbl}>Platform URL / サイトURL</label>
                  <input className="edit-input" style={editInp} type="url" value={editForm.url} placeholder="https://your-site.com" onChange={e => setEditForm(f => ({ ...f, url: e.target.value }))} />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={editLbl}>Playlist URL / プレイリストURL</label>
                  <input className="edit-input" style={editInp} type="url" value={editForm.playlist_url} placeholder="https://open.spotify.com/playlist/..." onChange={e => setEditForm(f => ({ ...f, playlist_url: e.target.value }))} />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={editLbl}>Bio / 自己紹介 <span style={{ fontSize: 10, fontWeight: 400, color: T.textMuted }}>最大500文字</span></label>
                  <textarea className="edit-input edit-bio-textarea" value={editForm.bio} onChange={e => { if (e.target.value.length <= 500) setEditForm(f => ({ ...f, bio: e.target.value })); }} placeholder="Tell artists about your platform..." rows={3} style={{ ...editInp, resize: 'vertical', height: 90 }} />
                  {editForm.bio?.length > 400 && <div style={{ color: editForm.bio.length > 480 ? '#ef4444' : T.textMuted, fontSize: 11, marginTop: 2, fontFamily: T.font }}>{editForm.bio.length}/500</div>}
                </div>

                {/* Genres */}
                <div style={{ marginBottom: 14 }}>
                  <label style={editLbl}>Genres / ジャンル <span style={{ fontSize: 10, fontWeight: 400, color: T.textMuted }}>（最大10個）</span></label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {GENRE_OPTIONS.map(g => {
                      const sel = editForm.genres?.includes(g);
                      const maxed = !sel && (editForm.genres?.length || 0) >= 10;
                      return (
                        <button key={g} onClick={() => toggleEditArray('genres', g, 10)} className="pill-tag-edit" disabled={maxed}
                          style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, cursor: maxed ? 'not-allowed' : 'pointer', border: '1px solid', borderColor: sel ? T.accent : T.border, background: sel ? T.accentLight : T.white, color: sel ? T.accent : maxed ? T.textMuted : T.textSub, fontFamily: T.font, opacity: maxed ? 0.5 : 1 }}>{g}</button>
                      );
                    })}
                  </div>
                </div>

                {/* Also accepts */}
                <div style={{ marginBottom: 14 }}>
                  <label style={editLbl}>Also Accepts / その他受付ジャンル</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {GENRE_OPTIONS.map(g => {
                      const sel = editForm.accepts?.includes(g);
                      return (
                        <button key={g} onClick={() => toggleEditArray('accepts', g, null)} className="pill-tag-edit"
                          style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer', border: '1px solid', borderColor: sel ? T.accent : T.border, background: sel ? T.accentLight : T.white, color: sel ? T.accent : T.textSub, fontFamily: T.font }}>{g}</button>
                      );
                    })}
                  </div>
                </div>

                {/* Moods */}
                <div style={{ marginBottom: 14 }}>
                  <label style={editLbl}>Moods / ムード</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {MOOD_OPTIONS.map(m => {
                      const sel = editForm.preferred_moods?.includes(m);
                      return (
                        <button key={m} onClick={() => toggleEditArray('preferred_moods', m, null)} className="pill-tag-edit"
                          style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer', border: '1px solid', borderColor: sel ? '#8b5cf6' : T.border, background: sel ? '#ede9fe' : T.white, color: sel ? '#7c3aed' : T.textSub, fontFamily: T.font }}>{m}</button>
                      );
                    })}
                  </div>
                </div>

                {/* Opportunities */}
                <div style={{ marginBottom: 14 }}>
                  <label style={editLbl}>Opportunities / 提供できる機会</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {OPPORTUNITY_OPTIONS.map(o => {
                      const sel = editForm.opportunities?.includes(o.value);
                      return (
                        <label key={o.value} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, border: `1px solid ${sel ? T.accent : T.border}`, background: sel ? T.accentLight : T.white }}>
                          <input type="checkbox" checked={sel} onChange={() => toggleEditArray('opportunities', o.value, null)} style={{ accentColor: T.accent, width: 14, height: 14, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: sel ? T.accent : T.text, fontFamily: T.font }}>{o.en} <span style={{ color: sel ? T.accent : T.textMuted, fontSize: 11 }}>/ {o.ja}</span></span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Similar Artists */}
                <div style={{ marginBottom: 20 }}>
                  <label style={editLbl}>Music Similar To... / こんな音楽が好き <span style={{ fontSize: 10, fontWeight: 400, color: T.textMuted }}>カンマ区切り・最大5アーティスト</span></label>
                  <input className="edit-input" style={editInp} value={editForm.similar_artists} placeholder="e.g. Snarky Puppy, Nujabes, Khruangbin" onChange={e => setEditForm(f => ({ ...f, similar_artists: e.target.value }))} />
                </div>

                {saveError && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 14, padding: '10px 14px', background: '#fef2f2', borderRadius: 8, fontFamily: T.font }}>{saveError}</div>}

                <div className="edit-save-btns" style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setEditMode(false)} style={{ padding: '11px 22px', border: `1px solid ${T.border}`, borderRadius: 10, background: T.white, color: T.textSub, fontSize: 14, cursor: 'pointer', fontFamily: T.font }}>
                    Cancel / キャンセル
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saveStatus === 'loading' || editAvatarUploading}
                    style={{
                      flex: 1, padding: '11px', background: (saveStatus === 'loading' || editAvatarUploading) ? T.border : '#10b981',
                      border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700,
                      cursor: (saveStatus === 'loading' || editAvatarUploading) ? 'not-allowed' : 'pointer', fontFamily: T.font,
                    }}
                  >
                    {editAvatarUploading ? 'Uploading image... / 画像アップロード中...' : saveStatus === 'loading' ? 'Saving... / 保存中...' : '✅ Save / 保存'}
                  </button>
                </div>
              </div>
            ) : (
              /* ════════════════════════════════════════
                 VIEW MODE
              ════════════════════════════════════════ */
              <div>
                {/* Top row: avatar + name + edit button */}
                <div className="profile-top" style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 16 }}>
                  {/* Avatar */}
                  {curator.icon_url ? (
                    <img src={curator.icon_url} alt={curator.name} style={{ width: 72, height: 72, borderRadius: '50%', flexShrink: 0, objectFit: 'cover', border: `2px solid ${T.border}` }} />
                  ) : (
                    <div style={{ width: 72, height: 72, borderRadius: '50%', flexShrink: 0, background: T.accentGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                      {curator.icon || '🎵'}
                    </div>
                  )}

                  {/* Name + meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div>
                        <h2 style={{ color: T.text, fontWeight: 800, fontSize: 20, fontFamily: T.fontDisplay, margin: 0 }}>{curator.name}</h2>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 6 }}>
                          {/* Type badge */}
                          <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: typeBadge.bg, color: typeBadge.color, fontFamily: T.font }}>{typeBadge.label}</span>
                          {curator.region && <span style={{ color: T.textSub, fontSize: 13, fontFamily: T.font }}>📍 {curator.region}</span>}
                          {curator.followers > 0 && <span style={{ color: T.textSub, fontSize: 13, fontFamily: T.font }}>👥 {Number(curator.followers).toLocaleString()}</span>}
                        </div>
                        {/* Platform + links */}
                        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                          {curator.playlist && (
                            <span style={{ color: T.text, fontSize: 13, fontWeight: 600, fontFamily: T.font }}>
                              {curator.url
                                ? <a href={curator.url} target="_blank" rel="noopener noreferrer" style={{ color: T.accent, textDecoration: 'none' }}>{curator.playlist} ↗</a>
                                : curator.playlist}
                            </span>
                          )}
                          {curator.playlist_url && (
                            <a href={curator.playlist_url} target="_blank" rel="noopener noreferrer" style={{ color: T.accent, fontSize: 12, fontFamily: T.font, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                              🎵 Playlist ↗
                            </a>
                          )}
                        </div>
                      </div>
                      {/* Edit button */}
                      <button onClick={startEdit} style={{
                        padding: '8px 18px', border: `1px solid ${T.border}`,
                        borderRadius: 8, background: T.white, color: T.textSub,
                        fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: T.font,
                        transition: 'all 0.15s', flexShrink: 0,
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSub; }}
                      >✏️ Edit Profile <span style={{ color: T.textMuted, fontWeight: 400 }}>/ 編集</span></button>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                {curator.bio && (
                  <div style={{ color: T.textSub, fontSize: 13, lineHeight: 1.7, marginBottom: 16, padding: '12px 14px', background: T.bg, borderRadius: 8, border: `1px solid ${T.border}`, fontFamily: T.font }}>
                    {curator.bio}
                  </div>
                )}

                {/* Tags sections */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {curator.genres?.length > 0 && (
                    <div>
                      <SectionLabel>Genres / ジャンル</SectionLabel>
                      <PillRow items={curator.genres} color={T.accent} bg={T.accentLight} border={T.accentBorder} />
                    </div>
                  )}
                  {curator.accepts?.length > 0 && (
                    <div>
                      <SectionLabel>Also Accepts / その他受付</SectionLabel>
                      <PillRow items={curator.accepts} color="#0369a1" bg="#e0f2fe" border="#bae6fd" />
                    </div>
                  )}
                  {curator.preferred_moods?.length > 0 && (
                    <div>
                      <SectionLabel>Moods / ムード</SectionLabel>
                      <PillRow items={curator.preferred_moods} color="#7c3aed" bg="#ede9fe" border="#ddd6fe" />
                    </div>
                  )}
                  {curator.opportunities?.length > 0 && (
                    <div>
                      <SectionLabel>Opportunities / 提供できる機会</SectionLabel>
                      <PillRow items={curator.opportunities.map(v => OPPORTUNITY_OPTIONS.find(o => o.value === v)?.en || v)} color="#059669" bg="#d1fae5" border="#a7f3d0" />
                    </div>
                  )}
                  {curator.similar_artists?.length > 0 && (
                    <div>
                      <SectionLabel>Music Similar To / こんな音楽が好き</SectionLabel>
                      <PillRow items={curator.similar_artists} color="#b45309" bg="#fef3c7" border="#fde68a" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ピッチ統計カード ── */}
        {curator && (
          <div className="stats-grid" style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24,
          }}>
            {[
              { label: 'Total', ja: '合計', val: counts.all, color: T.text, bg: T.white },
              { label: 'Pending', ja: '未対応', val: counts.sent, color: '#d97706', bg: '#fef3c7' },
              { label: 'Accepted', ja: '承認', val: counts.accepted, color: '#059669', bg: '#d1fae5' },
              { label: 'Rejected', ja: '却下', val: counts.rejected, color: '#dc2626', bg: '#fee2e2' },
            ].map(s => (
              <div key={s.label} style={{
                background: s.bg, border: `1px solid ${T.border}`, borderRadius: 12,
                padding: '14px 16px', textAlign: 'center', boxShadow: T.shadow,
              }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: s.color, fontFamily: T.fontDisplay }}>{s.val}</div>
                <div style={{ fontSize: 11, color: s.color, lineHeight: 1.4, fontFamily: T.font, opacity: 0.8, marginTop: 2 }}>{s.label} / {s.ja}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── フィルタータブ ── */}
        <div className="dash-filter-tabs" style={{ display: 'flex', marginBottom: 24, borderBottom: `2px solid ${T.border}` }}>
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
                  <span style={{ background: isActive ? T.accent : T.border, color: isActive ? '#fff' : T.textSub, borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700, fontFamily: T.font }}>{cnt}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── ピッチ一覧 ── */}
        {pitches.length === 0 ? (
          <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.radiusLg, textAlign: 'center', padding: '48px 24px', boxShadow: T.shadow }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <p style={{ color: T.textMuted, fontSize: 14, fontFamily: T.font }}>No pitches yet. / まだピッチはありません。</p>
          </div>
        ) : (
          pitches.map(pitch => {
            const s = STATUS_LABELS[pitch.status] || STATUS_LABELS.sent;
            const isExpanded = expanded === pitch.id;
            const isBusy = updating === pitch.id;
            return (
              <div key={pitch.id} className="pitch-card" style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 12, padding: '18px 20px', marginBottom: 12, boxShadow: T.shadow }}>
                {/* ── ピッチヘッダー ── */}
                <div className="pitch-header" style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, flexShrink: 0, background: T.accentLight, border: `1px solid ${T.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎵</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ color: T.text, fontWeight: 700, fontSize: 15, fontFamily: T.font }}>{pitch.artist_name || 'Unknown Artist'}</span>
                      {pitch.artist_genre && <span style={{ color: T.textMuted, fontSize: 12, fontFamily: T.font }}>{pitch.artist_genre}</span>}
                      <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, color: s.color, background: s.bg, fontFamily: T.font }}>{s.en} / {s.ja}</span>
                    </div>
                    <div style={{ color: '#374151', fontSize: 13, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: T.font }}>
                      {pitch.subject || '(no subject)'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ color: T.textMuted, fontSize: 11, fontFamily: T.font }}>
                        {pitch.sent_at
                          ? new Date(pitch.sent_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })
                          : pitch.created_at
                          ? new Date(pitch.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })
                          : ''}
                      </span>
                      {pitch.song_link && (
                        <a href={pitch.song_link} target="_blank" rel="noopener noreferrer" style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                          background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0',
                          textDecoration: 'none', fontFamily: T.font,
                        }}>▶ Listen</a>
                      )}
                    </div>
                  </div>
                  <div className="pitch-actions" style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                    <button onClick={() => setExpanded(isExpanded ? null : pitch.id)} style={{ padding: '7px 14px', border: `1px solid ${T.accent}`, borderRadius: 8, background: T.white, color: T.accent, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: T.font, transition: 'all 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = T.accentLight}
                    onMouseLeave={e => e.currentTarget.style.background = T.white}
                    >{isExpanded ? 'Close / 閉じる' : 'Read / 読む'}</button>
                    {pitch.status !== 'sent' && (
                      <button onClick={() => handleAction(pitch.id, 'sent')} disabled={isBusy} style={{ padding: '7px 14px', border: `1px solid ${T.border}`, borderRadius: 8, background: T.white, color: T.textSub, fontSize: 11, cursor: isBusy ? 'not-allowed' : 'pointer', fontFamily: T.font }}>
                        Undo / 取り消し
                      </button>
                    )}
                  </div>
                </div>

                {/* ── 展開エリア ── */}
                {isExpanded && (
                  <div style={{ marginTop: 18, paddingTop: 18, borderTop: `1px solid ${T.border}` }}>
                    {pitch.body ? (
                      <pre style={{ color: '#374151', fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: T.font, margin: '0 0 20px', background: T.bg, borderRadius: 10, padding: '16px 18px', border: `1px solid ${T.border}` }}>
                        {renderBody(pitch.body)}
                      </pre>
                    ) : (
                      <p style={{ color: T.textMuted, fontSize: 13, textAlign: 'center', padding: '20px', background: T.bg, borderRadius: 10, border: `1px solid ${T.border}`, margin: '0 0 20px', fontFamily: T.font }}>
                        Pitch content not stored for this entry.<br /><span style={{ fontSize: 11 }}>このピッチの本文データは保存されていません。</span>
                      </p>
                    )}

                    {/* ── Feedback UI ── */}
                    <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, padding: '16px 18px' }}>
                      <div style={{ color: T.textSub, fontSize: 12, fontWeight: 700, marginBottom: 12, letterSpacing: 0.5, fontFamily: T.font }}>FEEDBACK / フィードバック</div>
                      <div className="pitch-fb-stars" style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                        {[1,2,3,4,5].map(star => (
                          <button key={star} onClick={() => setDraft(pitch.id, 'rating', star === (feedbackDraft[pitch.id]?.rating) ? 0 : star)} style={{ fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 3px', color: star <= (feedbackDraft[pitch.id]?.rating || 0) ? '#f59e0b' : '#d1d5db', minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>★</button>
                        ))}
                        {feedbackDraft[pitch.id]?.rating > 0 && <span style={{ color: '#f59e0b', fontSize: 12, alignSelf: 'center', fontFamily: T.font }}>{feedbackDraft[pitch.id].rating}/5</span>}
                      </div>
                      <textarea className="fb-input fb-textarea" value={feedbackDraft[pitch.id]?.text || ''} onChange={e => setDraft(pitch.id, 'text', e.target.value)} placeholder="Share your thoughts on this track... (Required for payment)" rows={4}
                        style={{ ...fbInp, border: `1px solid ${(feedbackDraft[pitch.id]?.text?.trim().length > 0 && feedbackDraft[pitch.id]?.text?.trim().length < 20) ? '#ef4444' : T.border}`, resize: 'vertical', minHeight: 100 }} />
                      {feedbackDraft[pitch.id]?.text?.trim().length > 0 && feedbackDraft[pitch.id]?.text?.trim().length < 20 && (
                        <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4, fontFamily: T.font }}>Minimum 20 characters ({feedbackDraft[pitch.id].text.trim().length}/20)</div>
                      )}
                      <div style={{ marginTop: 14, padding: '12px 14px', background: T.accentLight, border: `1px solid ${T.accentBorder}`, borderRadius: 10 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                          <input type="checkbox" checked={feedbackDraft[pitch.id]?.featured || false} onChange={e => setDraft(pitch.id, 'featured', e.target.checked)} style={{ accentColor: T.accent, width: 15, height: 15 }} />
                          <span style={{ color: T.accent, fontSize: 13, fontWeight: 700, fontFamily: T.font }}>Yes, I featured this track / はい、紹介しました</span>
                        </label>
                        {feedbackDraft[pitch.id]?.featured && (
                          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <select className="fb-input" value={feedbackDraft[pitch.id]?.platform || ''} onChange={e => setDraft(pitch.id, 'platform', e.target.value)} style={fbInp}>
                              <option value="">Platform / プラットフォーム...</option>
                              <option value="Spotify Playlist">Spotify Playlist</option>
                              <option value="Blog">Blog</option>
                              <option value="YouTube">YouTube</option>
                              <option value="Radio">Radio</option>
                              <option value="Other">Other</option>
                            </select>
                            <input type="url" className="fb-input" value={feedbackDraft[pitch.id]?.url || ''} onChange={e => setDraft(pitch.id, 'url', e.target.value)} placeholder="https://... *required" style={{ ...fbInp, border: `1px solid ${feedbackDraft[pitch.id]?.featured && !feedbackDraft[pitch.id]?.url?.trim() ? '#ef4444' : T.accent}` }} />
                            <input type="date" className="fb-input" value={feedbackDraft[pitch.id]?.date || new Date().toISOString().slice(0, 10)} onChange={e => setDraft(pitch.id, 'date', e.target.value)} style={fbInp} />
                          </div>
                        )}
                      </div>
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
                                <button onClick={() => handleAction(pitch.id, 'accepted')} disabled={!canAccept} style={{ padding: '9px 18px', border: 'none', borderRadius: 8, background: canAccept ? '#10b981' : T.border, color: '#fff', fontSize: 12, fontWeight: 700, cursor: canAccept ? 'pointer' : 'not-allowed', fontFamily: T.font }}>{isBusy ? '...' : '✅ Accept & Featured'}</button>
                                <button onClick={() => handleFeedbackOnly(pitch.id)} disabled={!canOther} style={{ padding: '9px 18px', border: 'none', borderRadius: 8, background: canOther ? T.accent : T.border, color: '#fff', fontSize: 12, fontWeight: 700, cursor: canOther ? 'pointer' : 'not-allowed', fontFamily: T.font }}>{isBusy ? '...' : '💬 Feedback Only'}</button>
                                <button onClick={() => handleAction(pitch.id, 'rejected')} disabled={!canOther} style={{ padding: '9px 18px', border: `1px solid ${canOther ? '#ef4444' : T.border}`, borderRadius: 8, background: T.white, color: canOther ? '#ef4444' : T.textMuted, fontSize: 12, fontWeight: 700, cursor: canOther ? 'pointer' : 'not-allowed', fontFamily: T.font }}>{isBusy ? '...' : '❌ Decline'}</button>
                              </>
                            )}
                          </div>
                        );
                      })()}
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
      <footer style={{ padding: '32px 24px', background: T.white, borderTop: `1px solid ${T.border}`, textAlign: 'center', fontFamily: T.font, fontSize: 13, color: T.textMuted }}>
        <span>OTONAMI — Connecting Japanese Music to the World</span>
        <span style={{ margin: '0 8px' }}>·</span>
        <span>TYCompany LLC / ILCJ</span>
      </footer>
    </div>
  );
}
