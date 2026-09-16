-- ============================================================
-- OTONAMI — レーベルアカウント対応 Phase 1
-- 「1ログイン = 1アカウント、アカウント配下に複数アーティスト」
--
-- 適用: Supabase SQL Editor で【段ごとに】実行し、各段の検証SELECTを確認してから次へ。
-- この段はすべて加算的変更（新規テーブル / 新規列 / バックフィル）で、
-- 既存の読み書きパスは一切壊さない。旧コードのまま流しても安全。
--
-- ⚠ この段は「新コードのデプロイより【前】」に流す。新コードのログインは
--    accounts を読むので、テーブルが無いと全ログインが 500 になる。
--
-- ⚠ この段では artists.account_id を NOT NULL にしない。旧コードのサインアップは
--    account_id を書かないため、デプロイ前に NOT NULL を張ると新規登録が 23502 で
--    落ちる。NOT NULL 化は Phase 1b（デプロイ後）で行う。
--
-- ⚠ この段では artists.email の UNIQUE 制約も外さない。
--    解除は Phase 2 で、artist_id 基準化コードの本番デプロイ完了後に行う。
--
-- 実行順: Phase 1 → 新コードをデプロイ → Phase 1b → Phase 2
-- ============================================================


-- ── 段0: 事前確認（読み取りのみ・実行前に必ず目視） ──────────────
-- 0-1. 重複メールが無いこと（1:1バックフィルの前提）。0行であること。
SELECT lower(trim(email)) AS email, count(*)
FROM artists
GROUP BY 1 HAVING count(*) > 1;

-- 0-2. email / password_hash に欠損が無いこと。両方0であること。
SELECT count(*) FILTER (WHERE email IS NULL OR btrim(email) = '')        AS missing_email,
       count(*) FILTER (WHERE password_hash IS NULL OR password_hash = '') AS missing_hash,
       count(*)                                                           AS total
FROM artists;

-- 0-3. artists.email に現在ついている制約名を控えておく（Phase 2 で使う）。
SELECT con.conname, pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'artists' AND con.contype IN ('u', 'p');

SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'artists' AND indexdef ILIKE '%email%';


-- ── 段1: accounts テーブル作成 ────────────────────────────────
-- ログイン資格情報はここに一本化する。artists 側の email/password_hash は
-- Phase 1 の時点では削除しない（ロールバック余地を残すため）。
CREATE TABLE IF NOT EXISTS accounts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                   TEXT NOT NULL,
  password_hash           TEXT NOT NULL,
  -- メール認証は accounts に一本化する（artists 側は同期コピーとして残す）
  email_verified          BOOLEAN NOT NULL DEFAULT false,
  verification_token      TEXT,
  verification_expires_at TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- メールは常に lower(trim()) で保存する運用だが、大文字で流し込まれた行が
-- 重複キーをすり抜けないよう、一意制約自体を正規化式で張る。
CREATE UNIQUE INDEX IF NOT EXISTS accounts_email_lower_key
  ON accounts (lower(btrim(email)));

-- ⚠ 必須: accounts は bcrypt ハッシュを保持する。RLS を有効化し、
--    ポリシーを一切作らないことで anon / authenticated からの到達を塞ぐ。
--    service_role は RLS をバイパスするのでサーバー側コードは影響を受けない。
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- 検証1: テーブルが出来ていること / RLSが有効なこと（rowsecurity = true）。
SELECT relname, relrowsecurity AS rls_enabled
FROM pg_class WHERE relname = 'accounts';

-- 検証2: anon から見えないこと（ポリシー0件であること）。
SELECT count(*) AS policy_count FROM pg_policies WHERE tablename = 'accounts';


-- ── 段2: artists.account_id 追加（nullable のまま） ────────────
-- ON DELETE RESTRICT: アカウント行の削除でアーティスト（＝ピッチ実績・
-- クレジット台帳の親）が連鎖消滅しないようにする。アカウントを消したい場合は
-- 先に配下アーティストを別アカウントへ付け替える運用。
ALTER TABLE artists
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_artists_account_id ON artists (account_id);

-- 検証3: 列が追加され、全行 NULL であること（この時点では未バックフィル）。
SELECT count(*) AS total, count(account_id) AS with_account FROM artists;


-- ── 段3: バックフィル（既存 artists 1行 → accounts 1行） ────────
-- 既存ユーザーのログイン体験を不変に保つのが目的。email と password_hash を
-- そのまま移送するので、同じメール・同じパスワードでログインできる。
-- 冪等: account_id が未設定の行だけを対象にする。
WITH new_accounts AS (
  INSERT INTO accounts (
    email, password_hash, email_verified,
    verification_token, verification_expires_at, created_at
  )
  SELECT lower(btrim(a.email)),
         a.password_hash,
         COALESCE(a.email_verified, false),
         a.verification_token,
         a.verification_expires_at,
         a.created_at
  FROM artists a
  WHERE a.account_id IS NULL
  ON CONFLICT (lower(btrim(email))) DO NOTHING
  RETURNING id, lower(btrim(email)) AS email
)
UPDATE artists a
SET account_id = na.id
FROM new_accounts na
WHERE a.account_id IS NULL
  AND lower(btrim(a.email)) = na.email;

-- ON CONFLICT で弾かれた行（＝既に accounts に同じメールがある）の救済。
-- 通常は0行だが、段3を二度流した場合などにここで拾われる。
UPDATE artists a
SET account_id = ac.id
FROM accounts ac
WHERE a.account_id IS NULL
  AND lower(btrim(a.email)) = lower(btrim(ac.email));

-- 検証4: 全アーティストに account_id が付いたこと。missing = 0 であること。
SELECT count(*) AS total,
       count(account_id) AS with_account,
       count(*) - count(account_id) AS missing
FROM artists;

-- 検証5: accounts 行数が artists 行数と一致すること（この時点では1:1）。
SELECT (SELECT count(*) FROM artists)  AS artists,
       (SELECT count(*) FROM accounts) AS accounts;

-- 検証6: メール・ハッシュが正しく移送されたこと。mismatched = 0 であること。
SELECT count(*) AS mismatched
FROM artists a
JOIN accounts ac ON ac.id = a.account_id
WHERE lower(btrim(a.email)) <> lower(btrim(ac.email))
   OR a.password_hash IS DISTINCT FROM ac.password_hash;

-- 検証7: 孤児アカウント（どのアーティストからも参照されていない行）が無いこと。
SELECT count(*) AS orphan_accounts
FROM accounts ac
WHERE NOT EXISTS (SELECT 1 FROM artists a WHERE a.account_id = ac.id);

-- ── ここまでが Phase 1。この時点で新コードをデプロイしてよい。 ──────
-- 次は 20260916_accounts_phase1b_account_id_not_null.sql（デプロイ後）。
