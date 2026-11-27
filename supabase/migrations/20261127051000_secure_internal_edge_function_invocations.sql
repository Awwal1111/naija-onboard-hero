-- A single Vault-managed token authenticates scheduled/internal Edge Function calls.
-- The token is generated in the database and is never written to source control.
DO $
DECLARE
  v_anon_key text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM vault.secrets
    WHERE name = 'naijalancers_internal_function_token'
  ) THEN
    PERFORM vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'naijalancers_internal_function_token',
      'Private token for scheduled NaijaLancers Edge Function calls'
    );
  END IF;

  SELECT replace(decrypted_secret, 'Bearer ', '')
  INTO v_anon_key
  FROM vault.decrypted_secrets
  WHERE name = 'weekly_digest_auth'
  LIMIT 1;

  IF v_anon_key IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM vault.secrets WHERE name = 'naijalancers_internal_apikey'
  ) THEN
    PERFORM vault.create_secret(
      v_anon_key,
      'naijalancers_internal_apikey',
      'Public project API key used as the Edge Function gateway apikey'
    );
  END IF;
END;
$;

CREATE OR REPLACE FUNCTION public.verify_internal_function_token(p_token text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, vault, pg_temp
AS $$
  SELECT p_token IS NOT NULL
     AND length(p_token) BETWEEN 32 AND 256
     AND EXISTS (
       SELECT 1
       FROM vault.decrypted_secrets
       WHERE name = 'naijalancers_internal_function_token'
         AND decrypted_secret = p_token
     );
$$;

REVOKE ALL ON FUNCTION public.verify_internal_function_token(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_internal_function_token(text)
  TO service_role;

CREATE OR REPLACE FUNCTION util.invoke_internal_function(p_function_name text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, util, vault, net, pg_temp
AS $$
DECLARE
  v_token text;
  v_anon_key text;
  v_request_id bigint;
BEGIN
  IF p_function_name NOT IN (
    'send-weekly-digest',
    'send-daily-email-digest',
    'engage-inactive-users',
    'developer-webhook'
  ) THEN
    RAISE EXCEPTION 'Unsupported internal function';
  END IF;

  SELECT decrypted_secret
  INTO v_token
  FROM vault.decrypted_secrets
  WHERE name = 'naijalancers_internal_function_token'
  LIMIT 1;

  IF v_token IS NULL OR length(v_token) < 32 THEN
    RAISE WARNING 'Internal Edge Function token is missing; skipping %', p_function_name;
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_anon_key
  FROM vault.decrypted_secrets
  WHERE name = 'naijalancers_internal_apikey'
  LIMIT 1;
  IF v_anon_key IS NULL THEN
    RAISE WARNING 'Internal API key is missing; skipping %', p_function_name;
    RETURN NULL;
  END IF;

  v_request_id := net.http_post(
    url := 'https://jxybqmquymxkvxxpiuhv.supabase.co/functions/v1/' || p_function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', v_anon_key,
      'x-internal-function-token', v_token
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
  RETURN v_request_id;
END;
$$;

REVOKE ALL ON FUNCTION util.invoke_internal_function(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION util.invoke_internal_function(text)
  TO service_role;

-- Keep the existing weekly schedule but stop using its public anon JWT as auth.
CREATE OR REPLACE FUNCTION util.invoke_send_weekly_digest()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, util, pg_temp
AS $$
BEGIN
  RETURN util.invoke_internal_function('send-weekly-digest');
END;
$$;

-- Replace the legacy cron HTTP commands with the Vault-backed dispatcher.
UPDATE cron.job
SET command = $$SELECT util.invoke_internal_function('send-daily-email-digest');$$
WHERE jobname = 'daily-email-digest';

UPDATE cron.job
SET command = $$SELECT util.invoke_internal_function('engage-inactive-users');$$
WHERE jobname = 'engage-inactive-users';

-- Automatic escrow release remains active; its webhook now uses the same
-- Vault-managed internal token rather than the publicly exposed anon key.
CREATE OR REPLACE FUNCTION public.auto_release_developer_escrows()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault, net, pg_temp
AS $function$
DECLARE
  v_escrow record;
  v_result jsonb;
  v_count integer := 0;
  v_internal_token text;
  v_anon_key text;
BEGIN
  SELECT decrypted_secret INTO v_internal_token
  FROM vault.decrypted_secrets
  WHERE name = 'naijalancers_internal_function_token'
  LIMIT 1;

  SELECT decrypted_secret INTO v_anon_key
  FROM vault.decrypted_secrets
  WHERE name = 'naijalancers_internal_apikey'
  LIMIT 1;

  FOR v_escrow IN
    SELECT developer_id, escrow_id
    FROM public.developer_escrows
    WHERE status = 'funded'
      AND auto_release_at IS NOT NULL
      AND auto_release_at <= now()
    ORDER BY auto_release_at
    LIMIT 100
    FOR UPDATE SKIP LOCKED
  LOOP
    v_result := public.release_developer_escrow(v_escrow.developer_id, v_escrow.escrow_id);
    IF COALESCE((v_result->>'ok')::boolean, false) THEN
      v_count := v_count + 1;
      IF v_internal_token IS NOT NULL AND v_anon_key IS NOT NULL THEN
        PERFORM net.http_post(
          url := 'https://jxybqmquymxkvxxpiuhv.supabase.co/functions/v1/developer-webhook',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'apikey', v_anon_key,
            'x-internal-function-token', v_internal_token
          ),
          body := jsonb_build_object(
            'action', 'trigger',
            'developer_id', v_escrow.developer_id,
            'event_type', 'escrow.released',
            'payload', jsonb_build_object(
              'escrow_id', v_escrow.escrow_id,
              'amount', v_result->'amount',
              'payee_user_id', v_result->'payee_user_id',
              'released_at', v_result->'released_at',
              'automatic', true
            )
          )
        );
      END IF;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$function$;
