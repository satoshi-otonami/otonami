/**
 * レーベルアカウント対応の実API E2E。
 *
 * ローカル dev サーバーの実ルートを踏む。**認証メールとOTPメールが実際に飛ぶ**ので、
 * 宛先は山下さんが受信できる実在アドレスに限る（実在しない宛先へ Resend から送ると
 * 送信ドメイン評価を傷めるため禁止）。キュレーターへのピッチ送信は行わない。
 *
 *   # 1) dev サーバーを起動（認証リンクが本番を指さないよう APP_URL を上書きする）
 *   NEXT_PUBLIC_APP_URL=http://localhost:3000 npm run dev
 *
 *   # 2) フェーズA: サインアップ → メール認証 → ログイン（ここでOTPメールが届く）
 *   node scripts/e2e-label-accounts-api.mjs
 *
 *   # 3) 受信箱の6桁コードを渡してフェーズB: OTP → 追加 → 切替 → 帰属 → 後片付け
 *   node scripts/e2e-label-accounts-api.mjs --resume --otp=123456
 *
 * 後片付けに失敗した場合は --cleanup で状態ファイルの行だけを消せる。
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { SignJWT, jwtVerify } from 'jose';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);

const BASE = process.env.E2E_BASE || 'http://localhost:3000';
const STATE = new URL('../.e2e-label-accounts.json', import.meta.url).pathname;
const MARKER = 'TEMP-TEST-REVERT-ME';
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const val = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split('=')[1];

// 本番を踏むのは事故なので明確に拒否する。
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE)) {
  console.error(`E2E_BASE が localhost ではありません: ${BASE}\n本番に対しては実行しません。`);
  process.exit(1);
}

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const SECRET = new TextEncoder().encode(env.JWT_SECRET);

let failures = 0;
const check = (label, pass, detail = '') => {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!pass) failures++;
};
const api = async (path, opts = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    redirect: 'manual',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  let body = null;
  try { body = await res.json(); } catch { body = null; }
  return { status: res.status, body, location: res.headers.get('location') };
};
const loadState = () => JSON.parse(readFileSync(STATE, 'utf8'));
const saveState = (s) => writeFileSync(STATE, JSON.stringify(s, null, 2));

async function cleanup(state, { verbose = true } = {}) {
  if (state.pitchIds?.length) await db.from('pitches').delete().in('id', state.pitchIds);
  if (state.artistIds?.length) await db.from('credit_transactions').delete().in('artist_id', state.artistIds);
  if (state.artistIds?.length) await db.from('artists').delete().in('id', state.artistIds);
  if (state.accountIds?.length) await db.from('accounts').delete().in('id', state.accountIds);
  if (state.email) await db.from('login_otps').delete().eq('email', state.email);

  // 残存確認: id 指定と MARKER 全走査の二重チェック
  const left = {};
  for (const [t, ids] of [['pitches', state.pitchIds], ['artists', state.artistIds], ['accounts', state.accountIds]]) {
    if (!ids?.length) { left[t] = 0; continue; }
    const { count } = await db.from(t).select('id', { count: 'exact', head: true }).in('id', ids);
    left[t] = count ?? 0;
  }
  const { count: otpLeft } = await db.from('login_otps')
    .select('id', { count: 'exact', head: true }).eq('email', state.email || 'x');
  left.login_otps = otpLeft ?? 0;

  const marked = {};
  for (const t of ['artists', 'accounts', 'pitches']) {
    const { data } = await db.from(t).select('*').ilike('email', `%e2e-%`).limit(50);
    const hits = (data || []).filter((r) => JSON.stringify(r).includes(MARKER) || /\+e2e-/.test(r.email || ''));
    marked[t] = hits.length;
  }
  if (verbose) {
    console.log('\n── 後片付け ──');
    console.log('  id指定での残存:', JSON.stringify(left));
    console.log(`  ${MARKER} / +e2e- マーカー残存:`, JSON.stringify(marked));
    const total = Object.values(left).reduce((a, b) => a + b, 0) + Object.values(marked).reduce((a, b) => a + b, 0);
    check(`${MARKER} 残存 0 件`, total === 0, `合計 ${total} 件`);
  }
  if (existsSync(STATE)) unlinkSync(STATE);
}

// ══════════════════════════════════════════════════════════
if (flag('cleanup')) {
  if (!existsSync(STATE)) { console.log('状態ファイルがありません。片付けるものはありません。'); process.exit(0); }
  await cleanup(loadState());
  process.exit(failures === 0 ? 0 : 1);
}

// ── フェーズA: サインアップ → メール認証 → ログイン ──────────────
if (!flag('resume')) {
  const stamp = Date.now();
  const email = process.env.E2E_EMAIL || `satoshiy339+e2e-${stamp}@gmail.com`;
  const password = `e2e-${stamp}-pw`;
  const state = { email, password, stamp, accountIds: [], artistIds: [], pitchIds: [] };
  console.log(`\n宛先: ${email}（実在アドレス）\nBASE: ${BASE}\n`);

  console.log('── 1. サインアップ POST /api/artists ──');
  const signup = await api('/api/artists', {
    method: 'POST',
    body: JSON.stringify({ name: `${MARKER} Artist A`, email, password, region: 'JP', genres: ['Pop'] }),
  });
  check('サインアップが成功する', signup.status === 200 && signup.body?.needsVerification === true,
    `http=${signup.status} ${JSON.stringify(signup.body)?.slice(0, 120)}`);
  if (signup.status !== 200) { saveState(state); await cleanup(state); process.exit(1); }

  const { data: acc } = await db.from('accounts').select('*').eq('email', email).maybeSingle();
  check('accounts 行が作られる', !!acc);
  if (acc) state.accountIds.push(acc.id);
  check('accounts.email_verified は false で始まる', acc?.email_verified === false);
  check('accounts.verification_token が発行される', !!acc?.verification_token);

  const { data: artistA } = await db.from('artists').select('*').eq('account_id', acc?.id || 'x').maybeSingle();
  check('artists 行が accounts にぶら下がる', !!artistA && artistA.account_id === acc?.id);
  if (artistA) state.artistIds.push(artistA.id);
  check('1組目には初回クレジットが付与される', (artistA?.credits ?? -1) > 0, `credits=${artistA?.credits}`);
  saveState(state);

  console.log('\n── 2. メール認証 GET /api/verify-email ──');
  const verify = await api(`/api/verify-email?token=${acc.verification_token}&type=artist`);
  check('認証リンクが /verify-success へリダイレクトする',
    [301, 302, 307, 308].includes(verify.status) && (verify.location || '').includes('/verify-success'),
    `http=${verify.status} location=${verify.location}`);

  const { data: accV } = await db.from('accounts').select('email_verified, verification_token').eq('id', acc.id).maybeSingle();
  check('accounts.email_verified が true になる', accV?.email_verified === true);
  check('verification_token が消える', accV?.verification_token === null);
  const { data: artV } = await db.from('artists').select('email_verified').eq('id', artistA.id).maybeSingle();
  check('artists.email_verified も同期される', artV?.email_verified === true);

  console.log('\n── 3. ログイン POST /api/artists/login（ここでOTPメールが飛ぶ）──');
  const login = await api('/api/artists/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  check('OTP要求が返る', login.status === 200 && login.body?.step === 'otp_required',
    `http=${login.status} ${JSON.stringify(login.body)?.slice(0, 120)}`);

  const { data: otpRow } = await db.from('login_otps').select('*').eq('email', email)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  check('login_otps に未使用行が積まれる', !!otpRow && otpRow.used === false);
  check('OTPはハッシュで保存される（平文でない）', /^\$2[aby]\$/.test(otpRow?.otp_code || ''),
    (otpRow?.otp_code || '').slice(0, 7));

  saveState(state);
  console.log(`\n${failures === 0 ? 'フェーズA ALL PASS' : `フェーズA ${failures} FAILED`}`);
  console.log(`\n次: ${email} に届いた6桁コードを使って`);
  console.log(`  node scripts/e2e-label-accounts-api.mjs --resume --otp=<6桁>`);
  console.log(`（中止する場合は node scripts/e2e-label-accounts-api.mjs --cleanup）`);
  process.exit(failures === 0 ? 0 : 1);
}

// ── フェーズB: OTP → 追加 → 切替 → 帰属 → 後片付け ────────────
const state = loadState();
const otp = val('otp');
if (!otp) { console.error('--otp=<6桁> が必要です。'); process.exit(1); }
console.log(`\n宛先: ${state.email}\nBASE: ${BASE}\n`);

console.log('── 4. OTP検証 POST /api/verify-otp ──');
const vo = await api('/api/verify-otp', {
  method: 'POST',
  body: JSON.stringify({ email: state.email, otp_code: otp, type: 'artist' }),
});
check('OTPが通りトークンが発行される', vo.status === 200 && !!vo.body?.token,
  `http=${vo.status} ${JSON.stringify(vo.body)?.slice(0, 140)}`);
if (!vo.body?.token) { await cleanup(state); process.exit(1); }

const tokenA = vo.body.token;
const { payload: payA } = await jwtVerify(tokenA, SECRET);
check('トークンに accountId が入る', payA.accountId === state.accountIds[0], String(payA.accountId));
check('トークンの artistId が1組目', payA.artistId === state.artistIds[0], String(payA.artistId));
check('レスポンスに artists 一覧が入る', Array.isArray(vo.body.artists) && vo.body.artists.length === 1);

const auth = (t) => ({ Authorization: `Bearer ${t}` });

console.log('\n── 5. アーティスト追加 POST /api/account/artists ──');
const add = await api('/api/account/artists', {
  method: 'POST', headers: auth(tokenA),
  body: JSON.stringify({ name: `${MARKER} Artist B`, genres: ['Rock'] }),
});
check('2組目が追加できる', add.status === 200 && !!add.body?.artist,
  `http=${add.status} ${JSON.stringify(add.body)?.slice(0, 140)}`);
if (!add.body?.artist) { await cleanup(state); process.exit(1); }
const artistB = add.body.artist;
state.artistIds.push(artistB.id); saveState(state);

check('追加アーティストは credits=0', artistB.credits === 0, `credits=${artistB.credits}`);
check('追加アーティストは Founding 対象外',
  artistB.is_founding === false && artistB.founding_number === null);
check('連絡先メールはアカウントのメールを既定で引き継ぐ', artistB.email === state.email, artistB.email);
check('追加後のトークンは2組目に切り替わっている',
  (await jwtVerify(add.body.token, SECRET)).payload.artistId === artistB.id);
const tokenB = add.body.token;

const list = await api('/api/account/artists', { headers: auth(tokenB) });
check('一覧に2組が並ぶ', list.body?.artists?.length === 2, `${list.body?.artists?.length} 組`);
check('上限が10として返る', list.body?.max_artists === 10, String(list.body?.max_artists));

console.log('\n── 6. ピッチ帰属（キュレーターへの送信はしない）──');
// 送信経路を踏むと実在キュレーターにメールが飛ぶので、帰属の確認だけを目的に
// service_role で pitches 行を直接2件入れる。ダッシュボードAPIが artist_id で
// 正しく分離するかを見る。
const mkPitch = (artistId, name) => ({
  artist_id: artistId, artist_name: name, artist_email: state.email,
  subject: `${MARKER} pitch`, body: `${MARKER}`, status: 'sent',
  sent_at: new Date().toISOString(), song_link: `https://example.invalid/${MARKER}/${artistId}`,
});
const { data: pitches, error: pErr } = await db.from('pitches')
  .insert([mkPitch(state.artistIds[0], `${MARKER} Artist A`), mkPitch(artistB.id, `${MARKER} Artist B`)])
  .select('id, artist_id');
check('検証用ピッチ2件を作成', !pErr && pitches?.length === 2, pErr?.message || '');
if (pitches) { state.pitchIds = pitches.map((p) => p.id); saveState(state); }

const dashA = await api('/api/artists', { headers: auth(tokenA) });
const dashB = await api('/api/artists', { headers: auth(tokenB) });
const idsOf = (d) => (d.body?.recentPitches || []).map((p) => p.id);
check('1組目のダッシュボードに2組目のピッチが混ざらない',
  idsOf(dashA).includes(pitches[0].id) && !idsOf(dashA).includes(pitches[1].id),
  `A=${idsOf(dashA).length}件`);
check('2組目のダッシュボードに1組目のピッチが混ざらない',
  idsOf(dashB).includes(pitches[1].id) && !idsOf(dashB).includes(pitches[0].id),
  `B=${idsOf(dashB).length}件`);
check('ダッシュボードが同一アカウントの2組を返す', dashB.body?.artists?.length === 2);

console.log('\n── 7. 切替と所有権 ──');
const back = await api('/api/account/switch', {
  method: 'POST', headers: auth(tokenB), body: JSON.stringify({ artist_id: state.artistIds[0] }),
});
check('1組目へ切り戻せる', back.status === 200 &&
  (await jwtVerify(back.body.token, SECRET)).payload.artistId === state.artistIds[0]);

const { data: foreign } = await db.from('artists').select('id')
  .not('account_id', 'is', null).not('id', 'in', `(${state.artistIds.join(',')})`).limit(1).maybeSingle();
if (foreign) {
  const bad = await api('/api/account/switch', {
    method: 'POST', headers: auth(tokenA), body: JSON.stringify({ artist_id: foreign.id }),
  });
  check('他アカウントのアーティストには切り替えられない', bad.status === 404, `http=${bad.status}`);
} else {
  console.log('SKIP  他アカウントのアーティストが見つからず所有権テストを省略');
}

const noTok = await api('/api/account/artists', { method: 'POST', body: JSON.stringify({ name: 'x' }) });
check('未認証では追加できない', noTok.status === 401, `http=${noTok.status}`);

await cleanup(state);
console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
