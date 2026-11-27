-- Retire fundraising without deleting historical financial records.
-- Campaign and contribution rows remain available to trusted administrators
-- for reconciliation, refunds, and audit purposes.
BEGIN;

REVOKE ALL PRIVILEGES ON TABLE
  public.fundraisings,
  public.fundraising_contributions,
  public.fundraising_updates
FROM anon, authenticated;

DO $$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname ILIKE '%fundrais%'
      AND p.prokind = 'f'
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      fn.signature
    );
  END LOOP;
END;
$$;

-- Close the IDOR in the personalized feed RPC. The caller may only request
-- their own personalized feed; anonymous calls are not supported.
CREATE OR REPLACE FUNCTION public.get_personalized_feed(
  p_user_id uuid,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  content_type text,
  title text,
  content text,
  media_urls text[],
  metadata jsonb,
  likes_count integer,
  comments_count integer,
  shares_count integer,
  views_count integer,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  visibility text,
  boost_amount numeric,
  boosted_at timestamptz,
  relevance_score numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized to request another user feed'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH recent AS (
    SELECT p0.*
    FROM public.posts p0
    WHERE p0.status = 'active'
      AND (p0.visibility = 'public' OR p0.user_id = p_user_id)
    ORDER BY p0.created_at DESC
    LIMIT 500
  ), scored AS (
    SELECT
      p.id AS s_id,
      p.user_id AS s_user,
      p.created_at AS s_created,
      (
        CASE WHEN pr.is_premium = true AND pr.premium_expires_at > NOW() THEN 80 ELSE 0 END
        + COALESCE(p.boost_amount, 0) * 2
        + CASE WHEN EXISTS (
          SELECT 1 FROM public.connections c
          WHERE (c.user1_id = p_user_id AND c.user2_id = p.user_id)
             OR (c.user2_id = p_user_id AND c.user1_id = p.user_id)
        ) THEN 50 ELSE 0 END
        + (COALESCE(p.likes_count, 0)
          + COALESCE(p.comments_count, 0) * 2
          + COALESCE(p.shares_count, 0) * 3) * 0.5
        + GREATEST(0, 100 - EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600)
      )::numeric AS score
    FROM recent p
    LEFT JOIN public.profiles pr ON pr.user_id = p.user_id
  ), ranked AS (
    SELECT
      s.s_id,
      s.score,
      ROW_NUMBER() OVER (
        PARTITION BY s.s_user
        ORDER BY s.score DESC, s.s_created DESC
      ) AS author_rank
    FROM scored s
  )
  SELECT
    p.id,
    p.user_id,
    p.content_type,
    p.title,
    p.content,
    p.media_urls,
    p.metadata,
    p.likes_count,
    p.comments_count,
    p.shares_count,
    p.views_count,
    p.status,
    p.created_at,
    p.updated_at,
    p.visibility,
    COALESCE(p.boost_amount, 0)::numeric,
    p.boosted_at,
    (r.score * POWER(0.4, r.author_rank - 1))::numeric
  FROM ranked r
  JOIN recent p ON p.id = r.s_id
  ORDER BY
    (r.author_rank > 2),
    (r.score * POWER(0.4, r.author_rank - 1)) DESC,
    p.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_personalized_feed(uuid, integer, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_personalized_feed(uuid, integer, integer)
  TO authenticated;

-- Keep the existing profiles_public column contract for compatibility, but
-- never publish referral codes, earnings totals, transaction counts, or
-- personal WhatsApp numbers to every authenticated user.
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT
  id,
  user_id,
  full_name,
  bio,
  profession,
  profile_picture_url,
  connections_count,
  state_name,
  lga_name,
  area,
  is_expert,
  expert_verified_at,
  created_at,
  updated_at,
  NULL::text AS referral_code,
  average_rating,
  rating_count,
  open_to_work,
  account_type,
  business_name,
  business_verified,
  completed_jobs_count,
  0::numeric AS total_earnings,
  0::integer AS total_transactions,
  verification_status,
  is_boosted,
  boost_expires_at,
  is_premium,
  premium_expires_at,
  NULL::text AS whatsapp_number,
  facebook_url,
  google_meet_link,
  intro_video_url,
  intro_video_thumbnail,
  portfolio_videos,
  user_mode,
  country_code
FROM public.profiles;

-- Partner portal PINs are already stored as bcrypt hashes for current partners.
-- Remove the weaker SHA-256 and plaintext fallbacks, and fix the legacy typo
-- that referenced p_password instead of p_pin.
CREATE OR REPLACE FUNCTION public.verify_partner_portal(p_slug text, p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $function$
DECLARE
  v_partner public.partners%ROWTYPE;
  v_deals jsonb;
  v_gross_volume numeric := 0;
BEGIN
  IF p_slug IS NULL OR length(trim(p_slug)) > 100
     OR p_pin IS NULL OR length(trim(p_pin)) < 4 OR length(trim(p_pin)) > 32 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid partner PIN or inactive partner');
  END IF;

  SELECT * INTO v_partner
  FROM public.partners
  WHERE slug = lower(trim(p_slug))
    AND is_active = true;

  IF NOT FOUND
     OR v_partner.password_hash IS NULL
     OR crypt(trim(p_pin), v_partner.password_hash) <> v_partner.password_hash THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid partner PIN or inactive partner');
  END IF;

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

COMMIT;
