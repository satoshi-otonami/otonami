-- ═══════════════════════════════════════════════════════════
--  OTONAMI EPK Tables (Phase 1) — Created 2026/5/27
--  Run this in the Supabase SQL Editor (DDL cannot go through
--  PostgREST / the read-only MCP). Idempotent: safe to re-run.
--  SQL Editor: https://supabase.com/dashboard/project/jroudvjksouqnmlhzhzr/sql/new
-- ═══════════════════════════════════════════════════════════

-- artist_epks: one EPK per artist
CREATE TABLE IF NOT EXISTS artist_epks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  theme TEXT NOT NULL DEFAULT 'editorial_dark',  -- editorial_dark | sunset_citypop | brutalist
  is_published BOOLEAN DEFAULT false,
  visibility TEXT DEFAULT 'public',              -- public | unlisted
  featured_track_id UUID REFERENCES artist_tracks(id) ON DELETE SET NULL,

  -- Hero
  tagline_en TEXT,
  tagline_jp TEXT,

  -- Bio
  pull_quote_en TEXT,
  pull_quote_jp TEXT,
  bio_extended_en TEXT,
  bio_extended_jp TEXT,

  -- Sound & Mood / For Fans Of (Phase 2)
  sound_scenes JSONB,                            -- [{title_en,title_jp,desc_en,desc_jp}]
  for_fans_of JSONB,                             -- [{name,tag}]

  -- Contact
  contact_management_name TEXT,
  contact_management_email TEXT,
  contact_sync_name TEXT,
  contact_sync_email TEXT,
  contact_press_email TEXT,

  -- OG image (Phase 3) + analytics
  og_image_url TEXT,
  view_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT artist_epks_artist_unique UNIQUE (artist_id),
  CONSTRAINT artist_epks_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,49}$')
);

-- epk_press: press quotes (Phase 2)
CREATE TABLE IF NOT EXISTS epk_press (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  epk_id UUID NOT NULL REFERENCES artist_epks(id) ON DELETE CASCADE,
  quote_en TEXT,
  quote_jp TEXT,
  source TEXT NOT NULL,
  date_label TEXT,
  source_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- epk_tour: live / tour history (Phase 2)
CREATE TABLE IF NOT EXISTS epk_tour (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  epk_id UUID NOT NULL REFERENCES artist_epks(id) ON DELETE CASCADE,
  year TEXT NOT NULL,
  event_en TEXT NOT NULL,
  event_jp TEXT,
  location TEXT,
  is_highlight BOOLEAN DEFAULT false,
  highlight_count INTEGER,
  highlight_label TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- updated_at trigger (function update_updated_at() already exists in this DB)
DROP TRIGGER IF EXISTS artist_epks_updated_at ON artist_epks;
CREATE TRIGGER artist_epks_updated_at
  BEFORE UPDATE ON artist_epks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS (permissive, matching existing app pattern; writes happen server-side with the service key)
ALTER TABLE artist_epks ENABLE ROW LEVEL SECURITY;
ALTER TABLE epk_press ENABLE ROW LEVEL SECURITY;
ALTER TABLE epk_tour ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "all_access" ON artist_epks;
DROP POLICY IF EXISTS "all_access" ON epk_press;
DROP POLICY IF EXISTS "all_access" ON epk_tour;
CREATE POLICY "all_access" ON artist_epks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_access" ON epk_press FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_access" ON epk_tour FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_artist_epks_slug ON artist_epks (slug);
CREATE INDEX IF NOT EXISTS idx_artist_epks_artist_id ON artist_epks (artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_epks_published ON artist_epks (is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_epk_press_epk_id ON epk_press (epk_id);
CREATE INDEX IF NOT EXISTS idx_epk_tour_epk_id ON epk_tour (epk_id);

-- ── Storage bucket: epk-assets (public; forward-looking for Phase 2/3 image uploads) ──
INSERT INTO storage.buckets (id, name, public)
VALUES ('epk-assets', 'epk-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "epk_assets_public_read" ON storage.objects;
DROP POLICY IF EXISTS "epk_assets_authenticated_write" ON storage.objects;
CREATE POLICY "epk_assets_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'epk-assets');
CREATE POLICY "epk_assets_authenticated_write" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'epk-assets');

-- Refresh PostgREST schema cache so the new tables + relationships are exposed
NOTIFY pgrst, 'reload schema';
