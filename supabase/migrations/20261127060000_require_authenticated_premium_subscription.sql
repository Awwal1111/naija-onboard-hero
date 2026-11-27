-- Require a real authenticated owner for premium subscriptions.
-- The previous SECURITY DEFINER function allowed auth.uid() IS NULL, which
-- made its public EXECUTE grant an unauthenticated path to charge another user.
BEGIN;

CREATE OR REPLACE FUNCTION public.subscribe_premium(
  p_user_id uuid,
  p_months integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_cost numeric;
  v_balance numeric;
  v_current_expiry timestamptz;
  v_new_expiry timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You can only subscribe for yourself');
  END IF;

  IF p_months IS NULL OR p_months < 1 OR p_months > 12 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid number of months');
  END IF;

  v_cost := p_months * 2000;

  SELECT balance_withdrawable, premium_expires_at
    INTO v_balance, v_current_expiry
  FROM public.profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND OR COALESCE(v_balance, 0) < v_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance. You need ₦' || v_cost || ' NC');
  END IF;

  IF v_current_expiry IS NOT NULL AND v_current_expiry > now() THEN
    v_new_expiry := v_current_expiry + make_interval(months => p_months);
  ELSE
    v_new_expiry := now() + make_interval(months => p_months);
  END IF;

  UPDATE public.profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) - v_cost,
      balance_withdrawable = balance_withdrawable - v_cost,
      is_premium = true,
      premium_expires_at = v_new_expiry,
      premium_subscribed_at = COALESCE(premium_subscribed_at, now()),
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.wallet_transactions (user_id, kind, amount, status, reference)
  VALUES (p_user_id, 'premium_subscription', -v_cost, 'completed',
          'Premium subscription - ' || p_months || ' month(s)');

  PERFORM public.credit_platform_revenue(
    'premium_subscription', v_cost, p_user_id, NULL,
    jsonb_build_object('months', p_months)
  );

  RETURN jsonb_build_object(
    'success', true, 'expires_at', v_new_expiry,
    'months', p_months, 'cost', v_cost
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.subscribe_premium(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.subscribe_premium(uuid, integer) TO authenticated;

COMMIT;
