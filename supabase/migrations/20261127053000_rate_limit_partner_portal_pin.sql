-- Add per-partner/per-client throttling to the public PIN verification RPC.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.partner_portal_login_attempts (
  slug text NOT NULL,
  client_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  PRIMARY KEY (slug, client_hash)
);

REVOKE ALL ON TABLE private.partner_portal_login_attempts
  FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS partner_portal_login_attempts_locked_until_idx
  ON private.partner_portal_login_attempts (locked_until)
  WHERE locked_until IS NOT NULL;

CREATE OR REPLACE FUNCTION public.verify_partner_portal(p_slug text, p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, private, pg_temp
AS $function$
DECLARE
  v_partner public.partners%ROWTYPE;
  v_deals jsonb;
  v_gross_volume numeric := 0;
  v_headers jsonb := '{}'::jsonb;
  v_client_ip text;
  v_client_hash text;
  v_slug text;
  v_locked_until timestamptz;
BEGIN
  v_slug := lower(trim(COALESCE(p_slug, '')));
  IF v_slug = '' OR length(v_slug) > 100
     OR p_pin IS NULL OR length(trim(p_pin)) < 4 OR length(trim(p_pin)) > 32 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid partner PIN or inactive partner');
  END IF;

  BEGIN
    v_headers := COALESCE(NULLIF(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  EXCEPTION WHEN OTHERS THEN
    v_headers := '{}'::jsonb;
  END;

  v_client_ip := COALESCE(
    NULLIF(v_headers->>'cf-connecting-ip', ''),
    NULLIF(v_headers->>'x-real-ip', ''),
    NULLIF(split_part(COALESCE(v_headers->>'x-forwarded-for', ''), ',', 1), ''),
    'unknown'
  );
  v_client_hash := encode(extensions.digest(lower(trim(v_client_ip)), 'sha256'), 'hex');

  SELECT locked_until
  INTO v_locked_until
  FROM private.partner_portal_login_attempts
  WHERE slug = v_slug AND client_hash = v_client_hash;

  IF v_locked_until IS NOT NULL AND v_locked_until > now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid partner PIN or inactive partner');
  END IF;

  SELECT * INTO v_partner
  FROM public.partners
  WHERE slug = v_slug AND is_active = true;

  IF NOT FOUND
     OR v_partner.password_hash IS NULL
     OR crypt(trim(p_pin), v_partner.password_hash) <> v_partner.password_hash THEN
    INSERT INTO private.partner_portal_login_attempts (
      slug, client_hash, attempts, window_started_at, locked_until
    )
    VALUES (v_slug, v_client_hash, 1, now(), NULL)
    ON CONFLICT (slug, client_hash) DO UPDATE
    SET
      attempts = CASE
        WHEN private.partner_portal_login_attempts.window_started_at < now() - interval '15 minutes'
          THEN 1
        ELSE private.partner_portal_login_attempts.attempts + 1
      END,
      window_started_at = CASE
        WHEN private.partner_portal_login_attempts.window_started_at < now() - interval '15 minutes'
          THEN now()
        ELSE private.partner_portal_login_attempts.window_started_at
      END,
      locked_until = CASE
        WHEN (
          CASE
            WHEN private.partner_portal_login_attempts.window_started_at < now() - interval '15 minutes'
              THEN 1
            ELSE private.partner_portal_login_attempts.attempts + 1
          END
        ) >= 8 THEN now() + interval '15 minutes'
        ELSE NULL
      END;

    RETURN jsonb_build_object('success', false, 'error', 'Invalid partner PIN or inactive partner');
  END IF;

  DELETE FROM private.partner_portal_login_attempts
  WHERE slug = v_slug AND client_hash = v_client_hash;

  SELECT COALESCE(SUM(gross_amount), 0)
  INTO v_gross_volume
  FROM public.partner_payout_logs
  WHERE partner_id = v_partner.id
    AND deal_type IN ('gig_order', 'hire_contract');

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', d.id,
    'deal_type', d.deal_type,
    'gross_amount', d.gross_amount,
    'commission_amount', d.commission_amount,
    'created_at', d.created_at
  ) ORDER BY d.created_at DESC), '[]'::jsonb)
  INTO v_deals
  FROM (
    SELECT id, deal_type, gross_amount, commission_amount, created_at
    FROM public.partner_payout_logs
    WHERE partner_id = v_partner.id
      AND deal_type IN ('gig_order', 'hire_contract')
    ORDER BY created_at DESC
    LIMIT 10
  ) d;

  RETURN jsonb_build_object(
    'success', true,
    'partner_name', v_partner.name,
    'slug', v_partner.slug,
    'stats', jsonb_build_object(
      'students_registered', (SELECT COUNT(*) FROM public.profiles WHERE partner_id = v_partner.id),
      'gross_volume', v_gross_volume,
      'total_earned', v_partner.total_earned,
      'total_paid_out', v_partner.total_paid_out,
      'unpaid_balance', v_partner.total_earned - v_partner.total_paid_out
    ),
    'recent_deals', v_deals,
    'payout_info', v_partner.payout_info
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.verify_partner_portal(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_partner_portal(text, text) TO anon, authenticated;
