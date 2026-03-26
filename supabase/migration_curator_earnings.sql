-- Curator Earnings & Payouts Migration
-- Run this in Supabase SQL Editor

-- 1. Create curator_earnings table
CREATE TABLE IF NOT EXISTS curator_earnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  curator_id TEXT REFERENCES curators(id) ON DELETE CASCADE,
  pitch_id UUID,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'JPY',
  status TEXT DEFAULT 'pending',
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  payout_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_curator_earnings_curator ON curator_earnings (curator_id);
CREATE INDEX IF NOT EXISTS idx_curator_earnings_status ON curator_earnings (status);
ALTER TABLE curator_earnings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'curator_earnings' AND policyname = 'all_access') THEN
    CREATE POLICY "all_access" ON curator_earnings FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2. Create payouts table
CREATE TABLE IF NOT EXISTS payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  curator_id TEXT REFERENCES curators(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'JPY',
  method TEXT DEFAULT 'paypal',
  status TEXT DEFAULT 'requested',
  paypal_email TEXT,
  transaction_id TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payouts_curator ON payouts (curator_id);
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payouts' AND policyname = 'all_access') THEN
    CREATE POLICY "all_access" ON payouts FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 3. Add payout fields to curators
ALTER TABLE curators ADD COLUMN IF NOT EXISTS payout_method TEXT DEFAULT 'paypal';
ALTER TABLE curators ADD COLUMN IF NOT EXISTS bank_info JSONB DEFAULT '{}';
ALTER TABLE curators ADD COLUMN IF NOT EXISTS minimum_payout INTEGER DEFAULT 5000;

-- 4. Reload schema
NOTIFY pgrst, 'reload schema';
