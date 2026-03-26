-- Email Verification & OTP Migration
-- Run this in Supabase SQL Editor before deploying

-- 1. Add email verification columns to artists
ALTER TABLE artists ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS verification_token TEXT;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMPTZ;

-- 2. Add email verification columns to curators
ALTER TABLE curators ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE curators ADD COLUMN IF NOT EXISTS verification_token TEXT;
ALTER TABLE curators ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMPTZ;

-- 3. Create login_otps table for 2FA
CREATE TABLE IF NOT EXISTS login_otps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  user_type TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_otps_email ON login_otps (email);

-- 4. Enable RLS on login_otps (allow all via service role)
ALTER TABLE login_otps ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'login_otps' AND policyname = 'all_access') THEN
    CREATE POLICY "all_access" ON login_otps FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 5. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
