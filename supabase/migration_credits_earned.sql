-- Credits-based earnings migration
-- Run this in Supabase SQL Editor

-- 1. Add credits_earned column to curator_earnings
ALTER TABLE curator_earnings ADD COLUMN IF NOT EXISTS credits_earned INTEGER DEFAULT 2;

-- 2. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- 3. Backfill: create earnings for existing feedback pitches that have no earnings record
--    Uses credit_cost (the single source of truth for curator credits)
--    Amount = credit_cost × ¥160 × 0.5 (conservative: declined rate)
--    For accepted pitches: credit_cost × ¥160 × 0.7
INSERT INTO curator_earnings (curator_id, pitch_id, credits_earned, amount, currency, status)
SELECT
  p.curator_id,
  p.id,
  COALESCE(c.credit_cost, 2),
  CASE
    WHEN p.status = 'accepted' THEN ROUND(COALESCE(c.credit_cost, 2) * 160 * 0.7)
    ELSE ROUND(COALESCE(c.credit_cost, 2) * 160 * 0.5)
  END,
  'JPY',
  'approved'
FROM pitches p
LEFT JOIN curators c ON p.curator_id = c.id
LEFT JOIN curator_earnings ce ON ce.pitch_id = p.id AND ce.curator_id = p.curator_id
WHERE p.feedback_message IS NOT NULL
  AND p.feedback_message != ''
  AND ce.id IS NULL;

-- 4. Fix existing earnings records to use correct credit_cost values
UPDATE curator_earnings ce
SET credits_earned = COALESCE(c.credit_cost, 2),
    amount = ROUND(COALESCE(c.credit_cost, 2) * 160 * 0.5)
FROM curators c
WHERE ce.curator_id = c.id;
