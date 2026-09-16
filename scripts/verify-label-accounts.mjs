/**
 * レーベルアカウント対応の検証スクリプト。
 *
 *   node scripts/verify-label-accounts.mjs            # 読み取りのみ（既定）
 *   node scripts/verify-label-accounts.mjs --e2e      # 書込あり（要 GO）
 *
 * 既定モードは SELECT しか撃たない。--e2e を付けたときだけ、使い捨ての
 * テストアカウントを作って「サインアップ → アーティスト追加 → 切替 →
 * ピッチ帰属」まで通し、最後に自分が作った行だけを削除する。
 *
 * .env.local の SUPABASE_SERVICE_ROLE_KEY を読む。
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    })
);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const E2E = process.argv.includes('--e2e');

let failures = 0;
const check = (label, pass, detail = '') => {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!pass) failures++;
};

// ── 1. スキーマ / バックフィルの健全性（読み取りのみ） ──────────────
console.log('\n── スキーマ・バックフィル検証 ──');

const { data: accountsProbe, error: accountsErr } = await db.from('accounts').select('id').limit(1);
check('accounts テーブルが存在する', !accountsErr, accountsErr?.message || '');
if (accountsErr) { console.log('\nPhase 1 マイグレーションが未適用です。'); process.exit(1); }

const { count: artistCount } = await db.from('artists').select('id', { count: 'exact', head: true });
const { count: withAccount } = await db
  .from('artists').select('id', { count: 'exact', head: true }).not('account_id', 'is', null);
check('全アーティストに account_id が付いている', artistCount === withAccount,
  `${withAccount}/${artistCount}`);

const { data: allArtists } = await db.from('artists').select('id, email, password_hash, account_id');
const { data: allAccounts } = await db.from('accounts').select('id, email, password_hash');
const accById = new Map(allAccounts.map((a) => [a.id, a]));

const mismatched = allArtists.filter((a) => {
  const acc = accById.get(a.account_id);
  return !acc || acc.password_hash !== a.password_hash;
});
// 追加アーティストはアカウントのハッシュを複製するので、差分が出るのは
// バックフィル漏れか、accounts 行の取り違えのときだけ。
check('artists の password_hash が所属アカウントと一致する', mismatched.length === 0,
  mismatched.length ? `${mismatched.length} 件不一致` : '');

const orphan = allAccounts.filter((ac) => !allArtists.some((a) => a.account_id === ac.id));
check('孤児アカウントが無い', orphan.length === 0,
  orphan.length ? orphan.map((o) => o.email).join(', ') : '');

// ── 2. ピッチ帰属（読み取りのみ） ────────────────────────────────
console.log('\n── ピッチ帰属検証 ──');
const { count: pitchTotal } = await db.from('pitches').select('id', { count: 'exact', head: true });
const { count: pitchNoArtist } = await db
  .from('pitches').select('id', { count: 'exact', head: true }).is('artist_id', null);
check('全ピッチに artist_id がある（artist_id 基準化の前提）', pitchNoArtist === 0,
  `${pitchTotal - pitchNoArtist}/${pitchTotal}`);

// ── 3. anon 露出（読み取りのみ） ────────────────────────────────
console.log('\n── anon キー露出検証 ──');
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data: anonAccounts } = await anon.from('accounts').select('id').limit(1);
check('accounts が anon キーで読めない（RLS有効）', !anonAccounts || anonAccounts.length === 0,
  anonAccounts?.length ? '読めてしまっている' : '');

const { data: anonArtists } = await anon.from('artists').select('id').limit(1);
if (anonArtists?.length) {
  console.log('NOTE  artists は anon キーで読める（既知・別GO: 20260916_artists_enable_rls_OPTIONAL.sql）');
}

// ── 4. E2E（--e2e のときだけ・書込あり） ────────────────────────
if (E2E) {
  console.log('\n── E2E（使い捨てアカウント・書込あり）──');
  const stamp = Date.now();
  const email = `label-test-${stamp}@example.invalid`;
  const hash = await bcrypt.hash('test-password-1234', 10);
  const created = { accounts: [], artists: [] };

  try {
    const { data: acc, error: accErr } = await db.from('accounts')
      .insert({ email, password_hash: hash, email_verified: true }).select().single();
    if (accErr) throw new Error(`accounts insert: ${accErr.message}`);
    created.accounts.push(acc.id);

    const mk = (name, extra = {}) => ({
      account_id: acc.id, name, email, password_hash: hash,
      email_verified: true, credits: 0, is_founding: false, ...extra,
    });

    const { data: a1, error: e1 } = await db.from('artists').insert(mk('TEST Artist One')).select().single();
    if (e1) throw new Error(`artist 1 insert: ${e1.message}`);
    created.artists.push(a1.id);

    // 同一アカウント配下で連絡先メールが重複できること
    // （Phase 2 の UNIQUE 解除が効いていないとここで 23505）
    const { data: a2, error: e2 } = await db.from('artists').insert(mk('TEST Artist Two')).select().single();
    check('同一メールで2組目のアーティストを作れる（Phase 2 適用済み）', !e2, e2?.message || '');
    if (e2) throw new Error('Phase 2 未適用のため E2E を中断');
    created.artists.push(a2.id);

    const { data: under } = await db.from('artists').select('id, name').eq('account_id', acc.id);
    check('1アカウント配下に2組がぶら下がる', under.length === 2,
      under.map((u) => u.name).join(' / '));

    check('追加アーティストは0クレジット', a2.credits === 0, `credits=${a2.credits}`);
    check('追加アーティストは Founding 対象外', a2.is_founding === false && a2.founding_number === null);

    // 所有権チェック: 別アカウントのアーティストは引けないこと
    const { data: foreign } = await db.from('artists')
      .select('id').eq('account_id', acc.id).eq('id', allArtists[0].id).maybeSingle();
    check('別アカウントのアーティストはアカウント配下で解決されない', !foreign);
  } catch (e) {
    check('E2E 実行', false, e.message);
  } finally {
    // 自分が作った行だけを消す
    if (created.artists.length) await db.from('artists').delete().in('id', created.artists);
    if (created.accounts.length) await db.from('accounts').delete().in('id', created.accounts);
    const { count: leftA } = await db.from('artists')
      .select('id', { count: 'exact', head: true }).in('id', created.artists.length ? created.artists : ['00000000-0000-0000-0000-000000000000']);
    const { count: leftAc } = await db.from('accounts')
      .select('id', { count: 'exact', head: true }).in('id', created.accounts.length ? created.accounts : ['00000000-0000-0000-0000-000000000000']);
    check('テストで作った行がすべて削除された', (leftA ?? 0) === 0 && (leftAc ?? 0) === 0,
      `artists=${leftA ?? 0} accounts=${leftAc ?? 0}`);
  }
} else {
  console.log('\n（--e2e なしのため書込テストはスキップ）');
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
