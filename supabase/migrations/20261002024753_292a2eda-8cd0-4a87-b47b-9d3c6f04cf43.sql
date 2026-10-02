CREATE TABLE public.platform_revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  amount numeric NOT NULL,
  payer_id uuid,
  reference_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_revenue TO authenticated;
GRANT ALL ON public.platform_revenue TO service_role;
ALTER TABLE public.platform_revenue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view platform revenue" ON public.platform_revenue FOR SELECT TO authenticated USING (public.has_admin_access());
CREATE INDEX idx_platform_revenue_created ON public.platform_revenue(created_at DESC);

CREATE OR REPLACE FUNCTION public.credit_platform_revenue(p_source text, p_amount numeric, p_payer uuid, p_ref text, p_meta jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RETURN; END IF;
  INSERT INTO platform_revenue(source, amount, payer_id, reference_id, metadata)
  VALUES (p_source, p_amount, p_payer, p_ref, COALESCE(p_meta,'{}'::jsonb));
  UPDATE admin_wallet SET balance = balance + p_amount, updated_at = now() WHERE id = 1;
  IF NOT FOUND THEN INSERT INTO admin_wallet(id, balance, updated_at) VALUES (1, p_amount, now()); END IF;
END; $$;
REVOKE ALL ON FUNCTION public.credit_platform_revenue(text, numeric, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_platform_revenue(text, numeric, uuid, text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.complete_gig_order(p_order_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_order RECORD;
  v_seller_amount numeric;
BEGIN
  SELECT * INTO v_order FROM gig_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Order not found'); END IF;
  IF v_order.buyer_id <> v_actor THEN RETURN jsonb_build_object('success', false, 'error', 'Only the buyer can complete the order'); END IF;
  IF v_order.status NOT IN ('delivered','revision_requested','in_progress','accepted') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order cannot be completed in current state');
  END IF;

  v_seller_amount := v_order.amount - COALESCE(v_order.platform_fee, 0);

  UPDATE profiles SET balance_withdrawable = balance_withdrawable + v_seller_amount,
      wallet_balance = wallet_balance + v_seller_amount, updated_at = now()
  WHERE user_id = v_order.seller_id;

  UPDATE gig_orders SET status = 'completed', completed_at = now(), updated_at = now() WHERE id = p_order_id;

  INSERT INTO wallet_transactions(user_id, kind, amount, status, reference, metadata)
  VALUES (v_order.seller_id, 'gig_order_payout', v_seller_amount, 'completed',
    'Gig order completed: ' || v_order.title,
    jsonb_build_object('order_id', p_order_id, 'gross', v_order.amount, 'platform_fee', v_order.platform_fee));

  PERFORM credit_platform_revenue('gig_order_fee', COALESCE(v_order.platform_fee,0), v_order.buyer_id, p_order_id::text,
    jsonb_build_object('seller_id', v_order.seller_id, 'gross', v_order.amount));

  RETURN jsonb_build_object('success', true, 'seller_amount', v_seller_amount);
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_hire_contract(p_contract_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_c RECORD;
  v_pay numeric;
  v_fee numeric;
BEGIN
  SELECT * INTO v_c FROM hire_contracts WHERE id = p_contract_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Contract not found'); END IF;
  IF v_c.client_id <> v_actor THEN RETURN jsonb_build_object('success', false, 'error', 'Only client can complete contract'); END IF;
  IF v_c.status <> 'active' THEN RETURN jsonb_build_object('success', false, 'error', 'Contract not active'); END IF;

  v_fee := LEAST(COALESCE(v_c.platform_fee, 0), COALESCE(v_c.escrow_held, 0));
  v_pay := v_c.escrow_held - v_fee;
  IF v_pay > 0 THEN
    UPDATE profiles SET balance_withdrawable = balance_withdrawable + v_pay,
          wallet_balance = wallet_balance + v_pay, updated_at = now()
    WHERE user_id = v_c.expert_id;
    INSERT INTO wallet_transactions(user_id, kind, amount, status, reference, metadata)
    VALUES (v_c.expert_id, 'hire_contract_payout', v_pay, 'completed',
      'Hire contract payout: ' || v_c.title, jsonb_build_object('contract_id', p_contract_id));
  END IF;

  PERFORM credit_platform_revenue('hire_contract_fee', v_fee, v_c.client_id, p_contract_id::text,
    jsonb_build_object('expert_id', v_c.expert_id));

  UPDATE hire_contracts SET status = 'completed', completed_at = now(), escrow_held = 0, updated_at = now()
  WHERE id = p_contract_id;

  INSERT INTO hire_contract_events(contract_id, actor_id, event_type, payload)
  VALUES (p_contract_id, v_actor, 'completed', jsonb_build_object('paid', v_pay, 'platform_fee', v_fee));

  RETURN jsonb_build_object('success', true, 'paid', v_pay);
END;
$function$;

CREATE OR REPLACE FUNCTION public.subscribe_premium(p_user_id uuid, p_months integer DEFAULT 1)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_cost numeric;
  v_balance numeric;
  v_current_expiry timestamptz;
  v_new_expiry timestamptz;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You can only subscribe for yourself');
  END IF;
  IF p_months IS NULL OR p_months < 1 OR p_months > 12 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid number of months');
  END IF;

  v_cost := p_months * 2000;

  SELECT balance_withdrawable, premium_expires_at INTO v_balance, v_current_expiry
  FROM profiles WHERE user_id = p_user_id FOR UPDATE;

  IF v_balance IS NULL OR v_balance < v_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance. You need ₦' || v_cost || ' NC');
  END IF;

  IF v_current_expiry IS NOT NULL AND v_current_expiry > NOW() THEN
    v_new_expiry := v_current_expiry + (p_months || ' months')::interval;
  ELSE
    v_new_expiry := NOW() + (p_months || ' months')::interval;
  END IF;

  UPDATE profiles SET
    wallet_balance = wallet_balance - v_cost,
    balance_withdrawable = balance_withdrawable - v_cost,
    is_premium = true,
    premium_expires_at = v_new_expiry,
    premium_subscribed_at = COALESCE(premium_subscribed_at, NOW()),
    updated_at = NOW()
  WHERE user_id = p_user_id;

  INSERT INTO wallet_transactions (user_id, kind, amount, status, reference)
  VALUES (p_user_id, 'premium_subscription', -v_cost, 'completed', 'Premium subscription - ' || p_months || ' month(s)');

  PERFORM credit_platform_revenue('premium_subscription', v_cost, p_user_id, NULL, jsonb_build_object('months', p_months));

  RETURN jsonb_build_object('success', true, 'expires_at', v_new_expiry, 'months', p_months, 'cost', v_cost);
END;
$function$;