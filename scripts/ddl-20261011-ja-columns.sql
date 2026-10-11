-- 和訳列の追加（2026-10-11）
-- Supabase SQL Editor で実行すること（PostgRESTはDDL不可）。
-- 実行前にプロジェクトrefを直URLで確認: jroudvjksouqnmlhzhzr
--
-- feedback_ja: キュレーターのフィードバック英文の和訳（保存時にサーバが自動生成）
-- bio_ja:      キュレーター紹介文の和訳（登録・更新時に自動生成。既存分は
--              scripts/backfill-ja.mjs で生成）

ALTER TABLE pitches  ADD COLUMN IF NOT EXISTS feedback_ja TEXT;
ALTER TABLE curators ADD COLUMN IF NOT EXISTS bio_ja      TEXT;

NOTIFY pgrst, 'reload schema';
