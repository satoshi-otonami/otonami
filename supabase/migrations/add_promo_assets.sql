-- promo_assets テーブル
CREATE TABLE IF NOT EXISTS promo_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  track_id UUID REFERENCES artist_tracks(id) ON DELETE CASCADE,
  type TEXT NOT NULL,           -- 'card_feed' | 'card_story' | 'caption'
  template TEXT,                -- 'new_release' | 'out_now' | 'streaming_now'
  format TEXT,                  -- '1080x1080' | '1080x1920'
  palette TEXT,                 -- 'vivid' | 'earth' | 'neon' | 'moody' | 'warm'
  file_url TEXT,                -- Supabase Storage URL（将来用、Phase 1では未使用）
  metadata JSONB DEFAULT '{}', -- キャプション、ハッシュタグ等
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS + ポリシー
ALTER TABLE promo_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_access" ON promo_assets FOR ALL USING (true) WITH CHECK (true);

-- インデックス
CREATE INDEX idx_promo_assets_artist ON promo_assets (artist_id);
CREATE INDEX idx_promo_assets_track ON promo_assets (track_id);

NOTIFY pgrst, 'reload schema';
