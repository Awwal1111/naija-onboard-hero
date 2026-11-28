-- Generate webhook signing secrets with cryptographically secure randomness.
CREATE OR REPLACE FUNCTION public.generate_webhook_secret()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = extensions, pg_temp
AS $$
  SELECT 'whsec_' || encode(extensions.gen_random_bytes(32), 'hex');
$$;

-- This RPC is called by the trusted developer-api Edge Function only.
REVOKE ALL ON FUNCTION public.generate_webhook_secret()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_webhook_secret()
  TO service_role;
