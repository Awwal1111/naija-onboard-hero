
ALTER TABLE public.user_secrets
  ADD COLUMN IF NOT EXISTS sandbox_api_key text UNIQUE;

ALTER TABLE public.api_usage
  ADD COLUMN IF NOT EXISTS is_sandbox boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_user_secrets_sandbox_api_key
  ON public.user_secrets (sandbox_api_key)
  WHERE sandbox_api_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.generate_sandbox_api_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  new_key text;
BEGIN
  -- 48 hex chars from two concatenated UUIDs (no pgcrypto dependency)
  new_key := 'nl_test_' ||
             replace(gen_random_uuid()::text, '-', '') ||
             substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
  RETURN new_key;
END;
$$;

-- Backfill sandbox keys for existing developers
INSERT INTO public.user_secrets (user_id, sandbox_api_key)
SELECT p.user_id, public.generate_sandbox_api_key()
FROM public.profiles p
LEFT JOIN public.user_secrets s ON s.user_id = p.user_id
WHERE p.account_type = 'developer'
  AND (s.user_id IS NULL OR s.sandbox_api_key IS NULL)
ON CONFLICT (user_id) DO UPDATE
  SET sandbox_api_key = COALESCE(public.user_secrets.sandbox_api_key, EXCLUDED.sandbox_api_key);
