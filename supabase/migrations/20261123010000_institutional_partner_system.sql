-- Institutional partner system: secure, idempotent foundation.
-- PINs are shown once at creation; plaintext PINs are never stored.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS total_paid_out NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS payout_info JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.partners
  ALTER COLUMN plain_display_pin DROP NOT NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_partner_id ON public.profiles(partner_id);

ALTER TABLE public.partner_payout_logs
  ADD COLUMN IF NOT EXISTS gig_id UUID,
  ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS deal_type TEXT,
  ADD COLUMN IF NOT EXISTS reference_id UUID,
  ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_fee_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.partner_payout_logs ALTER COLUMN gig_id DROP NOT NULL;

UPDATE public.partner_payout_logs
SET deal_type = COALESCE(deal_type, CASE WHEN type = 'payout_made' THEN 'payout' ELSE 'gig_order' END),
    type = COALESCE(type, CASE WHEN deal_type = 'payout' THEN 'payout_made' ELSE 'commission_earned' END),
    amount = CASE WHEN amount = 0 THEN COALESCE(commission_amount, gross_amount, 0) ELSE amount END
WHERE deal_type IS NULL OR type IS NULL OR amount = 0;

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
  v_pin := 'NL-' || upper(encode(gen_random_bytes(8), 'hex'));
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
  IF NOT FOUND OR p_password IS NULL OR NOT (
    v_partner.password_hash = crypt(trim(p_password), v_partner.password_hash)
    OR v_partner.password_hash = encode(digest(trim(p_password), 'sha256'), 'hex')
    OR v_partner.plain_display_pin = trim(p_password)
  ) THEN
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

-- Attach signup attribution from trusted auth metadata when the profile is created.
CREATE OR REPLACE FUNCTION public.attach_institutional_partner_at_signup()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
AS $
DECLARE v_slug TEXT;
BEGIN
  SELECT raw_user_meta_data ->> 'partner_slug'
  INTO v_slug FROM auth.users WHERE id = NEW.user_id;
  IF v_slug IS NOT NULL AND NEW.partner_id IS NULL THEN
    UPDATE public.profiles pr
    SET partner_id = p.id
    FROM public.partners p
    WHERE pr.user_id = NEW.user_id
      AND p.slug = lower(trim(v_slug))
      AND p.is_active = true;
  END IF;
  RETURN NEW;
END;
$;

DROP TRIGGER IF EXISTS trg_attach_institutional_partner_signup ON public.profiles;
CREATE TRIGGER trg_attach_institutional_partner_signup
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.attach_institutional_partner_at_signup();

REVOKE ALL ON FUNCTION public.attach_institutional_partner_at_signup() FROM PUBLIC, anon, authenticated;

-- Atomic partner-aware gig and hire settlement. Existing rows remain unchanged.
CREATE OR REPLACE FUNCTION public.complete_gig_order(p_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_order RECORD;
  v_partner RECORD;
  v_partner_share numeric := 0;
  v_platform_share numeric := 0;
  v_seller_amount numeric := 0;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;
  SELECT * INTO v_order FROM public.gig_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Order not found'); END IF;
  IF v_order.buyer_id IS DISTINCT FROM v_actor THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the buyer can complete the order');
  END IF;
  IF v_order.status NOT IN ('delivered','revision_requested','in_progress','accepted') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order cannot be completed in current state');
  END IF;

  SELECT p.id, p.partner_cut_pct, p.platform_fee_pct
  INTO v_partner
  FROM public.profiles pr
  JOIN public.partners p ON p.id = pr.partner_id AND p.is_active = true
  WHERE pr.user_id = v_order.seller_id
  FOR UPDATE OF p;

  IF FOUND THEN
    v_partner_share := ROUND(v_order.amount * v_partner.partner_cut_pct / 100.0, 2);
    v_platform_share := ROUND(v_order.amount * v_partner.platform_fee_pct / 100.0, 2);
  ELSE
    v_platform_share := COALESCE(v_order.platform_fee, 0);
  END IF;
  v_seller_amount := v_order.amount - v_partner_share - v_platform_share;
  IF v_seller_amount < 0 THEN
    RAISE EXCEPTION 'Partner and platform fees exceed gig gross amount';
  END IF;

  UPDATE public.profiles
  SET balance_withdrawable = balance_withdrawable + v_seller_amount,
      wallet_balance = wallet_balance + v_seller_amount, updated_at = now()
  WHERE user_id = v_order.seller_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Seller profile not found'; END IF;

  UPDATE public.gig_orders SET status = 'completed', completed_at = now(), updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO public.wallet_transactions(user_id, kind, amount, status, reference, metadata)
  VALUES (v_order.seller_id, 'gig_order_payout', v_seller_amount, 'completed',
    'Gig order completed: ' || v_order.title,
    jsonb_build_object('order_id', p_order_id, 'gross', v_order.amount,
      'partner_commission', v_partner_share, 'platform_fee', v_platform_share));

  IF v_partner_share > 0 THEN
    UPDATE public.partners SET total_earned = total_earned + v_partner_share WHERE id = v_partner.id;
    INSERT INTO public.partner_payout_logs(
      partner_id, gig_id, amount, type, deal_type, reference_id,
      gross_amount, commission_amount, platform_fee_amount, notes
    ) VALUES (
      v_partner.id, p_order_id, v_partner_share, 'commission_earned', 'gig_order',
      p_order_id, v_order.amount, v_partner_share, v_platform_share, 'Completed gig commission'
    );
  END IF;

  PERFORM public.credit_platform_revenue(
    'gig_order_fee', v_platform_share, v_order.buyer_id, p_order_id::text,
    jsonb_build_object('seller_id', v_order.seller_id, 'gross', v_order.amount,
      'partner_id', v_partner.id, 'partner_commission', v_partner_share)
  );
  RETURN jsonb_build_object('success', true, 'seller_amount', v_seller_amount,
    'partner_commission', v_partner_share, 'platform_fee', v_platform_share);
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_hire_contract(p_contract_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_c RECORD;
  v_partner RECORD;
  v_pay numeric;
  v_partner_share numeric := 0;
  v_fee numeric := 0;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;
  SELECT * INTO v_c FROM public.hire_contracts WHERE id = p_contract_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Contract not found'); END IF;
  IF v_c.client_id IS DISTINCT FROM v_actor THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only client can complete contract');
  END IF;
  IF v_c.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contract not active');
  END IF;

  SELECT p.id, p.partner_cut_pct, p.platform_fee_pct
  INTO v_partner
  FROM public.profiles pr
  JOIN public.partners p ON p.id = pr.partner_id AND p.is_active = true
  WHERE pr.user_id = v_c.expert_id
  FOR UPDATE OF p;

  IF FOUND THEN
    v_partner_share := ROUND(v_c.escrow_held * v_partner.partner_cut_pct / 100.0, 2);
    v_fee := ROUND(v_c.escrow_held * v_partner.platform_fee_pct / 100.0, 2);
  ELSE
    v_fee := LEAST(COALESCE(v_c.platform_fee, 0), COALESCE(v_c.escrow_held, 0));
  END IF;
  v_pay := COALESCE(v_c.escrow_held, 0) - v_partner_share - v_fee;
  IF v_pay < 0 THEN RAISE EXCEPTION 'Partner and platform fees exceed contract escrow'; END IF;

  IF v_pay > 0 THEN
    UPDATE public.profiles SET balance_withdrawable = balance_withdrawable + v_pay,
      wallet_balance = wallet_balance + v_pay, updated_at = now()
    WHERE user_id = v_c.expert_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Expert profile not found'; END IF;
    INSERT INTO public.wallet_transactions(user_id, kind, amount, status, reference, metadata)
    VALUES (v_c.expert_id, 'hire_contract_payout', v_pay, 'completed',
      'Hire contract payout: ' || v_c.title,
      jsonb_build_object('contract_id', p_contract_id, 'partner_commission', v_partner_share, 'platform_fee', v_fee));
  END IF;

  IF v_partner_share > 0 THEN
    UPDATE public.partners SET total_earned = total_earned + v_partner_share WHERE id = v_partner.id;
    INSERT INTO public.partner_payout_logs(
      partner_id, gig_id, amount, type, deal_type, reference_id,
      gross_amount, commission_amount, platform_fee_amount, notes
    ) VALUES (
      v_partner.id, NULL, v_partner_share, 'commission_earned', 'hire_contract',
      p_contract_id, v_c.escrow_held, v_partner_share, v_fee, 'Completed hire contract commission'
    );
  END IF;

  PERFORM public.credit_platform_revenue(
    'hire_contract_fee', v_fee, v_c.client_id, p_contract_id::text,
    jsonb_build_object('expert_id', v_c.expert_id, 'partner_id', v_partner.id,
      'partner_commission', v_partner_share)
  );

  UPDATE public.hire_contracts SET status = 'completed', completed_at = now(),
    escrow_held = 0, updated_at = now()
  WHERE id = p_contract_id;
  INSERT INTO public.hire_contract_events(contract_id, actor_id, event_type, payload)
  VALUES (p_contract_id, v_actor, 'completed',
    jsonb_build_object('paid', v_pay, 'partner_commission', v_partner_share, 'platform_fee', v_fee));

  RETURN jsonb_build_object('success', true, 'paid', v_pay,
    'partner_commission', v_partner_share, 'platform_fee', v_fee);
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_gig_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_gig_order(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.complete_hire_contract(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_hire_contract(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.is_institutional_partner_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_institutional_partners() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_create_institutional_partner(TEXT,TEXT,NUMERIC,NUMERIC,TEXT,JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_institutional_partner_active(UUID,BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_record_institutional_partner_payout(UUID,NUMERIC,TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_public_institutional_partner(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_partner_portal(TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_institutional_partner_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_institutional_partners() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_institutional_partner(TEXT,TEXT,NUMERIC,NUMERIC,TEXT,JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_institutional_partner_active(UUID,BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_record_institutional_partner_payout(UUID,NUMERIC,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_institutional_partner(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_partner_portal(TEXT,TEXT) TO anon, authenticated;
