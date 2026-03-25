-- ============================================================
-- OTONAMI — Artist Registration Schema
-- Run this SQL in Supabase SQL Editor
-- ============================================================

-- ── Artists（アーティスト） ──
CREATE TABLE artists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  artist_type TEXT DEFAULT 'solo',         -- solo | band | label | producer
  bio TEXT,
  hot_news TEXT,                           -- 最新ニュース（Grooverの「Hot news」相当）
  avatar_url TEXT,
  cover_url TEXT,
  region TEXT DEFAULT 'JP',
  label_name TEXT,                         -- 所属レーベル（任意）
  genres TEXT[] DEFAULT '{}',
  moods TEXT[] DEFAULT '{}',
  influences TEXT[] DEFAULT '{}',          -- 影響を受けたアーティスト名
  -- SNSリンク（個別カラム、JOINなしで取得可能）
  spotify_url TEXT,
  youtube_url TEXT,
  instagram_url TEXT,
  twitter_url TEXT,
  facebook_url TEXT,
  website_url TEXT,
  -- クレジット
  credits INTEGER DEFAULT 3,              -- 初回3クレジット無料付与
  -- メタ
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Artist Tracks（登録楽曲） ──
CREATE TABLE artist_tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  -- 楽曲URL（複数プラットフォーム対応）
  youtube_url TEXT,
  spotify_url TEXT,
  soundcloud_url TEXT,
  bandcamp_url TEXT,
  -- メタデータ
  release_date DATE,
  genre TEXT,
  cover_image_url TEXT,                    -- サムネイル画像URL
  is_public BOOLEAN DEFAULT true,          -- プロフィールに公開するか
  -- 分析結果キャッシュ（SoundNet/Musicae APIの結果を保存）
  track_features_id UUID REFERENCES track_features(id) ON DELETE SET NULL,
  -- ピッチ実績（集計用、トリガーで更新）
  pitches_sent INTEGER DEFAULT 0,
  pitches_responded INTEGER DEFAULT 0,
  pitches_shared INTEGER DEFAULT 0,
  -- メタ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── pitchesテーブルに artist_id と track_id カラム追加 ──
ALTER TABLE pitches ADD COLUMN IF NOT EXISTS artist_id UUID REFERENCES artists(id) ON DELETE SET NULL;
ALTER TABLE pitches ADD COLUMN IF NOT EXISTS track_id UUID REFERENCES artist_tracks(id) ON DELETE SET NULL;

-- ── Triggers ──
CREATE TRIGGER artists_updated_at BEFORE UPDATE ON artists FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER artist_tracks_updated_at BEFORE UPDATE ON artist_tracks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS ──
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_access" ON artists FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_access" ON artist_tracks FOR ALL USING (true) WITH CHECK (true);

-- ── Indexes ──
CREATE INDEX idx_artists_email ON artists (email);
CREATE INDEX idx_artist_tracks_artist_id ON artist_tracks (artist_id);
CREATE INDEX idx_pitches_artist_id ON pitches (artist_id);
CREATE INDEX idx_pitches_track_id ON pitches (track_id);

-- スキーマキャッシュリロード
NOTIFY pgrst, 'reload schema';
