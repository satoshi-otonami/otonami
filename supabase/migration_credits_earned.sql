-- Credits-based earnings migration
-- Run this in Supabase SQL Editor

-- 1. Add credits_earned column to curator_earnings
ALTER TABLE curator_earnings ADD COLUMN IF NOT EXISTS credits_earned INTEGER DEFAULT 2;

-- 2. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- 3. Backfill: create earnings for existing feedback pitches that have no earnings record
INSERT INTO curator_earnings (curator_id, pitch_id, credits_earned, amount, currency, status)
SELECT
  p.curator_id,
  p.id,
  COALESCE(c.tier, 2),
  COALESCE(c.tier, 2) * 80,
  'JPY',
  'approved'
FROM pitches p
LEFT JOIN curators c ON p.curator_id = c.id
LEFT JOIN curator_earnings ce ON ce.pitch_id = p.id AND ce.curator_id = p.curator_id
WHERE p.feedback_message IS NOT NULL
  AND p.feedback_message != ''
  AND ce.id IS NULL;

-- 4. Update existing earnings records that have credits_earned = default (2)
--    but curator has different tier
UPDATE curator_earnings ce
SET credits_earned = COALESCE(c.tier, 2),
    amount = COALESCE(c.tier, 2) * 80
FROM curators c
WHERE ce.curator_id = c.id
  AND ce.credits_earned = 2
  AND c.tier IS NOT NULL
  AND c.tier != 2;
