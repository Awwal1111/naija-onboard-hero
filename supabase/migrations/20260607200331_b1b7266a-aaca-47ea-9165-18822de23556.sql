
-- 1) Hash + last-4 columns for API keys (so plaintext is never required again)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.user_secrets
  ADD COLUMN IF NOT EXISTS api_key_hash text,
  ADD COLUMN IF NOT EXISTS api_key_last4 text,
  ADD COLUMN IF NOT EXISTS sandbox_api_key_hash text,
  ADD COLUMN IF NOT EXISTS sandbox_api_key_last4 text;

-- Backfill hashes/last4 from any existing plaintext keys
UPDATE public.user_secrets
SET api_key_hash = encode(digest(api_key, 'sha256'), 'hex'),
    api_key_last4 = right(api_key, 4)
WHERE api_key IS NOT NULL AND api_key_hash IS NULL;

UPDATE public.user_secrets
SET sandbox_api_key_hash = encode(digest(sandbox_api_key, 'sha256'), 'hex'),
    sandbox_api_key_last4 = right(sandbox_api_key, 4)
WHERE sandbox_api_key IS NOT NULL AND sandbox_api_key_hash IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_secrets_api_key_hash_idx ON public.user_secrets(api_key_hash) WHERE api_key_hash IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS user_secrets_sandbox_api_key_hash_idx ON public.user_secrets(sandbox_api_key_hash) WHERE sandbox_api_key_hash IS NOT NULL;

-- 2) Secure validator used by the edge function: takes the raw key, returns the developer's user_id.
--    SECURITY DEFINER so the edge function never needs to read user_secrets rows directly.
CREATE OR REPLACE FUNCTION public.validate_developer_api_key(p_key text)
RETURNS TABLE (user_id uuid, mode text, enabled boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash text;
  v_is_sandbox boolean;
BEGIN
  IF p_key IS NULL OR length(p_key) < 8 THEN
    RETURN;
  END IF;
  v_hash := encode(digest(p_key, 'sha256'), 'hex');
  v_is_sandbox := p_key LIKE 'nl_test_%';

  IF v_is_sandbox THEN
    RETURN QUERY
      SELECT s.user_id, 'sandbox'::text AS mode, true AS enabled
      FROM public.user_secrets s
      WHERE s.sandbox_api_key_hash = v_hash
      LIMIT 1;
  ELSE
    RETURN QUERY
      SELECT s.user_id, 'live'::text AS mode, COALESCE(s.api_key_enabled, true) AS enabled
      FROM public.user_secrets s
      WHERE s.api_key_hash = v_hash
      LIMIT 1;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_developer_api_key(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_developer_api_key(text) TO service_role;

-- 3) Atomic rate limiter — single INSERT…ON CONFLICT counts requests per (user, endpoint, hour bucket),
--    eliminating the TOCTOU race in the current count-then-insert pattern.
CREATE TABLE IF NOT EXISTS public.api_rate_buckets (
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, endpoint, window_start)
);

GRANT ALL ON public.api_rate_buckets TO service_role;
ALTER TABLE public.api_rate_buckets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role only" ON public.api_rate_buckets FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS api_rate_buckets_window_idx ON public.api_rate_buckets(window_start);

CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_user_id uuid,
  p_endpoint text,
  p_limit integer
)
RETURNS TABLE (allowed boolean, remaining integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bucket timestamptz := date_trunc('hour', now());
  v_count integer;
BEGIN
  INSERT INTO public.api_rate_buckets (user_id, endpoint, window_start, request_count)
  VALUES (p_user_id, p_endpoint, v_bucket, 1)
  ON CONFLICT (user_id, endpoint, window_start)
  DO UPDATE SET request_count = public.api_rate_buckets.request_count + 1
  RETURNING request_count INTO v_count;

  RETURN QUERY SELECT (v_count <= p_limit) AS allowed, GREATEST(0, p_limit - v_count) AS remaining;
END;
$$;

REVOKE ALL ON FUNCTION public.check_and_increment_rate_limit(uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(uuid, text, integer) TO service_role;

-- 4) Update generators so new keys are stored hashed only (plaintext returned once, never persisted).
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  v_key := 'nl_live_' || replace(encode(gen_random_bytes(24), 'base64'), '/', '_');
  v_key := replace(v_key, '+', '-');
  v_key := replace(v_key, '=', '');

  INSERT INTO public.user_secrets (user_id, api_key, api_key_hash, api_key_last4, api_key_enabled)
  VALUES (v_uid, NULL, encode(digest(v_key, 'sha256'), 'hex'), right(v_key, 4), true)
  ON CONFLICT (user_id) DO UPDATE
    SET api_key = NULL,
        api_key_hash = EXCLUDED.api_key_hash,
        api_key_last4 = EXCLUDED.api_key_last4,
        api_key_enabled = true,
        updated_at = now();

  RETURN v_key;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_sandbox_api_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  v_key := 'nl_test_' || replace(encode(gen_random_bytes(24), 'base64'), '/', '_');
  v_key := replace(v_key, '+', '-');
  v_key := replace(v_key, '=', '');

  INSERT INTO public.user_secrets (user_id, sandbox_api_key, sandbox_api_key_hash, sandbox_api_key_last4)
  VALUES (v_uid, NULL, encode(digest(v_key, 'sha256'), 'hex'), right(v_key, 4))
  ON CONFLICT (user_id) DO UPDATE
    SET sandbox_api_key = NULL,
        sandbox_api_key_hash = EXCLUDED.sandbox_api_key_hash,
        sandbox_api_key_last4 = EXCLUDED.sandbox_api_key_last4,
        updated_at = now();

  RETURN v_key;
END;
$$;
