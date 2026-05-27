'use client';
import {
  cardStyle,
  inputStyle,
  subtleBtn,
  hintStyle,
  Field,
} from './editorStyles';

// Edits form.for_fans_of (array of { name, tag }). Persisted by the header
// 保存 button via POST /api/epk/save. Empty -> public page falls back to
// artist.influences, then hides if both are empty.
export default function FansOfTab({ value, onChange }) {
  const fans = Array.isArray(value) ? value : [];
  const update = (i, key, v) =>
    onChange(fans.map((f, idx) => (idx === i ? { ...f, [key]: v } : f)));
  const add = () => onChange([...fans, { name: '', tag: '' }]);
  const remove = (i) => onChange(fans.filter((_, idx) => idx !== i));

  return (
    <div>
      <p style={hintStyle}>
        参考アーティストを最大6組。変更は画面右上の「保存」で確定します。
      </p>
      {fans.map((f, i) => (
        <div
          key={i}
          style={{
            ...cardStyle,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr auto',
            gap: 12,
            alignItems: 'end',
          }}
        >
          <Field label="名前 (Name)">
            <input
              style={inputStyle}
              value={f.name || ''}
              onChange={(e) => update(i, 'name', e.target.value)}
              placeholder="Snarky Puppy"
            />
          </Field>
          <Field label="タグ (Tag)">
            <input
              style={inputStyle}
              value={f.tag || ''}
              onChange={(e) => update(i, 'tag', e.target.value)}
              placeholder="jazz · fusion"
            />
          </Field>
          <button style={{ ...subtleBtn, marginBottom: 16 }} onClick={() => remove(i)}>
            削除
          </button>
        </div>
      ))}
      {fans.length < 6 && (
        <button style={subtleBtn} onClick={add}>
          ＋ 追加
        </button>
      )}
    </div>
  );
}
