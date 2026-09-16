-- ============================================================
-- OTONAMI — レーベルアカウント対応 Phase 2
-- artists.email の UNIQUE 制約解除
--
-- ⚠⚠ 実行前提条件（山下さん決定 2026-09-16）⚠⚠
-- この段は「artist_id 基準化」コードの本番デプロイが完了してからでないと
-- 実行してはいけない。認証キーが accounts.email に移った後、artists.email が
-- 重複できるようになると、email 引きで artists を解決している箇所が
-- 誤ヒット / 黙って欠落する。該当4箇所（すべて artist_id 基準に修正済み）:
--
--   1. app/api/artists/route.js  GET  — ダッシュボードのピッチ一覧
--        修正前: pitches を artist_email / artist_name で引いていた
--        → 未修正のまま重複すると 他アーティストのピッチが混ざる（情報漏洩）
--   2. app/api/cron/check-expired-pitches/route.js — 期限切れ返還
--        修正前: artist_id 欠損時に artist_email で artists を .maybeSingle()
--        → 重複で null になり返還が黙って失われる
--   3. app/api/curator/pitch/[id]/route.js — キュレーター側ピッチ詳細
--        修正前: artist_email で Founding バッジを解決
--        → 重複でバッジが消える
--   4. app/api/email/route.js — ピッチ送信メール本文
--        修正前: artist_email で bio / SNS / Founding を解決
--        → 重複でメール本文から bio と SNS リンクが黙って落ちる
--
-- 前提チェック: /api/health の deployed SHA が artist_id 基準化コミットを
-- 含んでいることを確認してから流すこと。
-- ============================================================


-- ── 段0: 現在の制約名を特定する（読み取りのみ） ───────────────
-- 環境によって artists_email_key / artists_email_unique 等と名前が異なる。
-- 下の SELECT の結果を見てから段1を流すこと。
SELECT con.conname, pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'artists' AND con.contype = 'u';

SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'artists' AND indexdef ILIKE '%UNIQUE%' AND indexdef ILIKE '%email%';


-- ── 段1: UNIQUE 制約 / インデックスの解除 ─────────────────────
-- 既定名を想定した DROP。段0で別名が出た場合はその名前に書き換えること。
ALTER TABLE artists DROP CONSTRAINT IF EXISTS artists_email_key;
ALTER TABLE artists DROP CONSTRAINT IF EXISTS artists_email_unique;
DROP INDEX IF EXISTS artists_email_key;
DROP INDEX IF EXISTS artists_email_unique;

-- メール宛先の逆引き（通知系）は残したいので、非UNIQUEの索引を張り直す。
CREATE INDEX IF NOT EXISTS idx_artists_email ON artists (lower(btrim(email)));

-- 検証1: artists に email の UNIQUE が残っていないこと（0行であること）。
SELECT con.conname, pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'artists' AND con.contype = 'u'
  AND pg_get_constraintdef(con.oid) ILIKE '%email%';

SELECT indexname FROM pg_indexes
WHERE tablename = 'artists' AND indexdef ILIKE '%UNIQUE%' AND indexdef ILIKE '%email%';

-- 検証2: accounts 側の一意制約は生きていること（1行返ること）。
--        ログインの一意性はこちらが担保する。
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename = 'accounts' AND indexname = 'accounts_email_lower_key';
