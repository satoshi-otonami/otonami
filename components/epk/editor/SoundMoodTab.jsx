'use client';
import {
  cardStyle,
  h3Style,
  inputStyle,
  subtleBtn,
  hintStyle,
  Field,
} from './editorStyles';

// Edits form.sound_scenes (array of { title_en, title_jp, desc_en, desc_jp }).
// Persisted by the header 保存 button via POST /api/epk/save.
export default function SoundMoodTab({ value, onChange }) {
  const scenes = Array.isArray(value) ? value : [];
  const update = (i, key, v) =>
    onChange(scenes.map((s, idx) => (idx === i ? { ...s, [key]: v } : s)));
  const add = () =>
    onChange([...scenes, { title_en: '', title_jp: '', desc_en: '', desc_jp: '' }]);
  const remove = (i) => onChange(scenes.filter((_, idx) => idx !== i));

  return (
    <div>
      <p style={hintStyle}>
        リスニングシーンを最大4つ。変更は画面右上の「保存」で確定します。
      </p>
      {scenes.map((s, i) => (
        <div key={i} style={cardStyle}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h3 style={h3Style}>シーン {i + 1}</h3>
            <button style={subtleBtn} onClick={() => remove(i)}>
              削除
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Title (EN)">
              <input
                style={inputStyle}
                value={s.title_en || ''}
                onChange={(e) => update(i, 'title_en', e.target.value)}
                placeholder="Late-night drives"
              />
            </Field>
            <Field label="Title (日本語)">
              <input
                style={inputStyle}
                value={s.title_jp || ''}
                onChange={(e) => update(i, 'title_jp', e.target.value)}
                placeholder="夜のドライブ"
              />
            </Field>
          </div>
          <Field label="Description (EN)">
            <textarea
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
              value={s.desc_en || ''}
              onChange={(e) => update(i, 'desc_en', e.target.value)}
            />
          </Field>
          <Field label="Description (日本語)">
            <textarea
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
              value={s.desc_jp || ''}
              onChange={(e) => update(i, 'desc_jp', e.target.value)}
            />
          </Field>
        </div>
      ))}
      {scenes.length < 4 && (
        <button style={subtleBtn} onClick={add}>
          ＋ シーンを追加
        </button>
      )}
    </div>
  );
}
