-- ============================================================
-- OTONAMI — artists テーブル RLS 有効化【本件スコープ外・別GO用】
--
-- ⚠ これはレーベルアカウント対応とは独立した修正。指示書の範囲外なので、
--   山下さんの個別GOが出るまで実行しないこと。ここに置いたのは、
--   accounts テーブル設計中に同じ穴を再生産しないよう確認した際、
--   artists 側に既存の穴が見つかったため。
--
-- 【発見内容 2026-09-16】
-- artists テーブルは RLS が無効なため、公開されている anon キー
-- （NEXT_PUBLIC_SUPABASE_ANON_KEY / クライアントバンドルに露出）で
-- 全52行の email と bcrypt password_hash が読み出せる。実測:
--
--   curl "$SUPABASE_URL/rest/v1/artists?select=id,email,password_hash&limit=1" \
--     -H "apikey: <anon key>"
--   → 200 [{"id":"...","email":"...","password_hash":"$2a$10$..."}]
--
-- 既知の [[otonami-pitches-anon-rls]]（pitches が anon で全行読める）と同種。
--
-- 【安全性の根拠】
-- コード全体を確認したところ、anon クライアント（lib/supabase.js の
-- `supabase` エクスポート）を import しているのは3ファイルのみで、
-- いずれも supabase.storage（avatars バケット）しか呼んでいない:
--   app/artist/page.js / app/curator/page.js / app/curator/dashboard/page.js
-- artists テーブルへのアクセスはすべて getServiceSupabase() 経由であり、
-- service_role は RLS をバイパスする。したがって RLS を有効化しても
-- アプリの動作は変わらない。Storage は RLS の対象外。
-- ============================================================

ALTER TABLE artists ENABLE ROW LEVEL SECURITY;

-- 検証1: rls_enabled = true になること。
SELECT relname, relrowsecurity AS rls_enabled
FROM pg_class WHERE relname = 'artists';

-- 検証2: ポリシーが0件であること（= anon/authenticated は到達不能）。
SELECT count(*) AS policy_count FROM pg_policies WHERE tablename = 'artists';

-- 検証3（アプリ側・SQLの外）: 有効化後に以下が [] を返すこと。
--   curl "$SUPABASE_URL/rest/v1/artists?select=id&limit=1" -H "apikey: <anon key>"
-- そのうえで otonami.io のログイン→ダッシュボード表示が従来どおりであること。
