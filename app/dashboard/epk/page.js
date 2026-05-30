'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  GOLD,
  PAPER,
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

// ── Chapter nav config (drives the sidebar + completion ring). ids match the
//    `tab === '…'` blocks below. "設定" is intentionally excluded — it is always
//    shown but never counted toward completion (per spec C-4).
const CHAPTERS = [
  { id: 'hero', label: 'Hero',
    sub: () => '表紙・キャッチコピー',
    done: (s) => !!(s.form.tagline_en?.trim() && s.form.tagline_jp?.trim()) },
  { id: 'playlist', label: 'Playlist',
    sub: (s) => `代表曲 ${s.playlistIds.length}/5`,
    done: (s) => s.playlistIds.length >= 1 },
  { id: 'bio', label: 'Bio',
    sub: () => '物語 EN/JP',
    done: (s) => !!(s.form.bio_extended_en?.trim() && s.form.bio_extended_jp?.trim()) },
  { id: 'sound', label: 'Sound & Mood',
    sub: (s) => `聴きどころ ${s.form.sound_scenes.length}`,
    done: (s) => s.form.sound_scenes.length >= 1 },
  { id: 'fans', label: 'For Fans Of',
    sub: (s) => `参考アーティスト ${s.form.for_fans_of.length}`,
    done: (s) => s.form.for_fans_of.length >= 1 },
  { id: 'tour', label: 'Tour',
    sub: (s) => (s.tourCount > 0 ? `実績 ${s.tourCount}件` : '実績・ハイライト'),
    done: (s) => s.tourCount >= 1 },
  { id: 'press', label: 'Press',
    sub: (s) => (s.pressCount > 0 ? `引用 ${s.pressCount}` : '引用なし'),
    done: (s) => s.pressCount >= 1 },
  { id: 'contact', label: 'Contact',
    sub: () => '連絡先',
    done: (s) => !!s.form.contact_management_name?.trim() },
];

// Completion-ring circumference (r=23, matches the mock SVG geometry).
const RING_C = 2 * Math.PI * 23;

const CHAP_ICON_PATHS = {
  hero: <path d="M4 19V5l8 6 8-6v14" />,
  playlist: (
    <>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </>
  ),
  bio: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </>
  ),
  sound: <path d="M3 18V6l4-2 4 2 4-2 4 2v12l-4 2-4-2-4 2Z" />,
  fans: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  tour: <path d="M3 6h18M3 12h18M3 18h18" />,
  press: <path d="M4 4h16v12H5.2L4 17.5Z" />,
  contact: (
    <>
      <path d="M4 4h16v16H4Z" />
      <path d="m4 6 8 6 8-6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </>
  ),
};

function ChapIcon({ id }) {
  return (
    <svg className="ico" viewBox="0 0 24 24" style={{ width: 16, height: 16 }}>
      {CHAP_ICON_PATHS[id]}
    </svg>
  );
}

// "英訳する" — half-automatic JA→EN draft button for the Bio/Hero English fields.
// The note makes explicit this is a draft the artist must review before saving.
function TranslateButton({ label, busy, onClick }) {
  return (
    <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <button type="button" className="a-ghost" onClick={onClick} disabled={busy} style={{ fontSize: 12.5 }}>
        {busy ? (
          '翻訳中…'
        ) : (
          <>
            <svg className="ico" viewBox="0 0 24 24" style={{ width: 14, height: 14 }}>
              <path d="M4 5h7M9 3v2c0 4-2 7-6 8M5 9c0 3 3 5 7 5" />
              <path d="m13 21 4-9 4 9M14.5 18h5" />
            </svg>
            {label}
          </>
        )}
      </button>
      <span style={{ fontSize: 11.5, color: '#9c8d80', lineHeight: 1.5 }}>
        AIによる下訳です。固有名詞・ニュアンスを確認してから保存してください。
      </span>
    </div>
  );
}

const EDITOR_CSS = `
.epk-ed2{
  --coral:#FF6B4A;--coral-d:#E04E2E;--pink:#FF3D6E;--gold:#c4956a;--teal:#16a085;
  --paper:#FBF4EC;--card:#fff;--cream2:#F4EADF;--ink:#241c17;--ink2:#6b5d52;--ink3:#9c8d80;
  --line:rgba(60,40,28,.10);--line2:rgba(60,40,28,.18);
  --sunset:linear-gradient(135deg,#FF6B4A 0%,#FF3D6E 60%,#c4956a 100%);
  --sora:'Sora',sans-serif;--dm:'DM Sans',sans-serif;--jp:'Noto Sans JP',sans-serif;
  min-height:100vh;
  background:
    radial-gradient(700px 380px at 88% -8%, rgba(255,107,74,.14), transparent 62%),
    radial-gradient(620px 460px at -5% 105%, rgba(196,149,106,.12), transparent 58%),
    var(--paper);
  color:var(--ink);font-family:var(--dm),var(--jp);line-height:1.6;
  -webkit-font-smoothing:antialiased;padding:40px 24px 90px;
}
.epk-ed2 *{box-sizing:border-box}
.epk-ed2 .ed-wrap{max-width:1080px;margin:0 auto}
.epk-ed2 .editor{border-radius:24px;border:1px solid var(--line2);background:var(--card);overflow:hidden;box-shadow:0 24px 60px -36px rgba(60,40,28,.45)}
.epk-ed2 .ed-head{display:flex;align-items:center;gap:18px;padding:22px 28px;border-bottom:1px solid var(--line);background:linear-gradient(90deg,#FFF3EC,var(--card) 62%)}
.epk-ed2 .logo-o{width:38px;height:38px;border-radius:11px;background:var(--sunset);display:flex;align-items:center;justify-content:center;flex:0 0 auto}
.epk-ed2 .logo-o span{display:flex;gap:2.5px;align-items:center}
.epk-ed2 .logo-o i{width:3px;border-radius:2px;background:#fff;display:block}
.epk-ed2 .ed-titles{flex:1;min-width:0}
.epk-ed2 .ed-kicker{font-family:var(--sora);font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink3)}
.epk-ed2 .ed-title{font-family:var(--sora);font-weight:700;font-size:19px;letter-spacing:-.01em;display:flex;align-items:center;gap:11px;color:var(--ink)}
.epk-ed2 .pill-found{font-family:var(--sora);font-size:10.5px;font-weight:600;letter-spacing:.08em;color:var(--gold);border:1px solid rgba(196,149,106,.55);padding:3px 9px;border-radius:20px;text-transform:uppercase;background:rgba(196,149,106,.08);white-space:nowrap}
.epk-ed2 .ring{position:relative;width:54px;height:54px;flex:0 0 auto}
.epk-ed2 .ring-num{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1}
.epk-ed2 .ring-num b{font-family:var(--sora);font-size:15px;font-weight:700;color:var(--coral-d)}
.epk-ed2 .ring-num small{font-size:8px;letter-spacing:.1em;color:var(--ink3);text-transform:uppercase;margin-top:1px}
.epk-ed2 .ed-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.epk-ed2 .pub-pill{font-family:var(--sora);font-size:12px;font-weight:600;padding:5px 12px;border-radius:100px;white-space:nowrap}
.epk-ed2 .a-ghost{font-family:var(--dm);font-weight:500;font-size:13.5px;color:var(--ink2);background:var(--card);border:1px solid var(--line2);padding:9px 15px;border-radius:10px;cursor:pointer;transition:.15s;display:inline-flex;align-items:center;gap:7px;text-decoration:none}
.epk-ed2 .a-ghost:hover{background:var(--cream2);color:var(--ink)}
.epk-ed2 .a-ghost:disabled{opacity:.5;cursor:not-allowed}
.epk-ed2 .a-save{font-family:var(--sora);font-weight:600;font-size:13.5px;color:#fff;background:var(--sunset);border:none;padding:10px 18px;border-radius:10px;cursor:pointer;transition:.15s;box-shadow:0 6px 16px -8px rgba(255,61,110,.6)}
.epk-ed2 .a-save:hover{filter:brightness(1.05)}
.epk-ed2 .a-save:disabled{opacity:.6;cursor:wait}
.epk-ed2 .ed-body{display:grid;grid-template-columns:236px 1fr;min-height:520px}
.epk-ed2 .nav{border-right:1px solid var(--line);padding:18px 14px;background:#FEFBF7}
.epk-ed2 .nav-h{font-family:var(--sora);font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink3);padding:0 10px 12px}
.epk-ed2 .chap{display:flex;align-items:center;gap:11px;padding:11px 12px;border-radius:11px;cursor:pointer;transition:.14s;position:relative;margin-bottom:2px;border:none;background:none;width:100%;text-align:left;font-family:var(--dm)}
.epk-ed2 .chap:hover{background:var(--cream2)}
.epk-ed2 .chap.on{background:linear-gradient(90deg,rgba(255,107,74,.14),rgba(255,61,110,.05))}
.epk-ed2 .chap.on::before{content:"";position:absolute;left:0;top:9px;bottom:9px;width:3px;border-radius:2px;background:var(--sunset)}
.epk-ed2 .chap-ico{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex:0 0 auto;background:var(--cream2);color:var(--ink2)}
.epk-ed2 .chap.on .chap-ico{background:var(--sunset);color:#fff}
.epk-ed2 .chap-t{flex:1;min-width:0}
.epk-ed2 .chap-t b{font-family:var(--sora);font-weight:500;font-size:14px;display:block;color:var(--ink)}
.epk-ed2 .chap.on .chap-t b{font-weight:600}
.epk-ed2 .chap-t small{font-size:11px;color:var(--ink3)}
.epk-ed2 .chk{width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:0 0 auto}
.epk-ed2 .chk.done{background:rgba(22,160,133,.14);color:var(--teal)}
.epk-ed2 .chk.empty{border:1.5px dashed var(--line2)}
.epk-ed2 .canvas{padding:30px 34px;display:grid;grid-template-columns:1fr 280px;gap:30px;background:var(--card)}
.epk-ed2 .form{min-width:0}
.epk-ed2 .preview{position:relative}
.epk-ed2 .pv-label{font-family:var(--sora);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink3);display:flex;align-items:center;gap:7px;margin-bottom:11px}
.epk-ed2 .dot-live{width:7px;height:7px;border-radius:50%;background:var(--teal);box-shadow:0 0 0 4px rgba(22,160,133,.16)}
.epk-ed2 .pv-card{border-radius:18px;overflow:hidden;border:1px solid var(--line2);background:#0f0c0b;box-shadow:0 14px 34px -20px rgba(60,40,28,.5)}
.epk-ed2 .pv-hero{height:120px;position:relative;background:linear-gradient(155deg,#2b1c3a,#6a2438 55%,#8a4a2e)}
.epk-ed2 .pv-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(15,12,11,.9),transparent 60%)}
.epk-ed2 .pv-jacket{position:absolute;right:14px;top:18px;width:62px;height:62px;border-radius:8px;border:1px solid rgba(255,255,255,.25);background:linear-gradient(135deg,#FF6B4A,#FF3D6E);z-index:1}
.epk-ed2 .pv-meta{position:absolute;left:16px;bottom:12px;z-index:1;right:16px}
.epk-ed2 .pv-meta .nm{font-family:var(--sora);font-weight:700;font-size:17px;color:#fff}
.epk-ed2 .pv-meta .tl{font-size:10.5px;color:rgba(255,255,255,.8);line-height:1.4;margin-top:3px}
.epk-ed2 .pv-body{padding:13px 16px 16px;background:#fff}
.epk-ed2 .pv-chip{display:inline-block;font-size:10px;font-family:var(--sora);letter-spacing:.04em;color:var(--coral-d);border:1px solid rgba(255,107,74,.4);padding:3px 9px;border-radius:14px;margin:0 5px 5px 0}
.epk-ed2 .pv-open{margin-top:8px;width:100%;text-align:center;font-family:var(--sora);font-size:12px;font-weight:500;color:var(--ink2);background:var(--card);border:1px solid var(--line2);border-radius:9px;padding:9px;cursor:pointer;transition:.15s;display:flex;align-items:center;justify-content:center;gap:6px;text-decoration:none}
.epk-ed2 .pv-open:hover{background:var(--cream2);color:var(--ink)}
.epk-ed2 .pv-note{font-size:11.5px;color:var(--ink3);margin-top:12px;line-height:1.5}
.epk-ed2 .ico{fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
@media(max-width:860px){
  .epk-ed2{padding:24px 12px 70px}
  .epk-ed2 .ed-head{flex-wrap:wrap}
  .epk-ed2 .ed-body{grid-template-columns:1fr}
  .epk-ed2 .nav{border-right:none;border-bottom:1px solid var(--line);display:flex;gap:6px;overflow-x:auto;padding:12px 10px}
  .epk-ed2 .nav-h{display:none}
  .epk-ed2 .chap{flex:0 0 auto;width:auto;flex-direction:column;gap:5px;margin-bottom:0;padding:8px 10px;text-align:center}
  .epk-ed2 .chap-t small,.epk-ed2 .chk{display:none}
  .epk-ed2 .chap.on::before{display:none}
  .epk-ed2 .canvas{grid-template-columns:1fr;padding:22px 18px}
  .epk-ed2 .preview{display:none}
}
`;

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
  const [artist, setArtist] = useState(null);
  const [tourCount, setTourCount] = useState(0);
  const [pressCount, setPressCount] = useState(0);
  const [translating, setTranslating] = useState(null); // 'bio' | 'tagline' while in-flight

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const flash = (text, kind = 'ok') => {
    setMsg({ text, kind });
    setTimeout(() => setMsg(null), 4000);
  };

  // Half-automatic JA→EN draft for the Bio/Hero English fields. Fills the
  // English textarea with a Claude draft for the artist to review; never
  // auto-saves, and never overwrites a non-empty English field without confirm.
  const translateField = async (field) => {
    const jpKey = field === 'bio' ? 'bio_extended_jp' : 'tagline_jp';
    const enKey = field === 'bio' ? 'bio_extended_en' : 'tagline_en';
    if (!(form[jpKey] || '').trim()) {
      flash('先に日本語を入力してください', 'err');
      return;
    }
    if (
      (form[enKey] || '').trim() &&
      !window.confirm('英語欄を下訳で置き換えますか？（現在の英文は失われます）')
    ) {
      return;
    }
    setTranslating(field);
    try {
      const res = await fetch('/api/epk/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ field, text_jp: form[jpKey] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '翻訳に失敗しました');
      setField(enKey, data.text_en);
      flash('英訳の下訳を生成しました。内容を確認して保存してください。');
    } catch (e) {
      flash(e.message, 'err');
    } finally {
      setTranslating(null);
    }
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
        setArtist(data.artist || null);
        setTourCount(data.tour_count || 0);
        setPressCount(data.press_count || 0);
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

  // ── Completion ring + chapter fulfillment (spec C-4) ──
  const cstate = { form, playlistIds, tourCount, pressCount };
  const doneCount = CHAPTERS.filter((c) => c.done(cstate)).length;
  const pct = Math.round((doneCount / CHAPTERS.length) * 100);
  const themeLabel =
    form.theme === 'sunset_citypop'
      ? 'Sunset CITYPOP'
      : form.theme === 'brutalist'
      ? 'Brutalist Indie'
      : 'Editorial Dark';

  return (
    <div className="epk-ed2">
      <style dangerouslySetInnerHTML={{ __html: EDITOR_CSS }} />
      <div className="ed-wrap">
        <div className="editor">
          {/* Header */}
          <div className="ed-head">
            <div className="logo-o">
              <span>
                <i style={{ height: 9 }} />
                <i style={{ height: 16 }} />
                <i style={{ height: 11 }} />
                <i style={{ height: 18 }} />
                <i style={{ height: 8 }} />
              </span>
            </div>
            <div className="ed-titles">
              <div className="ed-kicker">EPK Editor</div>
              <div className="ed-title">
                {artist?.name || 'あなたのEPK'}
                {artist?.is_founding && artist?.founding_number ? (
                  <span className="pill-found">◆ Founding #{artist.founding_number}</span>
                ) : null}
              </div>
            </div>
            <div className="ring" title={`完成度 ${pct}%`}>
              <svg width="54" height="54" viewBox="0 0 54 54">
                <circle cx="27" cy="27" r="23" fill="none" stroke="rgba(60,40,28,.12)" strokeWidth="5" />
                <circle
                  cx="27"
                  cy="27"
                  r="23"
                  fill="none"
                  stroke="#FF6B4A"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  strokeDashoffset={RING_C * (1 - pct / 100)}
                  transform="rotate(-90 27 27)"
                />
              </svg>
              <div className="ring-num">
                <b>{pct}%</b>
                <small>完成</small>
              </div>
            </div>
            <div className="ed-actions">
              <span
                className="pub-pill"
                style={{
                  background: isPublished ? '#e6f6ec' : '#f1ede3',
                  color: isPublished ? '#1a7f43' : '#8a8270',
                }}
              >
                {isPublished ? '● 公開中' : '○ 非公開'}
              </span>
              {publicUrl && (
                <a className="a-ghost" href={`/epk/${slug}`} target="_blank" rel="noopener noreferrer">
                  <svg className="ico" viewBox="0 0 24 24" style={{ width: 15, height: 15 }}>
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  プレビュー
                </a>
              )}
              <button className="a-save" onClick={save} disabled={saving}>
                {saving ? '処理中…' : '保存する'}
              </button>
              <button className="a-ghost" onClick={togglePublish} disabled={saving || !hasEpk}>
                {isPublished ? '非公開にする' : '公開する'}
              </button>
            </div>
          </div>

          <div className="ed-body">
            {/* Chapter nav */}
            <nav className="nav">
              <div className="nav-h">EPKの章</div>
              {CHAPTERS.map((c) => {
                const done = c.done(cstate);
                return (
                  <button
                    key={c.id}
                    className={`chap${tab === c.id ? ' on' : ''}`}
                    onClick={() => setTab(c.id)}
                  >
                    <span className="chap-ico">
                      <ChapIcon id={c.id} />
                    </span>
                    <span className="chap-t">
                      <b>{c.label}</b>
                      <small>{c.sub(cstate)}</small>
                    </span>
                    <span className={`chk ${done ? 'done' : 'empty'}`}>
                      {done && (
                        <svg className="ico" viewBox="0 0 24 24" style={{ width: 11, height: 11 }}>
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      )}
                    </span>
                  </button>
                );
              })}
              {/* 設定 — always available, not counted toward completion */}
              <button
                className={`chap${tab === 'settings' ? ' on' : ''}`}
                onClick={() => setTab('settings')}
              >
                <span className="chap-ico">
                  <ChapIcon id="settings" />
                </span>
                <span className="chap-t">
                  <b>設定</b>
                  <small>テーマ・URL</small>
                </span>
                <span className="chk" />
              </button>
            </nav>

            {/* Canvas */}
            <div className="canvas">
              <div className="form">
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
                    <TranslateButton
                      label="日本語から英訳する"
                      busy={translating === 'tagline'}
                      onClick={() => translateField('tagline')}
                    />
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
                    <TranslateButton
                      label="Bio本文を日本語から英訳する"
                      busy={translating === 'bio'}
                      onClick={() => translateField('bio')}
                    />
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
                    onCountChange={setTourCount}
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
                    onCountChange={setPressCount}
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
                        <option value="brutalist">Brutalist Indie</option>
                      </select>
                    </Field>
                    <p style={{ fontSize: 13, color: '#8a8270', margin: '4px 0 0' }}>
                      テーマを変更したら「保存する」を押してください。公開状態は右上のボタンから。
                    </p>
                  </div>
                )}
              </div>

              {/* Static public-page panel (full live preview = Phase 2) */}
              <aside className="preview">
                <div className="pv-label">
                  <span className="dot-live" />
                  公開ページ
                </div>
                <div className="pv-card">
                  <div className="pv-hero">
                    <div className="pv-jacket" />
                    <div className="pv-meta">
                      <div className="nm">{artist?.name || 'Artist'}</div>
                      <div className="tl">Electronic Press Kit</div>
                    </div>
                  </div>
                  <div className="pv-body">
                    <span className="pv-chip">{themeLabel}</span>
                    {isPublished && slug ? (
                      <a className="pv-open" href={`/epk/${slug}`} target="_blank" rel="noopener noreferrer">
                        公開ページを開く
                        <svg className="ico" viewBox="0 0 24 24" style={{ width: 12, height: 12 }}>
                          <path d="M7 17 17 7M7 7h10v10" />
                        </svg>
                      </a>
                    ) : (
                      <div className="pv-open" style={{ cursor: 'default' }}>
                        保存・公開すると表示されます
                      </div>
                    )}
                  </div>
                </div>
                <p className="pv-note">
                  フルのライブプレビューは近日対応予定です（Phase 2）。今は「公開ページを開く」で実際の表示を確認できます。
                </p>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
