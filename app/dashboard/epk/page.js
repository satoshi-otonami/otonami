'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  GOLD,
  CORAL,
  PAPER,
  INK,
  inputStyle,
  cardStyle,
  h3Style,
  Field,
} from '@/components/epk/editor/editorStyles';
import PlaylistTab from '@/components/epk/editor/PlaylistTab';
import SoundMoodTab from '@/components/epk/editor/SoundMoodTab';
import FansOfTab from '@/components/epk/editor/FansOfTab';
import CrudTab from '@/components/epk/editor/CrudTab';

// String fields persisted through POST /api/epk/save. featured_track_id is no
// longer edited here — it is kept in sync with the Playlist's pinned track.
const STRING_FIELDS = [
  'tagline_en',
  'tagline_jp',
  'pull_quote_en',
  'pull_quote_jp',
  'bio_extended_en',
  'bio_extended_jp',
  'contact_management_name',
  'contact_management_email',
  'contact_sync_name',
  'contact_sync_email',
  'contact_press_email',
];

const TABS = [
  { id: 'hero', label: 'Hero' },
  { id: 'playlist', label: 'Playlist' },
  { id: 'bio', label: 'Bio' },
  { id: 'sound', label: 'Sound & Mood' },
  { id: 'fans', label: 'For Fans Of' },
  { id: 'tour', label: 'Tour' },
  { id: 'press', label: 'Press' },
  { id: 'contact', label: 'Contact' },
  { id: 'settings', label: '設定' },
];

const TOUR_FIELDS = [
  { key: 'year', label: '年 (Year)', placeholder: '2025' },
  { key: 'location', label: '場所 (Location)', placeholder: 'Austin · USA' },
  { key: 'event_en', label: 'イベント (EN)', full: true, placeholder: 'SXSW — Tenth Appearance' },
  { key: 'event_jp', label: 'イベント (日本語)', full: true },
  { key: 'is_highlight', label: 'ハイライト', type: 'checkbox', checkboxLabel: 'ハイライトとして表示' },
  { key: 'sort_order', label: '並び順 (小さいほど先)', type: 'number', placeholder: '0' },
  { key: 'highlight_count', label: 'ハイライト数値 (例: 10)', type: 'number' },
  { key: 'highlight_label', label: 'ハイライトのラベル', full: true, placeholder: 'SXSW Performances' },
];
const TOUR_DRAFT = {
  year: '',
  event_en: '',
  event_jp: '',
  location: '',
  is_highlight: false,
  sort_order: 0,
  highlight_count: '',
  highlight_label: '',
};

const PRESS_FIELDS = [
  { key: 'source', label: 'メディア名 (Source) ※必須', placeholder: 'TimeOut Tokyo' },
  { key: 'date_label', label: '日付ラベル', placeholder: '2025' },
  { key: 'quote_en', label: '引用 (EN)', type: 'textarea', full: true },
  { key: 'quote_jp', label: '引用 (日本語)', type: 'textarea', full: true },
  { key: 'source_url', label: 'ソースURL', full: true, placeholder: 'https://…' },
  { key: 'sort_order', label: '並び順 (小さいほど先)', type: 'number', placeholder: '0' },
];
const PRESS_DRAFT = {
  source: '',
  date_label: '',
  quote_en: '',
  quote_jp: '',
  source_url: '',
  sort_order: 0,
};

function emptyForm() {
  return {
    ...STRING_FIELDS.reduce((acc, k) => ({ ...acc, [k]: '' }), {}),
    theme: 'editorial_dark',
    sound_scenes: [],
    for_fans_of: [],
  };
}

export default function EpkEditorPage() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [tracks, setTracks] = useState([]);
  const [playlistIds, setPlaylistIds] = useState([]);
  const [slug, setSlug] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [hasEpk, setHasEpk] = useState(false);
  const [msg, setMsg] = useState(null);
  const [tab, setTab] = useState('hero');

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
      setPlaylistIds(Array.isArray(epk.playlist_track_ids) ? epk.playlist_track_ids : []);
      setForm({
        ...STRING_FIELDS.reduce((acc, k) => ({ ...acc, [k]: epk[k] ?? '' }), {}),
        theme: epk.theme || 'editorial_dark',
        sound_scenes: Array.isArray(epk.sound_scenes) ? epk.sound_scenes : [],
        for_fans_of: Array.isArray(epk.for_fans_of) ? epk.for_fans_of : [],
      });
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
        const res = await fetch('/api/epk/save', { headers: { Authorization: `Bearer ${t}` } });
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

  // Saves the main form (Hero / Bio / Contact / Sound & Mood / For Fans Of).
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
      <div
        style={{
          minHeight: '100vh',
          background: PAPER,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'DM Sans, sans-serif',
          color: '#6b6560',
        }}
      >
        読み込み中…
      </div>
    );
  }

  const publicUrl = slug ? `https://otonami.io/epk/${slug}` : null;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: PAPER,
        fontFamily: 'DM Sans, sans-serif',
        color: INK,
        paddingBottom: 80,
      }}
    >
      {/* Header */}
      <div
        style={{
          background: '#fff',
          borderBottom: '1px solid #ece4d6',
          padding: '18px 24px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: 880,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <a href="/artist/dashboard" style={{ fontSize: 12, color: GOLD, textDecoration: 'none', fontWeight: 700 }}>
              ← ダッシュボード
            </a>
            <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, margin: '4px 0 0' }}>
              EPK エディター
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: '5px 12px',
                borderRadius: 100,
                background: isPublished ? '#e6f6ec' : '#f1ede3',
                color: isPublished ? '#1a7f43' : '#8a8270',
              }}
            >
              {isPublished ? '● 公開中' : '○ 非公開'}
            </span>
            <button
              onClick={save}
              disabled={saving}
              style={{
                padding: '10px 20px',
                borderRadius: 100,
                border: 'none',
                background: CORAL,
                color: '#fff',
                fontWeight: 700,
                fontSize: 14,
                cursor: saving ? 'wait' : 'pointer',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? '処理中…' : '保存'}
            </button>
            <button
              onClick={togglePublish}
              disabled={saving || !hasEpk}
              style={{
                padding: '10px 20px',
                borderRadius: 100,
                border: `1px solid ${GOLD}`,
                background: '#fff',
                color: GOLD,
                fontWeight: 700,
                fontSize: 14,
                cursor: saving || !hasEpk ? 'not-allowed' : 'pointer',
                opacity: !hasEpk ? 0.5 : 1,
              }}
            >
              {isPublished ? '非公開にする' : '公開する'}
            </button>
            {publicUrl && (
              <a
                href={`/epk/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '10px 20px',
                  borderRadius: 100,
                  border: '1px solid #ddd5c8',
                  color: INK,
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: 'none',
                }}
              >
                プレビュー ↗
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '20px 24px 0' }}>
        <div
          style={{
            display: 'flex',
            gap: 4,
            overflowX: 'auto',
            borderBottom: '1px solid #ece4d6',
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '10px 14px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                color: tab === t.id ? INK : '#9a9284',
                borderBottom: tab === t.id ? `2px solid ${CORAL}` : '2px solid transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 880, margin: '0 auto', padding: '24px' }}>
        {msg && (
          <div
            style={{
              marginBottom: 16,
              padding: '12px 16px',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              background: msg.kind === 'err' ? '#fdecec' : '#e6f6ec',
              color: msg.kind === 'err' ? '#c0392b' : '#1a7f43',
            }}
          >
            {msg.text}
          </div>
        )}
        {publicUrl && (
          <div style={{ marginBottom: 20, fontSize: 13, color: '#6b6560' }}>
            公開URL:{' '}
            <a href={`/epk/${slug}`} target="_blank" rel="noopener noreferrer" style={{ color: GOLD, fontWeight: 700 }}>
              {publicUrl}
            </a>
            {!isPublished && <span style={{ color: '#b08' }}> （プレビューは「公開する」後に表示されます）</span>}
          </div>
        )}

        {tab === 'hero' && (
          <div style={cardStyle}>
            <h3 style={h3Style}>ヒーロー / Tagline</h3>
            <Field label="Tagline (English)">
              <textarea
                rows={2}
                style={{ ...inputStyle, resize: 'vertical' }}
                value={form.tagline_en}
                onChange={(e) => setField('tagline_en', e.target.value)}
                placeholder="A Tokyo instrumental ensemble fusing jazz, fusion, and pop…"
              />
            </Field>
            <Field label="Tagline (日本語)">
              <textarea
                rows={2}
                style={{ ...inputStyle, resize: 'vertical' }}
                value={form.tagline_jp}
                onChange={(e) => setField('tagline_jp', e.target.value)}
                placeholder="ジャズ、フュージョン、ポップを融合した…"
              />
            </Field>
          </div>
        )}

        {tab === 'playlist' && (
          <PlaylistTab
            token={token}
            tracks={tracks}
            playlistIds={playlistIds}
            flash={flash}
            onSaved={(epk) => setPlaylistIds(epk?.playlist_track_ids || [])}
          />
        )}

        {tab === 'bio' && (
          <div style={cardStyle}>
            <h3 style={h3Style}>バイオグラフィー</h3>
            <Field label="Pull Quote (English)">
              <input
                style={inputStyle}
                value={form.pull_quote_en}
                onChange={(e) => setField('pull_quote_en', e.target.value)}
                placeholder="Instruments that sing…"
              />
            </Field>
            <Field label="Pull Quote (日本語)">
              <input
                style={inputStyle}
                value={form.pull_quote_jp}
                onChange={(e) => setField('pull_quote_jp', e.target.value)}
                placeholder="歌うように奏でる楽器たち。"
              />
            </Field>
            <Field label="Bio 本文 (English)">
              <textarea
                rows={6}
                style={{ ...inputStyle, resize: 'vertical' }}
                value={form.bio_extended_en}
                onChange={(e) => setField('bio_extended_en', e.target.value)}
                placeholder="空欄の場合はプロフィールの bio が使われます。改行で段落を分けます。"
              />
            </Field>
            <Field label="Bio 本文 (日本語)">
              <textarea
                rows={6}
                style={{ ...inputStyle, resize: 'vertical' }}
                value={form.bio_extended_jp}
                onChange={(e) => setField('bio_extended_jp', e.target.value)}
              />
            </Field>
          </div>
        )}

        {tab === 'sound' && (
          <SoundMoodTab value={form.sound_scenes} onChange={(v) => setField('sound_scenes', v)} />
        )}

        {tab === 'fans' && (
          <FansOfTab value={form.for_fans_of} onChange={(v) => setField('for_fans_of', v)} />
        )}

        {tab === 'tour' && (
          <CrudTab
            token={token}
            hasEpk={hasEpk}
            flash={flash}
            endpoint="/api/epk/tour"
            listKey="tour"
            itemKey="tour"
            fields={TOUR_FIELDS}
            emptyDraft={TOUR_DRAFT}
            title="ツアー / ライブを追加"
            hint="ハイライト（SXSW ×10 など）はチェックを入れ、数値とラベルを設定。通常の公演はチェックなしで年・イベント名を入力します。"
          />
        )}

        {tab === 'press' && (
          <CrudTab
            token={token}
            hasEpk={hasEpk}
            flash={flash}
            endpoint="/api/epk/press"
            listKey="press"
            itemKey="press"
            fields={PRESS_FIELDS}
            emptyDraft={PRESS_DRAFT}
            title="プレス引用を追加"
            hint="メディア名は必須です。引用が無ければ空のままで構いません（セクションは非表示になります）。"
          />
        )}

        {tab === 'contact' && (
          <div style={cardStyle}>
            <h3 style={h3Style}>コンタクト</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Management 名義">
                <input style={inputStyle} value={form.contact_management_name} onChange={(e) => setField('contact_management_name', e.target.value)} />
              </Field>
              <Field label="Management Email">
                <input style={inputStyle} type="email" value={form.contact_management_email} onChange={(e) => setField('contact_management_email', e.target.value)} />
              </Field>
              <Field label="Sync/Licensing 名義">
                <input style={inputStyle} value={form.contact_sync_name} onChange={(e) => setField('contact_sync_name', e.target.value)} />
              </Field>
              <Field label="Sync/Licensing Email">
                <input style={inputStyle} type="email" value={form.contact_sync_email} onChange={(e) => setField('contact_sync_email', e.target.value)} />
              </Field>
            </div>
            <Field label="Press Email">
              <input style={inputStyle} type="email" value={form.contact_press_email} onChange={(e) => setField('contact_press_email', e.target.value)} />
            </Field>
          </div>
        )}

        {tab === 'settings' && (
          <div style={cardStyle}>
            <h3 style={h3Style}>設定</h3>
            <Field label="公開URL (slug)">
              <input style={{ ...inputStyle, background: '#f7f3ec', color: '#8a8270' }} value={slug || '（保存後に自動生成）'} readOnly />
            </Field>
            <Field label="テーマ">
              <select style={inputStyle} value={form.theme} onChange={(e) => setField('theme', e.target.value)}>
                <option value="editorial_dark">Editorial Dark</option>
                <option value="sunset_citypop">Sunset CITYPOP</option>
                <option value="brutalist" disabled>Brutalist（近日対応）</option>
              </select>
            </Field>
            <p style={{ fontSize: 13, color: '#8a8270', margin: '4px 0 0' }}>
              テーマを変更したら「保存」を押してください。公開状態は右上のボタンから。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
