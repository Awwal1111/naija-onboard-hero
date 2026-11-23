-- Institutional partner system: secure, idempotent foundation.
-- PINs are shown once at creation; plaintext PINs are never stored.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS total_paid_out NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS payout_info JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.partners
  ALTER COLUMN plain_display_pin DROP NOT NULL;

UPDATE public.partners SET plain_display_pin = NULL
WHERE plain_display_pin IS NOT NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_partner_id ON public.profiles(partner_id);

ALTER TABLE public.partner_payout_logs
  ADD COLUMN IF NOT EXISTS deal_type TEXT,
  ADD COLUMN IF NOT EXISTS reference_id UUID,
  ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_fee_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.partner_payout_logs ALTER COLUMN gig_id DROP NOT NULL;

UPDATE public.partner_payout_logs
SET deal_type = CASE WHEN type = 'payout_made' THEN 'payout' ELSE 'gig_order' END
WHERE deal_type IS NULL;

ALTER TABLE public.partner_payout_logs
  DROP CONSTRAINT IF EXISTS partner_payout_logs_deal_type_check;
ALTER TABLE public.partner_payout_logs
  ADD CONSTRAINT partner_payout_logs_deal_type_check
  CHECK (deal_type IN ('gig_order','hire_contract','payout'));

CREATE OR REPLACE FUNCTION public.is_institutional_partner_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin','super_admin')
  );
$$;

-- Remove broad legacy policies that expose partner credentials and payout data.
DROP POLICY IF EXISTS "Authenticated users can view partners for admin use" ON public.partners;
DROP POLICY IF EXISTS "Public can view active partner basic info" ON public.partners;
DROP POLICY IF EXISTS "Admins full access to partners" ON public.partners;
DROP POLICY IF EXISTS "Authenticated users can view payout logs" ON public.partner_payout_logs;
DROP POLICY IF EXISTS "Admins full access to partner logs" ON public.partner_payout_logs;

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_payout_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institutional admins manage partners"
ON public.partners FOR ALL TO authenticated
USING (public.is_institutional_partner_admin())
WITH CHECK (public.is_institutional_partner_admin());

CREATE POLICY "Institutional admins manage partner logs"
ON public.partner_payout_logs FOR ALL TO authenticated
USING (public.is_institutional_partner_admin())
WITH CHECK (public.is_institutional_partner_admin());

-- No direct public/authenticated table reads: public access goes through narrow RPCs.
REVOKE ALL ON public.partners FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partners TO authenticated;
REVOKE ALL ON public.partner_payout_logs FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_payout_logs TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_institutional_partners()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_result JSONB;
BEGIN
  IF NOT public.is_institutional_partner_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', p.id, 'name', p.name, 'slug', p.slug,
    'partner_cut_pct', p.partner_cut_pct,
    'platform_fee_pct', p.platform_fee_pct,
    'website_url', p.website_url, 'payout_info', p.payout_info,
    'total_earned', p.total_earned, 'total_paid_out', p.total_paid_out,
    'is_active', p.is_active, 'created_at', p.created_at,
    'student_count', (SELECT COUNT(*) FROM public.profiles pr WHERE pr.partner_id = p.id)
  ) ORDER BY p.created_at DESC), '[]'::jsonb)
  INTO v_result FROM public.partners p;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_institutional_partner(
  p_name TEXT, p_slug TEXT, p_partner_cut_pct NUMERIC,
  p_platform_fee_pct NUMERIC, p_website_url TEXT DEFAULT NULL,
  p_payout_info JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_pin TEXT; v_id UUID;
BEGIN
  IF NOT public.is_institutional_partner_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF length(trim(p_name)) NOT BETWEEN 2 AND 120 THEN RAISE EXCEPTION 'Invalid partner name'; END IF;
  IF lower(trim(p_slug)) !~ '^[a-z0-9][a-z0-9-]{1,48}$' THEN RAISE EXCEPTION 'Invalid partner slug'; END IF;
  IF p_partner_cut_pct < 0 OR p_platform_fee_pct < 0 OR p_partner_cut_pct + p_platform_fee_pct > 100 THEN
    RAISE EXCEPTION 'Commission percentages must be non-negative and total no more than 100';
  END IF;
  v_pin := 'NL-' || upper(encode(gen_random_bytes(4), 'hex'));
  INSERT INTO public.partners(
    name, slug, partner_cut_pct, platform_fee_pct, password_hash,
    plain_display_pin, website_url, payout_info
  ) VALUES (
    trim(p_name), lower(trim(p_slug)), p_partner_cut_pct, p_platform_fee_pct,
    crypt(v_pin, gen_salt('bf', 12)), NULL, NULLIF(trim(p_website_url), ''), COALESCE(p_payout_info, '{}'::jsonb)
  ) RETURNING id INTO v_id;
  RETURN jsonb_build_object('id', v_id, 'pin', v_pin);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_institutional_partner_active(p_partner_id UUID, p_is_active BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_institutional_partner_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  UPDATE public.partners SET is_active = p_is_active WHERE id = p_partner_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_record_institutional_partner_payout(
  p_partner_id UUID, p_amount NUMERIC, p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_partner public.partners%ROWTYPE;
BEGIN
  IF NOT public.is_institutional_partner_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Payout amount must be greater than zero'; END IF;
  SELECT * INTO v_partner FROM public.partners WHERE id = p_partner_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Partner not found'; END IF;
  IF p_amount > (v_partner.total_earned - v_partner.total_paid_out) THEN
    RAISE EXCEPTION 'Payout exceeds unpaid commission balance';
  END IF;
  UPDATE public.partners SET total_paid_out = total_paid_out + p_amount WHERE id = p_partner_id;
  INSERT INTO public.partner_payout_logs(
    partner_id, gig_id, amount, type, deal_type, gross_amount,
    commission_amount, platform_fee_amount, notes, reference_id
  ) VALUES (
    p_partner_id, NULL, p_amount, 'payout_made', 'payout', 0, 0, 0, p_notes, NULL
  );
  RETURN jsonb_build_object('success', true, 'paid', p_amount);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_institutional_partner(p_slug TEXT)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN p.id IS NULL THEN jsonb_build_object('success', false)
  ELSE jsonb_build_object('success', true, 'id', p.id, 'name', p.name, 'slug', p.slug, 'website_url', p.website_url)
  END
  FROM (SELECT 1) seed
  LEFT JOIN public.partners p ON p.slug = lower(trim(p_slug)) AND p.is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.verify_partner_portal(p_slug TEXT, p_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_partner public.partners%ROWTYPE; v_deals JSONB;
BEGIN
  SELECT * INTO v_partner FROM public.partners
  WHERE slug = lower(trim(p_slug)) AND is_active = true;
  IF NOT FOUND OR p_password IS NULL OR v_partner.password_hash <> crypt(trim(p_password), v_partner.password_hash) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid partner PIN or inactive partner');
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', d.id, 'deal_type', d.deal_type,
    'gross_amount', d.gross_amount,
    'commission_amount', d.commission_amount,
    'created_at', d.created_at
  ) ORDER BY d.created_at DESC), '[]'::jsonb)
  INTO v_deals
  FROM (
    SELECT id, deal_type, gross_amount, commission_amount, created_at
    FROM public.partner_payout_logs
    WHERE partner_id = v_partner.id AND deal_type IN ('gig_order','hire_contract')
    ORDER BY created_at DESC LIMIT 10
  ) d;
  RETURN jsonb_build_object(
    'success', true, 'partner_name', v_partner.name, 'slug', v_partner.slug,
    'stats', jsonb_build_object(
      'students_registered', (SELECT COUNT(*) FROM public.profiles WHERE partner_id = v_partner.id),
      'total_earned', v_partner.total_earned,
      'total_paid_out', v_partner.total_paid_out,
      'unpaid_balance', v_partner.total_earned - v_partner.total_paid_out
    ),
    'recent_deals', v_deals,
    'payout_info', v_partner.payout_info
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_institutional_partner_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_institutional_partners() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_create_institutional_partner(TEXT,TEXT,NUMERIC,NUMERIC,TEXT,JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_institutional_partner_active(UUID,BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_record_institutional_partner_payout(UUID,NUMERIC,TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_public_institutional_partner(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_partner_portal(TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_institutional_partners() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_institutional_partner(TEXT,TEXT,NUMERIC,NUMERIC,TEXT,JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_institutional_partner_active(UUID,BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_record_institutional_partner_payout(UUID,NUMERIC,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_institutional_partner(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_partner_portal(TEXT,TEXT) TO anon, authenticated;
