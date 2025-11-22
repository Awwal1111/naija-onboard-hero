-- Add 2FA and biometric fields to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS biometric_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS totp_secret TEXT,
ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_2fa_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS backup_codes TEXT[];

-- Create 2FA verification codes table
CREATE TABLE IF NOT EXISTS two_factor_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_two_factor_codes_user_id ON two_factor_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_two_factor_codes_expires_at ON two_factor_codes(expires_at);

-- Enable RLS
ALTER TABLE two_factor_codes ENABLE ROW LEVEL SECURITY;

-- RLS policies for 2FA codes
CREATE POLICY "Users can view their own 2FA codes"
  ON two_factor_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own 2FA codes"
  ON two_factor_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Cleanup expired codes function
CREATE OR REPLACE FUNCTION cleanup_expired_2fa_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM two_factor_codes
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$;