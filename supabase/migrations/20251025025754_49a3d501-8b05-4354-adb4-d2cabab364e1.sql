-- Add encrypted_wallet column to store user's encrypted private keys
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS encrypted_wallet TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.encrypted_wallet IS 'AES-256 encrypted private key of user''s Celo wallet. Encrypted with WALLET_ENCRYPTION_SECRET.';

-- Add index on celo_wallet_address for faster lookups during deposits
CREATE INDEX IF NOT EXISTS idx_profiles_celo_wallet_address 
ON public.profiles(celo_wallet_address) 
WHERE celo_wallet_address IS NOT NULL;