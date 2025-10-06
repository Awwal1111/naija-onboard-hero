
-- Add missing balance_withdrawable column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS balance_withdrawable numeric DEFAULT 0 NOT NULL;

-- Update balance_withdrawable to match wallet_balance for existing records
UPDATE profiles 
SET balance_withdrawable = wallet_balance 
WHERE balance_withdrawable IS NULL OR balance_withdrawable = 0;
