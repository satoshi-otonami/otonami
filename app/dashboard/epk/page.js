'use client';
import { useState, useEffect, useCallback } from 'react';

const GOLD = '#c4956a';
const CORAL = '#FF6B4A';
const PAPER = '#f7f3ec';
const INK = '#1a1a1a';

const FIELDS = [
  'tagline_en', 'tagline_jp',
  'pull_quote_en', 'pull_quote_jp',
  'bio_extended_en', 'bio_extended_jp',
  'featured_track_id',
  'contact_management_name', 'contact_management_email',
  'contact_sync_name', 'contact_sync_email',
  'contact_press_email',
];

function emptyForm() {
  return FIELDS.reduce((acc, k) => ({ ...acc, [k]: '' }), {});
}

const labelStyle = { display: 'block', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', color: '#6b6560', marginBottom: 6, textTransform: 'uppercase' };
const inputStyle = { width: '100%', padding: '11px 13px', borderRadius: 8, border: '1px solid #ddd5c8', fontSize: 14, fontFamily: 'DM Sans, sans-serif', background: '#fff', color: INK, boxSizing: 'border-box' };
const cardStyle = { background: '#fff', border: '1px solid #ece4d6', borderRadius: 14, padding: 24, marginBottom: 20 };
const h3Style = { fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700, color: INK, margin: '0 0 16px' };

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

export default function EpkEditorPage() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [tracks, setTracks] = useState([]);
  const [slug, setSlug] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [hasEpk, setHasEpk] = useState(false);
  const [msg, setMsg] = useState(null);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const flash = (text, kind = 'ok') => {
    setMsg({ text, kind });
    setTimeout(() => setMsg(null), 4000);
  };

  const hydrate = useCallback((epk, trackList) => {
    setTracks(trackList || []);
    if (epk) {
      setHasEpk(true);
      setSlug(epk.slug || '');
      setIsPublished(!!epk.is_published);
      setForm(FIELDS.reduce((acc, k) => ({ ...acc, [k]: epk[k] ?? '' }), {}));
    }
  }, []);

  // Auth + initial load
  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('artist_token') : null;
    if (!t) {
      window.location.href = '/artist/login';
      return;
    }
    setToken(t);
    (async () => {
      try {
        const res = await fetch('/api/epk/save', {
          headers: { Authorization: `Bearer ${t}` },
        });
        if (res.status === 401) {
          localStorage.removeItem('artist_token');
          window.location.href = '/artist/login';
          return;
        }
        const data = await res.json();
        hydrate(data.epk, data.tracks);
      } catch {
        flash('読み込みに失敗しました', 'err');
      } finally {
        setLoading(false);
      }
    })();
  }, [hydrate]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/epk/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '保存に失敗しました');
      setHasEpk(true);
      setSlug(data.epk.slug);
      setIsPublished(!!data.epk.is_published);
      flash('保存しました');
    } catch (e) {
      flash(e.message, 'err');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/epk/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_published: !isPublished }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '公開状態の変更に失敗しました');
      setIsPublished(!!data.epk.is_published);
      flash(data.epk.is_published ? '公開しました' : '非公開にしました');
    } catch (e) {
      flash(e.message, 'err');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: PAPER, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif', color: '#6b6560' }}>
        読み込み中…
      </div>
    );
  }

  const publicUrl = slug ? `https://otonami.io/epk/${slug}` : null;

  return (
    <div style={{ minHeight: '100vh', background: PAPER, fontFamily: 'DM Sans, sans-serif', color: INK, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #ece4d6', padding: '18px 24px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 880, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <a href="/artist/dashboard" style={{ fontSize: 12, color: GOLD, textDecoration: 'none', fontWeight: 700 }}>← ダッシュボード</a>
            <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, margin: '4px 0 0' }}>EPK エディター</h1>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 100, background: isPublished ? '#e6f6ec' : '#f1ede3', color: isPublished ? '#1a7f43' : '#8a8270' }}>
              {isPublished ? '● 公開中' : '○ 非公開'}
            </span>
            <button onClick={save} disabled={saving}
              style={{ padding: '10px 20px', borderRadius: 100, border: 'none', background: CORAL, color: '#fff', fontWeight: 700, fontSize: 14, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? '処理中…' : '保存'}
            </button>
            <button onClick={togglePublish} disabled={saving || !hasEpk}
              style={{ padding: '10px 20px', borderRadius: 100, border: `1px solid ${GOLD}`, background: '#fff', color: GOLD, fontWeight: 700, fontSize: 14, cursor: (saving || !hasEpk) ? 'not-allowed' : 'pointer', opacity: (!hasEpk) ? 0.5 : 1 }}>
              {isPublished ? '非公開にする' : '公開する'}
            </button>
            {publicUrl && (
              <a href={`/epk/${slug}`} target="_blank" rel="noopener noreferrer"
                style={{ padding: '10px 20px', borderRadius: 100, border: '1px solid #ddd5c8', color: INK, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
                プレビュー ↗
              </a>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 880, margin: '0 auto', padding: '24px' }}>
        {msg && (
          <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, fontSize: 14, fontWeight: 600, background: msg.kind === 'err' ? '#fdecec' : '#e6f6ec', color: msg.kind === 'err' ? '#c0392b' : '#1a7f43' }}>
            {msg.text}
          </div>
        )}
        {publicUrl && (
          <div style={{ marginBottom: 20, fontSize: 13, color: '#6b6560' }}>
            公開URL: <a href={`/epk/${slug}`} target="_blank" rel="noopener noreferrer" style={{ color: GOLD, fontWeight: 700 }}>{publicUrl}</a>
            {!isPublished && <span style={{ color: '#b08' }}> （プレビューは「公開する」後に表示されます）</span>}
          </div>
        )}

        {/* Hero */}
        <div style={cardStyle}>
          <h3 style={h3Style}>ヒーロー / Tagline</h3>
          <Field label="Tagline (English)">
            <textarea rows={2} style={{ ...inputStyle, resize: 'vertical' }} value={form.tagline_en} onChange={(e) => setField('tagline_en', e.target.value)} placeholder="A Tokyo instrumental ensemble fusing jazz, fusion, and pop…" />
          </Field>
          <Field label="Tagline (日本語)">
            <textarea rows={2} style={{ ...inputStyle, resize: 'vertical' }} value={form.tagline_jp} onChange={(e) => setField('tagline_jp', e.target.value)} placeholder="ジャズ、フュージョン、ポップを融合した…" />
          </Field>
        </div>

        {/* Featured track */}
        <div style={cardStyle}>
          <h3 style={h3Style}>フィーチャー楽曲</h3>
          <Field label="Featured Track">
            <select style={inputStyle} value={form.featured_track_id || ''} onChange={(e) => setField('featured_track_id', e.target.value)}>
              <option value="">（未選択）</option>
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </Field>
          {tracks.length === 0 && (
            <p style={{ fontSize: 13, color: '#8a8270', margin: 0 }}>楽曲が未登録です。ダッシュボードの「楽曲」から追加してください。</p>
          )}
        </div>

        {/* Bio */}
        <div style={cardStyle}>
          <h3 style={h3Style}>バイオグラフィー</h3>
          <Field label="Pull Quote (English)">
            <input style={inputStyle} value={form.pull_quote_en} onChange={(e) => setField('pull_quote_en', e.target.value)} placeholder="Instruments that sing…" />
          </Field>
          <Field label="Pull Quote (日本語)">
            <input style={inputStyle} value={form.pull_quote_jp} onChange={(e) => setField('pull_quote_jp', e.target.value)} placeholder="歌うように奏でる楽器たち。" />
          </Field>
          <Field label="Bio 本文 (English)">
            <textarea rows={6} style={{ ...inputStyle, resize: 'vertical' }} value={form.bio_extended_en} onChange={(e) => setField('bio_extended_en', e.target.value)} placeholder="空欄の場合はプロフィールの bio が使われます。改行で段落を分けます。" />
          </Field>
          <Field label="Bio 本文 (日本語)">
            <textarea rows={6} style={{ ...inputStyle, resize: 'vertical' }} value={form.bio_extended_jp} onChange={(e) => setField('bio_extended_jp', e.target.value)} />
          </Field>
        </div>

        {/* Contact */}
        <div style={cardStyle}>
          <h3 style={h3Style}>コンタクト</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Management 名義"><input style={inputStyle} value={form.contact_management_name} onChange={(e) => setField('contact_management_name', e.target.value)} /></Field>
            <Field label="Management Email"><input style={inputStyle} type="email" value={form.contact_management_email} onChange={(e) => setField('contact_management_email', e.target.value)} /></Field>
            <Field label="Sync/Licensing 名義"><input style={inputStyle} value={form.contact_sync_name} onChange={(e) => setField('contact_sync_name', e.target.value)} /></Field>
            <Field label="Sync/Licensing Email"><input style={inputStyle} type="email" value={form.contact_sync_email} onChange={(e) => setField('contact_sync_email', e.target.value)} /></Field>
          </div>
          <Field label="Press Email"><input style={inputStyle} type="email" value={form.contact_press_email} onChange={(e) => setField('contact_press_email', e.target.value)} /></Field>
        </div>
      </div>
    </div>
  );
}
