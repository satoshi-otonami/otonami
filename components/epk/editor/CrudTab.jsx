'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  cardStyle,
  h3Style,
  inputStyle,
  subtleBtn,
  primaryBtn,
  hintStyle,
  Field,
} from './editorStyles';

// Generic list editor for collection endpoints (Tour, Press). Each row loads
// from GET endpoint, edits in place (PATCH endpoint/:id), deletes (DELETE), and
// a draft card adds new rows (POST endpoint).
//
// fields: [{ key, label, type?: 'text'|'textarea'|'number'|'checkbox',
//            full?, placeholder?, checkboxLabel? }]
function FieldInput({ def, value, onChange }) {
  if (def.type === 'textarea') {
    return (
      <textarea
        rows={2}
        style={{ ...inputStyle, resize: 'vertical' }}
        value={value ?? ''}
        placeholder={def.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (def.type === 'checkbox') {
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
        {def.checkboxLabel || 'ON'}
      </label>
    );
  }
  if (def.type === 'number') {
    return (
      <input
        type="number"
        style={inputStyle}
        value={value ?? ''}
        placeholder={def.placeholder}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      />
    );
  }
  return (
    <input
      style={inputStyle}
      value={value ?? ''}
      placeholder={def.placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function RowForm({ fields, item, onChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {fields.map((def) => (
        <div key={def.key} style={def.full ? { gridColumn: '1 / -1' } : undefined}>
          <Field label={def.label}>
            <FieldInput
              def={def}
              value={item[def.key]}
              onChange={(v) => onChange(def.key, v)}
            />
          </Field>
        </div>
      ))}
    </div>
  );
}

export default function CrudTab({
  token,
  hasEpk,
  flash,
  endpoint,
  listKey,
  itemKey,
  fields,
  emptyDraft,
  title,
  hint,
  onCountChange,
}) {
  const [rows, setRows] = useState([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Report row count up to the editor (powers the completion ring). Guarded on
  // `loaded` so the initial empty state doesn't clobber the count the editor
  // already fetched from /api/epk/save before this tab was opened.
  useEffect(() => {
    if (loaded && onCountChange) onCountChange(rows.length);
  }, [rows, loaded, onCountChange]);

  const authHeaders = useCallback(
    () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }),
    [token]
  );

  // Empty number fields -> null (DB integer columns reject '').
  const clean = useCallback(
    (obj) => {
      const out = { ...obj };
      for (const def of fields) {
        if (def.type === 'number' && (out[def.key] === '' || out[def.key] === undefined)) {
          out[def.key] = null;
        }
      }
      return out;
    },
    [fields]
  );

  const load = useCallback(async () => {
    if (!hasEpk) {
      setLoaded(true);
      return;
    }
    try {
      const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setRows(data[listKey] || []);
    } catch {
      /* surfaced on save instead */
    } finally {
      setLoaded(true);
    }
  }, [endpoint, listKey, token, hasEpk]);

  useEffect(() => {
    load();
  }, [load]);

  const setRowField = (id, key, v) =>
    setRows((p) => p.map((r) => (r.id === id ? { ...r, [key]: v } : r)));

  const add = async () => {
    setBusy(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(clean(draft)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '追加に失敗しました');
      setRows((p) => [...p, data[itemKey]]);
      setDraft(emptyDraft);
      flash('追加しました');
    } catch (e) {
      flash(e.message, 'err');
    } finally {
      setBusy(false);
    }
  };

  const saveRow = async (row) => {
    setBusy(true);
    try {
      const res = await fetch(`${endpoint}/${row.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(clean(row)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '更新に失敗しました');
      flash('更新しました');
    } catch (e) {
      flash(e.message, 'err');
    } finally {
      setBusy(false);
    }
  };

  const delRow = async (id) => {
    setBusy(true);
    try {
      const res = await fetch(`${endpoint}/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || '削除に失敗しました');
      }
      setRows((p) => p.filter((r) => r.id !== id));
      flash('削除しました');
    } catch (e) {
      flash(e.message, 'err');
    } finally {
      setBusy(false);
    }
  };

  if (!hasEpk) {
    return (
      <div style={cardStyle}>
        <p style={{ margin: 0, color: '#8a8270', fontSize: 14 }}>
          先に画面右上の「保存」でEPKを作成してください。
        </p>
      </div>
    );
  }

  return (
    <div>
      {hint && <p style={hintStyle}>{hint}</p>}

      {rows.map((row) => (
        <div key={row.id} style={cardStyle}>
          <RowForm fields={fields} item={row} onChange={(k, v) => setRowField(row.id, k, v)} />
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button style={subtleBtn} disabled={busy} onClick={() => saveRow(row)}>
              更新
            </button>
            <button
              style={{ ...subtleBtn, color: '#c0392b', borderColor: '#f0c8c8' }}
              disabled={busy}
              onClick={() => delRow(row.id)}
            >
              削除
            </button>
          </div>
        </div>
      ))}

      {loaded && rows.length === 0 && (
        <p style={{ fontSize: 13, color: '#8a8270', marginBottom: 16 }}>
          まだ登録がありません。
        </p>
      )}

      <div style={{ ...cardStyle, border: '1px dashed #d8cdb8' }}>
        <h3 style={h3Style}>{title}</h3>
        <RowForm fields={fields} item={draft} onChange={(k, v) => setDraft((d) => ({ ...d, [k]: v }))} />
        <button
          style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }}
          disabled={busy}
          onClick={add}
        >
          ＋ 追加
        </button>
      </div>
    </div>
  );
}
