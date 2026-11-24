// Unit tests for lib/bio-en-edit.js (no network, no DB).
// Run: node --test scripts/test-bio-en-edit.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { decideBioEn, BIO_EN_MAX } from '../lib/bio-en-edit.js';

const NOW = new Date('2026-11-24T07:00:00Z');
const row = (o = {}) => ({ bio: '宅録を行なっています', bio_en: 'They do home recording.', bio_en_edited_at: null, ...o });

test('whole form posted, nothing changed → no patch, no re-translation', () => {
  const d = decideBioEn({ body: { bio: '宅録を行なっています', bio_en: 'They do home recording.' }, current: row(), now: NOW });
  assert.deepEqual(d, { patch: {}, regenerate: false, kept: false, error: null });
});

test('Japanese changed, English never hand-edited → re-translate', () => {
  const d = decideBioEn({ body: { bio: '宅録とドラム', bio_en: 'They do home recording.' }, current: row(), now: NOW });
  assert.equal(d.regenerate, true);
  assert.equal(d.kept, false);
});

test('Japanese changed, English hand-edited → keep it and flag the notice', () => {
  const d = decideBioEn({ body: { bio: '宅録とドラム', bio_en: 'They do home recording.' }, current: row({ bio_en_edited_at: '2026-11-20T00:00:00Z' }), now: NOW });
  assert.equal(d.regenerate, false);
  assert.equal(d.kept, true);
  assert.deepEqual(d.patch, {});
});

test('English edited by hand → stored with the stamp', () => {
  const d = decideBioEn({ body: { bio: '宅録を行なっています', bio_en: '  They record at home.  ' }, current: row(), now: NOW });
  assert.deepEqual(d.patch, { bio_en: 'They record at home.', bio_en_edited_at: NOW.toISOString() });
});

test('English from 「日本語から作り直す」, unchanged → stored without the stamp', () => {
  const d = decideBioEn({ body: { bio: '宅録とドラム', bio_en: 'They do home recording and drums.', bio_en_regenerated: true }, current: row({ bio_en_edited_at: '2026-11-20T00:00:00Z' }), now: NOW });
  assert.deepEqual(d.patch, { bio_en: 'They do home recording and drums.', bio_en_edited_at: null });
  assert.equal(d.regenerate, false);
});

test('English cleared → null, no stamp', () => {
  const d = decideBioEn({ body: { bio_en: '' }, current: row({ bio_en_edited_at: '2026-11-20T00:00:00Z' }), now: NOW });
  assert.deepEqual(d.patch, { bio_en: null, bio_en_edited_at: null });
});

test('too long → error, nothing written', () => {
  const d = decideBioEn({ body: { bio_en: 'x'.repeat(BIO_EN_MAX + 1) }, current: row(), now: NOW });
  assert.match(d.error, /2000/);
  assert.deepEqual(d.patch, {});
});

test('column not there yet → never writes the stamp, never "kept"', () => {
  const a = decideBioEn({ body: { bio_en: 'They record at home.' }, current: row(), now: NOW, hasEditedColumn: false });
  assert.deepEqual(a.patch, { bio_en: 'They record at home.' });
  const b = decideBioEn({ body: { bio: '宅録とドラム' }, current: row({ bio_en_edited_at: undefined }), now: NOW, hasEditedColumn: false });
  assert.equal(b.regenerate, true);
});
