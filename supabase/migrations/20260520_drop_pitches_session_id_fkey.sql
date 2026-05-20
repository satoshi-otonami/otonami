-- Drop legacy FK: pitches_session_id_fkey
--
-- Background:
-- The `sessions` table is a legacy artifact from the initial anonymous-session
-- credit-holding prototype (March 2026). It was replaced by the
-- artists + JWT + artists.credits model (commit ce4c0b5).
--
-- After launch (2026-05-19), RLS is enabled on `sessions` with zero policies,
-- so initSession()'s anonymous upsert silently fails (caught at lib/db.js:27),
-- and no session row is ever created.
--
-- pitches.session_id (text, nullable) still carries the localStorage UUID,
-- but the orphan UUID has no parent row in `sessions`, so the FK constraint
-- rejects every pitch INSERT.
--
-- Fix: drop the FK. The session_id column itself is kept because
-- loadPitches() filters by it to show pre-login pitches on the artist's device.
--
-- Rollback (if needed):
--   ALTER TABLE pitches ADD CONSTRAINT pitches_session_id_fkey
--     FOREIGN KEY (session_id) REFERENCES sessions(id);

ALTER TABLE pitches DROP CONSTRAINT pitches_session_id_fkey;

-- PostgREST schema cache reload (required after schema change)
NOTIFY pgrst, 'reload schema';
