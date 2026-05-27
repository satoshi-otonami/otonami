'use client';
import { useState } from 'react';
import {
  cardStyle,
  h3Style,
  subtleBtn,
  primaryBtn,
  hintStyle,
  GOLD,
} from './editorStyles';

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '10px 0',
  borderTop: '1px solid #f1ede3',
};
const iconBtn = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: '1px solid #ddd5c8',
  background: '#fff',
  cursor: 'pointer',
  fontSize: 14,
  lineHeight: 1,
};

function trackLabel(t) {
  const year = t?.release_date ? new Date(t.release_date).getFullYear() : null;
  return [t?.title, year].filter(Boolean).join('  ·  ');
}

// Featured Playlist editor. Persists independently via PATCH /api/epk/playlist.
export default function PlaylistTab({ token, tracks, playlistIds, onSaved, flash }) {
  const valid = (playlistIds || []).filter((id) => tracks.some((t) => t.id === id));
  const [ids, setIds] = useState(valid);
  const [saving, setSaving] = useState(false);

  const byId = (id) => tracks.find((t) => t.id === id);
  const available = tracks.filter((t) => !ids.includes(t.id));
  const full = ids.length >= 5;

  const add = (id) => setIds((p) => (p.length >= 5 ? p : [...p, id]));
  const remove = (id) => setIds((p) => p.filter((x) => x !== id));
  const move = (i, dir) =>
    setIds((p) => {
      const j = i + dir;
      if (j < 0 || j >= p.length) return p;
      const next = [...p];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/epk/playlist', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ track_ids: ids }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '保存に失敗しました');
      flash('プレイリストを保存しました');
      onSaved?.(data.epk);
    } catch (e) {
      flash(e.message, 'err');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <p style={hintStyle}>
        最大5曲。先頭が <strong>★ Pinned</strong>（大きく表示される曲）です。
        並び順は ↑↓ で変更できます。
      </p>

      <div style={cardStyle}>
        <h3 style={h3Style}>あなたの楽曲</h3>
        {tracks.length === 0 && (
          <p style={{ fontSize: 13, color: '#8a8270', margin: 0 }}>
            楽曲が未登録です。ダッシュボードの「楽曲」から追加してください。
          </p>
        )}
        {available.map((t) => (
          <div key={t.id} style={rowStyle}>
            <span style={{ flex: 1, fontSize: 14 }}>{trackLabel(t)}</span>
            <button
              style={{ ...subtleBtn, opacity: full ? 0.4 : 1 }}
              disabled={full}
              onClick={() => add(t.id)}
            >
              ＋ 追加
            </button>
          </div>
        ))}
        {tracks.length > 0 && available.length === 0 && (
          <p style={{ fontSize: 13, color: '#8a8270', margin: '8px 0 0' }}>
            全曲を追加済みです。
          </p>
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={h3Style}>Featured Playlist（{ids.length}/5）</h3>
        {ids.length === 0 && (
          <p style={{ fontSize: 13, color: '#8a8270', margin: 0 }}>
            上の一覧から曲を追加してください。
          </p>
        )}
        {ids.map((id, i) => (
          <div key={id} style={rowStyle}>
            <span
              style={{
                minWidth: 56,
                fontWeight: 700,
                color: i === 0 ? GOLD : '#9a9284',
                fontSize: 14,
              }}
            >
              {i === 0 ? '★ 01' : String(i + 1).padStart(2, '0')}
            </span>
            <span style={{ flex: 1, fontSize: 14 }}>{trackLabel(byId(id))}</span>
            <button style={iconBtn} disabled={i === 0} onClick={() => move(i, -1)}>
              ↑
            </button>
            <button
              style={iconBtn}
              disabled={i === ids.length - 1}
              onClick={() => move(i, 1)}
            >
              ↓
            </button>
            <button
              style={{ ...iconBtn, color: '#c0392b', borderColor: '#f0c8c8' }}
              onClick={() => remove(id)}
            >
              ×
            </button>
          </div>
        ))}
        <button
          style={{ ...primaryBtn, marginTop: 18, opacity: saving ? 0.6 : 1 }}
          disabled={saving}
          onClick={save}
        >
          {saving ? '保存中…' : 'プレイリストを保存'}
        </button>
      </div>
    </div>
  );
}
