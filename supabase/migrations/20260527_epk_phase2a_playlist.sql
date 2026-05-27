-- EPK Phase 2A — Featured Playlist + index tuning
-- NOTE: epk_tour / epk_press already carry event_jp, is_highlight,
-- highlight_count, highlight_label, quote_jp, source_url (added in
-- 20260527_create_epk_tables.sql), so only the playlist column + indexes
-- are new here. Run in the Supabase SQL Editor, then NOTIFY pgrst.

-- Featured Playlist: ordered track-id array. First element = Pinned, max 5.
ALTER TABLE artist_epks
  ADD COLUMN IF NOT EXISTS playlist_track_ids JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN artist_epks.playlist_track_ids IS
  'Featured Playlist track id array; first element is Pinned, max 5 tracks';

-- Indexes for the public-page ordered reads.
CREATE INDEX IF NOT EXISTS idx_epk_tour_highlight
  ON epk_tour (epk_id, is_highlight, sort_order);
CREATE INDEX IF NOT EXISTS idx_epk_press_sort
  ON epk_press (epk_id, sort_order);

NOTIFY pgrst, 'reload schema';
