-- Fix: Allow anon role to INSERT profiles when celo_wallet_address is provided
-- The existing policy might not work because auth.uid() check fails for anon users

-- Drop the existing wallet-based insert policy
DROP POLICY IF EXISTS "Allow wallet-based profile creation" ON public.profiles;

-- Create a more explicit policy that works for anon users
CREATE POLICY "Allow wallet-based profile creation"
ON public.profiles
FOR INSERT
WITH CHECK (
  -- For authenticated users with matching user_id
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR
  -- For wallet-based users (anon or authenticated): must have a wallet address
  (celo_wallet_address IS NOT NULL AND length(trim(celo_wallet_address)) > 10)
);

-- Also ensure SELECT works for wallet-based lookups
DROP POLICY IF EXISTS "Allow wallet-based profile lookup" ON public.profiles;

CREATE POLICY "Allow wallet-based profile lookup"
ON public.profiles
FOR SELECT
USING (
  -- Anyone can look up by wallet address
  true
);