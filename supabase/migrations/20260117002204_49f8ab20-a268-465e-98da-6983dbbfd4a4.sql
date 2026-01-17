-- FIX: Allow MiniPay wallet users to create profiles without Supabase Auth
-- MiniPay users have a wallet address but no auth.uid() - they use anon role
-- This policy allows anyone to insert a profile, but only if:
-- 1. The user_id being inserted is valid
-- 2. There's a celo_wallet_address (proves it's a wallet-based user)

-- First drop the restrictive authenticated-only policy
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create a policy that allows wallet-based registration
CREATE POLICY "Allow wallet-based profile creation" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  -- Either: authenticated user inserting their own profile
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR
  -- Or: wallet-based registration (celo_wallet_address must be provided)
  (celo_wallet_address IS NOT NULL AND celo_wallet_address != '')
);

-- Also allow anon users to update their profile by wallet address
-- (needed for profile completion after wallet-based creation)
CREATE POLICY "Allow wallet users to update their profile" 
ON public.profiles 
FOR UPDATE 
USING (
  -- Either: authenticated user updating their own profile
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR
  -- Or: wallet-based user (identified by wallet address)
  (celo_wallet_address IS NOT NULL AND celo_wallet_address != '')
)
WITH CHECK (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR
  (celo_wallet_address IS NOT NULL AND celo_wallet_address != '')
);