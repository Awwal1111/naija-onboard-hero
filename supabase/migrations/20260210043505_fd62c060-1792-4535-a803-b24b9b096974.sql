
-- Restore safe profile access by dropping sensitive columns that have been migrated to user_secrets
-- This is safe because all edge functions and client code now read from user_secrets

-- First, restore a permissive SELECT since 106+ files query profiles for other users
-- The "Users see own full profile" policy we just created is too restrictive
DROP POLICY IF EXISTS "Users see own full profile" ON public.profiles;

-- Restore permissive SELECT - now safe because sensitive columns will be dropped
CREATE POLICY "Authenticated users view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Drop sensitive columns that have been migrated to user_secrets
ALTER TABLE public.profiles DROP COLUMN IF EXISTS transaction_pin;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS encrypted_wallet;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS totp_secret;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS backup_codes;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS api_key;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email_verification_token;
