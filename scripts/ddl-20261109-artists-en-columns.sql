-- 英語表記列の追加（2026-11-09）
-- Supabase SQL Editor で実行すること（PostgRESTはDDL不可）。
-- 実行前にプロジェクトrefを直URLで確認: jroudvjksouqnmlhzhzr
--
-- name_en: アーティスト名の英語/ローマ字表記（手入力。空ならピッチメールは name を使う）
-- bio_en:  bio の英訳（プロフィール保存時にサーバが自動生成。既存分は backfill）

ALTER TABLE artists ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS bio_en  TEXT;

NOTIFY pgrst, 'reload schema';
