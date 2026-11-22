// Unit tests for lib/pending-curator.js (no network, no DB).
// Run: node --test scripts/test-pending-curator.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PENDING_CURATOR_TTL_MS,
  isCuratorIdShape,
  studioUrlForCurator,
  acceptableCuratorId,
  pendingCuratorColumns,
  isPendingFresh,
  consumePendingCurator,
} from '../lib/pending-curator.js';

// Minimal stand-in for the supabase-js query builder: enough for
// select/update + eq + select + maybeSingle on two tables.
function fakeDb({ curators = [], accounts = [], failCurators = false } = {}) {
  const tables = { curators, accounts };
  const calls = [];
  return {
    calls,
    tables,
    from(table) {
      const q = { table, filters: [], patch: null };
      const api = {
        select() { return api; },
        update(patch) { q.patch = patch; return api; },
        eq(col, val) { q.filters.push([col, val]); return api; },
        async maybeSingle() {
          calls.push({ table, filters: q.filters, patch: q.patch });
          if (table === 'curators' && failCurators) return { data: null, error: { message: 'boom' } };
          const rows = tables[table].filter((r) => q.filters.every(([c, v]) => r[c] === v));
          if (q.patch) {
            if (!rows.length) return { data: null, error: null };
            Object.assign(rows[0], q.patch);
            return { data: { id: rows[0].id }, error: null };
          }
          return { data: rows[0] || null, error: null };
        },
      };
      return api;
    },
  };
}

const PUBLIC = { id: 'juicymusiclab', is_seed: false, is_paused: false, email_verified: true };
const PAUSED = { id: 'paused-curator-1', is_seed: false, is_paused: true, email_verified: true };
const SEED = { id: 'seed-curator-1', is_seed: true, is_paused: false, email_verified: true };
const UNVERIFIED = { id: 'unverified-1', is_seed: false, is_paused: false, email_verified: false };
const QA = { id: 'qa-test-curator-1789898456725', is_seed: false, is_paused: false, email_verified: true };
const NOW = new Date('2026-11-22T12:00:00Z');

test('id shape: accepts DB-style slugs, rejects anything else', () => {
  for (const ok of ['juicymusiclab', 'naoto-kitayama-1795215763715', 'a', '0abc']) assert.equal(isCuratorIdShape(ok), true, ok);
  for (const bad of ['', '-abc', 'Juicy', 'a/b', '../x', 'a b', 'a?x=1', '//evil.com', 'x'.repeat(129), null, 42, {}]) {
    assert.equal(isCuratorIdShape(bad), false, String(bad));
  }
});

test('studio URL is built server-side from the id only', () => {
  assert.equal(studioUrlForCurator('juicymusiclab'), '/studio?curator_id=juicymusiclab');
});

test('acceptableCuratorId: only existing, public curators', async () => {
  const db = fakeDb({ curators: [PUBLIC, PAUSED, SEED, UNVERIFIED, QA] });
  assert.equal(await acceptableCuratorId(db, 'juicymusiclab'), 'juicymusiclab');
  assert.equal(await acceptableCuratorId(db, 'paused-curator-1'), null, 'paused');
  assert.equal(await acceptableCuratorId(db, 'seed-curator-1'), null, 'seed');
  assert.equal(await acceptableCuratorId(db, 'unverified-1'), null, 'unverified');
  assert.equal(await acceptableCuratorId(db, QA.id), null, 'TEST_CURATOR_IDS');
  assert.equal(await acceptableCuratorId(db, 'does-not-exist'), null, 'missing');
  const before = db.calls.length;
  assert.equal(await acceptableCuratorId(db, '//evil.com'), null, 'bad shape');
  assert.equal(db.calls.length, before, 'bad shape never reaches the DB');
});

test('acceptableCuratorId never throws on DB error', async () => {
  assert.equal(await acceptableCuratorId(fakeDb({ failCurators: true }), 'juicymusiclab'), null);
});

test('pendingCuratorColumns: columns for a valid id, {} otherwise', async () => {
  const db = fakeDb({ curators: [PUBLIC, PAUSED] });
  assert.deepEqual(await pendingCuratorColumns(db, 'juicymusiclab', NOW), {
    pending_curator_id: 'juicymusiclab',
    pending_curator_set_at: NOW.toISOString(),
  });
  assert.deepEqual(await pendingCuratorColumns(db, 'paused-curator-1', NOW), {});
  assert.deepEqual(await pendingCuratorColumns(db, undefined, NOW), {});
});

test('isPendingFresh: 14-day window', () => {
  const at = (ms) => ({ pending_curator_id: 'x', pending_curator_set_at: new Date(NOW.getTime() - ms).toISOString() });
  assert.equal(PENDING_CURATOR_TTL_MS, 14 * 24 * 3600 * 1000);
  assert.equal(isPendingFresh(at(0), NOW), true);
  assert.equal(isPendingFresh(at(PENDING_CURATOR_TTL_MS), NOW), true);
  assert.equal(isPendingFresh(at(PENDING_CURATOR_TTL_MS + 1), NOW), false);
  assert.equal(isPendingFresh(at(-60000), NOW), false, 'future timestamp');
  assert.equal(isPendingFresh({ pending_curator_id: 'x' }, NOW), false);
  assert.equal(isPendingFresh(null, NOW), false);
});

test('consume: returns the URL once, then nothing (cleared)', async () => {
  const acc = { id: 'acc-1', pending_curator_id: 'juicymusiclab', pending_curator_set_at: NOW.toISOString() };
  const db = fakeDb({ curators: [PUBLIC], accounts: [{ ...acc }] });
  assert.equal(await consumePendingCurator(db, acc, NOW), '/studio?curator_id=juicymusiclab');
  assert.equal(db.tables.accounts[0].pending_curator_id, null);
  assert.equal(db.tables.accounts[0].pending_curator_set_at, null);
  // a second login reads the (stale) account object but the row is cleared
  assert.equal(await consumePendingCurator(db, acc, NOW), null);
});

test('consume: expired → cleared, no URL', async () => {
  const old = new Date(NOW.getTime() - PENDING_CURATOR_TTL_MS - 1000).toISOString();
  const acc = { id: 'acc-2', pending_curator_id: 'juicymusiclab', pending_curator_set_at: old };
  const db = fakeDb({ curators: [PUBLIC], accounts: [{ ...acc }] });
  assert.equal(await consumePendingCurator(db, acc, NOW), null);
  assert.equal(db.tables.accounts[0].pending_curator_id, null);
});

test('consume: curator paused since signup → cleared, no URL', async () => {
  const acc = { id: 'acc-3', pending_curator_id: 'paused-curator-1', pending_curator_set_at: NOW.toISOString() };
  const db = fakeDb({ curators: [PAUSED], accounts: [{ ...acc }] });
  assert.equal(await consumePendingCurator(db, acc, NOW), null);
  assert.equal(db.tables.accounts[0].pending_curator_id, null);
});

test('consume: nothing pending → no DB write', async () => {
  const db = fakeDb({ accounts: [{ id: 'acc-4', pending_curator_id: null }] });
  assert.equal(await consumePendingCurator(db, { id: 'acc-4', pending_curator_id: null }, NOW), null);
  assert.equal(await consumePendingCurator(db, null, NOW), null);
  assert.equal(db.calls.length, 0);
});
