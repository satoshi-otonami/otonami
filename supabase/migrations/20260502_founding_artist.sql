-- Founding Artist 20-slot system
-- 2026-05-02

-- artists テーブルに3カラム追加
ALTER TABLE artists
  ADD COLUMN IF NOT EXISTS is_founding BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS founding_number INT,
  ADD COLUMN IF NOT EXISTS founding_show_on_lp BOOLEAN DEFAULT true;

-- founding_number に UNIQUE 制約（同時登録 race condition 対策）
CREATE UNIQUE INDEX IF NOT EXISTS idx_artists_founding_number
  ON artists(founding_number)
  WHERE founding_number IS NOT NULL;

-- Founding検索用インデックス
CREATE INDEX IF NOT EXISTS idx_artists_is_founding
  ON artists(is_founding)
  WHERE is_founding = true;

-- スキーマキャッシュリロード
NOTIFY pgrst, 'reload schema';
