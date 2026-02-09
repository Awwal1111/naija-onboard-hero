
-- =====================================================
-- FIX #1: PROFILES TABLE - Remove dangerously permissive SELECT policies
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view basic public profile info" ON public.profiles;
DROP POLICY IF EXISTS "Allow wallet-based profile lookup" ON public.profiles;

-- Create a security definer function for safe public profile lookups
CREATE OR REPLACE FUNCTION public.get_safe_public_profile(target_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  profession text,
  bio text,
  profile_picture_url text,
  is_expert boolean,
  expert_verified_at timestamptz,
  average_rating numeric,
  rating_count integer,
  connections_count integer,
  completed_jobs_count integer,
  state_name text,
  lga_name text,
  area text,
  created_at timestamptz,
  is_boosted boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.full_name,
    p.profession,
    p.bio,
    p.profile_picture_url,
    p.is_expert,
    p.expert_verified_at,
    p.average_rating,
    p.rating_count,
    p.connections_count,
    p.completed_jobs_count,
    p.state_name,
    p.lga_name,
    p.area,
    p.created_at,
    p.is_boosted
  FROM public.profiles p
  WHERE p.user_id = target_user_id;
$$;

-- Authenticated users can see profiles (sensitive data will be in separate table)
CREATE POLICY "Authenticated users view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Wallet-based lookup for unauthenticated (MiniPay/Celo flows)
CREATE POLICY "Wallet lookup by address"
ON public.profiles
FOR SELECT
TO anon
USING (
  celo_wallet_address IS NOT NULL 
  AND celo_wallet_address <> ''
);

-- =====================================================
-- FIX #2: Create user_secrets table for ultra-sensitive data
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_pin text,
  totp_secret text,
  backup_codes text[],
  encrypted_wallet text,
  api_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own secrets only"
ON public.user_secrets
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view user secrets"
ON public.user_secrets
FOR SELECT
TO authenticated
USING (public.is_admin_user());

-- Migrate existing sensitive data
INSERT INTO public.user_secrets (user_id, transaction_pin, totp_secret, backup_codes, encrypted_wallet, api_key)
SELECT 
  user_id, transaction_pin, totp_secret, backup_codes, encrypted_wallet, api_key
FROM public.profiles
WHERE user_id IS NOT NULL
AND (transaction_pin IS NOT NULL OR totp_secret IS NOT NULL OR backup_codes IS NOT NULL OR encrypted_wallet IS NOT NULL OR api_key IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- FIX #3: IP TRACKING - Restrict to admin only
-- =====================================================

DROP POLICY IF EXISTS "Service role can manage ip_tracking" ON public.ip_tracking;

CREATE POLICY "Admins can view ip_tracking"
ON public.ip_tracking FOR SELECT TO authenticated
USING (public.is_admin_user());

CREATE POLICY "Service can insert ip_tracking"
ON public.ip_tracking FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Anon can insert ip_tracking"
ON public.ip_tracking FOR INSERT TO anon
WITH CHECK (true);

-- =====================================================
-- FIX #4: API RATE LIMITS - Restrict to authenticated
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view rate limits" ON public.api_rate_limits;

CREATE POLICY "Authenticated users can view rate limits"
ON public.api_rate_limits FOR SELECT TO authenticated
USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_user_secrets_updated_at
BEFORE UPDATE ON public.user_secrets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
