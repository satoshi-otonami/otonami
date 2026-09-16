-- ============================================================
-- OTONAMI — レーベルアカウント対応 Phase 1b
-- artists.account_id の NOT NULL 化
--
-- ⚠ 実行タイミング: 新コードの本番デプロイ【完了後】。
--    旧コードのサインアップは account_id を書かないため、デプロイ前に
--    NOT NULL を張ると新規登録が 23502 (not_null_violation) で落ちる。
--
-- Phase 1 と Phase 1b の間に旧コードで登録されたアーティストは account_id が
-- NULL のままログイン不能になるので、段1 の追いバックフィルで先に救済する。
-- ============================================================


-- ── 段1: 取りこぼしの追いバックフィル（Phase 1 段3 と同じ処理） ──
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

UPDATE artists a
SET account_id = ac.id
FROM accounts ac
WHERE a.account_id IS NULL
  AND lower(btrim(a.email)) = lower(btrim(ac.email));

-- 検証1: missing = 0 であること。0 でなければ段2 を流さず原因を調べること。
SELECT count(*) AS total,
       count(account_id) AS with_account,
       count(*) - count(account_id) AS missing
FROM artists;


-- ── 段2: NOT NULL 化（検証1 が missing = 0 のときのみ） ──────────
ALTER TABLE artists ALTER COLUMN account_id SET NOT NULL;

-- 検証2: is_nullable = NO になること。
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'artists' AND column_name = 'account_id';

-- 検証3: 孤児アカウントが無いこと。
SELECT count(*) AS orphan_accounts
FROM accounts ac
WHERE NOT EXISTS (SELECT 1 FROM artists a WHERE a.account_id = ac.id);
