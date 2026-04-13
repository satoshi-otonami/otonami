-- lyric_videos テーブル — Lyric Video Generator Phase 1
CREATE TABLE IF NOT EXISTS lyric_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  track_id UUID REFERENCES artist_tracks(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Untitled',
  audio_url TEXT NOT NULL,
  background_url TEXT,
  lyrics JSONB DEFAULT '{}'::jsonb,
  duration_seconds NUMERIC,
  language TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lyric_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_access" ON lyric_videos FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_lyric_videos_artist ON lyric_videos (artist_id);
CREATE INDEX idx_lyric_videos_track ON lyric_videos (track_id);

NOTIFY pgrst, 'reload schema';
