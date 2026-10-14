/**
 * E2E for lib/credit-expiry.js against the live DB, on a disposable account.
 *
 *   node scripts/e2e-credit-expiry.mjs          # sequential: expiry + rerun no-op
 *   node scripts/e2e-credit-expiry.mjs --race   # also: two overlapping runs on one lot
 *                                               # (needs credit_tx_expiry_lot_uniq)
 *
 * Creates one account + one artist marked E2E-DISPOSABLE, writes synthetic
 * lots/spends/refunds into credit_transactions, runs expireDueLots scoped to
 * that artist only (real lots are never read), checks ledger vs balance, then
 * deletes everything it created. Sends no email.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { expireDueLots } from '../lib/credit-expiry.js';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '').trim()]; })
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const RACE = process.argv.includes('--race');

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
};

const H = 3600e3, D = 24 * H;
const now = Date.now();
const iso = (ms) => new Date(ms).toISOString();
const stamp = Date.now();
const email = `satoshiy339+e2e-expiry-${stamp}@gmail.com`;
const created = { account: null, artist: null };

async function ledger(row) {
  const { data, error } = await db.from('credit_transactions').insert(row).select('id').single();
  if (error) throw new Error(`ledger insert: ${error.message}`);
  if (row.amount !== 0) {
    const { error: rpcErr } = await db.rpc('increment_artist_credits', { p_artist_id: row.artist_id, p_amount: row.amount });
    if (rpcErr) throw new Error(`rpc: ${rpcErr.message}`);
  }
  return data.id;
}

async function state(artistId) {
  const { data: a } = await db.from('artists').select('credits').eq('id', artistId).single();
  const { data: rows } = await db.from('credit_transactions').select('amount, type, metadata').eq('artist_id', artistId);
  return { balance: a.credits, ledger: rows.reduce((s, r) => s + r.amount, 0), rows };
}

try {
  const hash = await bcrypt.hash('test-password-1234', 10);
  const { data: acc, error: accErr } = await db.from('accounts')
    .insert({ email, password_hash: hash, email_verified: true }).select().single();
  if (accErr) throw new Error(`accounts insert: ${accErr.message}`);
  created.account = acc.id;
  const { data: art, error: artErr } = await db.from('artists').insert({
    account_id: acc.id, name: 'TEST Credit Expiry E2E-DISPOSABLE', email, password_hash: hash,
    email_verified: true, credits: 0, is_founding: false, bio: 'E2E-DISPOSABLE',
  }).select().single();
  if (artErr) throw new Error(`artist insert: ${artErr.message}`);
  const A = created.artist = art.id;
  console.log(`artist ${A}`);

  const meta = (reason, start, end) => ({ reason, granted_at: iso(start), granted_by: 'e2e', ...(end ? { expires_at: iso(end) } : {}) });
  // Lots: C expires first, A next (both due), B in the future; plus a grant with no expiry.
  const lotA = await ledger({ artist_id: A, amount: 10, type: 'manual_adjustment', description: 'E2E-DISPOSABLE lot A', metadata: meta('e2e_lot_a', now - 31 * D, now - 1 * H) });
  const lotC = await ledger({ artist_id: A, amount: 4, type: 'manual_adjustment', description: 'E2E-DISPOSABLE lot C', metadata: meta('e2e_lot_c', now - 25 * D, now - 2 * H) });
  const lotB = await ledger({ artist_id: A, amount: 6, type: 'manual_adjustment', description: 'E2E-DISPOSABLE lot B', metadata: meta('e2e_lot_b', now - 5 * D, now + 25 * D) });
  await ledger({ artist_id: A, amount: 5, type: 'manual_adjustment', description: 'E2E-DISPOSABLE no-expiry', metadata: meta('e2e_no_expiry', now - 31 * D) });
  // Spends: p1 3cr, p2 2cr (later refunded), p3 4cr (still pending at expiry).
  await ledger({ artist_id: A, amount: -3, type: 'pitch_spend', description: 'E2E-DISPOSABLE', metadata: { pitch_id: `e2e-p1-${stamp}` }, created_at: iso(now - 20 * D) });
  await ledger({ artist_id: A, amount: -2, type: 'pitch_spend', description: 'E2E-DISPOSABLE', metadata: { pitch_id: `e2e-p2-${stamp}` }, created_at: iso(now - 19 * D) });
  await ledger({ artist_id: A, amount: 2, type: 'expiry_refund', description: 'E2E-DISPOSABLE', metadata: { pitch_id: `e2e-p2-${stamp}` }, created_at: iso(now - 12 * D) });
  await ledger({ artist_id: A, amount: -4, type: 'pitch_spend', description: 'E2E-DISPOSABLE', metadata: { pitch_id: `e2e-p3-${stamp}` }, created_at: iso(now - 10 * D) });

  // C(4) takes p1's 3 and 1 of p3; A(10) takes the other 3 of p3 → A unused 7, C unused 0.
  const before = await state(A);
  check('setup: balance = ledger = 18', before.balance === 18 && before.ledger === 18, `balance=${before.balance} ledger=${before.ledger}`);

  const notified = [];
  const r1 = await expireDueLots(db, { artistIds: [A], onExpired: (x) => { notified.push(x); } });
  const after = await state(A);
  const exp = after.rows.filter((r) => r.type === 'credit_expiry');
  const byLot = Object.fromEntries(exp.map((r) => [r.metadata.lot_tx_id, r]));
  check('run 1: 2 lots processed (A, C), B untouched', r1.processed.length === 2 && !byLot[lotB], JSON.stringify(r1.processed.map((p) => p.expired)));
  check('lot A expired 7 (amount -7)', byLot[lotA]?.amount === -7, `got ${byLot[lotA]?.amount}`);
  check('lot C expired 0 (marker row amount 0)', byLot[lotC]?.amount === 0, `got ${byLot[lotC]?.amount}`);
  check('lot A metadata: granted 10, net_consumed 3, lot_reason', byLot[lotA]?.metadata.granted === 10 && byLot[lotA]?.metadata.net_consumed === 3 && byLot[lotA]?.metadata.lot_reason === 'e2e_lot_a');
  check('balance 18 → 11 (= lot B 6 + no-expiry 5)', after.balance === 11, `balance=${after.balance}`);
  check('ledger sum = balance', after.ledger === after.balance, `ledger=${after.ledger}`);
  check('notification: once, for lot A, 7cr, balance 11', notified.length === 1 && notified[0].expired === 7 && notified[0].newBalance === 11, JSON.stringify(notified.map((n) => [n.expired, n.newBalance])));

  const r2 = await expireDueLots(db, { artistIds: [A], onExpired: (x) => { notified.push(x); } });
  const again = await state(A);
  check('run 2: no-op (idempotent)', r2.processed.length === 0 && again.balance === 11 && again.rows.filter((r) => r.type === 'credit_expiry').length === 2 && notified.length === 1);

  if (RACE) {
    const lotR = await ledger({ artist_id: A, amount: 5, type: 'manual_adjustment', description: 'E2E-DISPOSABLE lot R', metadata: meta('e2e_lot_r', now - 30 * D, now - 1 * H) });
    const [x, y] = await Promise.all([
      expireDueLots(db, { artistIds: [A] }),
      expireDueLots(db, { artistIds: [A] }),
    ]);
    const s = await state(A);
    const rows = s.rows.filter((r) => r.type === 'credit_expiry' && r.metadata.lot_tx_id === lotR);
    check('race: exactly one expiry row for lot R', rows.length === 1, `rows=${rows.length} runs=${x.processed.length}+${y.processed.length}`);
    check('race: balance 16 → 11 once', s.balance === 11 && s.ledger === 11, `balance=${s.balance} ledger=${s.ledger}`);
  }
} catch (e) {
  fail++;
  console.log('FAIL  exception:', e.message);
} finally {
  if (created.artist) await db.from('credit_transactions').delete().eq('artist_id', created.artist);
  if (created.artist) await db.from('artists').delete().eq('id', created.artist);
  if (created.account) await db.from('accounts').delete().eq('id', created.account);
  const { count: leftTx } = await db.from('credit_transactions').select('id', { count: 'exact', head: true }).eq('artist_id', created.artist || '00000000-0000-0000-0000-000000000000');
  const { count: leftA } = await db.from('artists').select('id', { count: 'exact', head: true }).ilike('name', '%E2E-DISPOSABLE%');
  check('cleanup: no disposable rows left', leftTx === 0 && leftA === 0, `tx=${leftTx} artists=${leftA}`);
}

console.log(`\n${pass}/${pass + fail} PASS`);
process.exit(fail ? 1 : 0);
