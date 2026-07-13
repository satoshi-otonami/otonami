-- What's New feed — site_updates
-- Backs the LP "最新の紹介・アップデート / What's New" section (bilingual titles,
-- optional link). Public read-only via RLS; INSERTs are performed manually with
-- the service role (weekly ops — see docs/site-updates.md).
-- Run in the Supabase SQL Editor, then NOTIFY pgrst reloads below.

CREATE TABLE IF NOT EXISTS site_updates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  published_at date NOT NULL DEFAULT current_date,
  title_ja     text NOT NULL,
  title_en     text NOT NULL,
  link_url     text,          -- optional: SNS post or curator page
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Ordered read for "latest N by published_at".
CREATE INDEX IF NOT EXISTS idx_site_updates_published_at
  ON site_updates (published_at DESC);

ALTER TABLE site_updates ENABLE ROW LEVEL SECURITY;

-- Public read-only. No INSERT/UPDATE/DELETE policy is defined on purpose:
-- the service role bypasses RLS, so only server-side ops can write.
DROP POLICY IF EXISTS "public read site_updates" ON site_updates;
CREATE POLICY "public read site_updates"
  ON site_updates FOR SELECT
  TO anon, authenticated
  USING (true);

NOTIFY pgrst, 'reload schema';
