
-- Atomic gig order financial functions
-- place_gig_order: deducts buyer balance, creates order in 'pending'
CREATE OR REPLACE FUNCTION public.place_gig_order(
  p_gig_id uuid,
  p_seller_id uuid,
  p_title text,
  p_description text,
  p_amount numeric,
  p_delivery_days integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_buyer uuid := auth.uid();
  v_balance numeric;
  v_order_id uuid;
  v_platform_fee numeric;
  v_deadline timestamptz;
BEGIN
  IF v_buyer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF v_buyer = p_seller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot order your own gig');
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid amount');
  END IF;

  SELECT balance_withdrawable INTO v_balance
  FROM profiles WHERE user_id = v_buyer FOR UPDATE;

  IF v_balance IS NULL OR v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient NC balance. Please top up your wallet.');
  END IF;

  v_platform_fee := p_amount * 0.05;
  v_deadline := now() + (COALESCE(p_delivery_days, 7) || ' days')::interval;

  -- Hold funds: deduct from buyer
  UPDATE profiles
  SET balance_withdrawable = balance_withdrawable - p_amount,
      wallet_balance = wallet_balance - p_amount,
      updated_at = now()
  WHERE user_id = v_buyer;

  INSERT INTO gig_orders(gig_id, buyer_id, seller_id, title, description,
    amount, platform_fee, status, delivery_deadline, buyer_notes)
  VALUES (p_gig_id, v_buyer, p_seller_id, p_title, p_description,
    p_amount, v_platform_fee, 'pending', v_deadline, p_description)
  RETURNING id INTO v_order_id;

  INSERT INTO wallet_transactions(user_id, kind, amount, status, reference, metadata)
  VALUES (v_buyer, 'gig_order_hold', -p_amount, 'completed',
    'Gig order escrow: ' || p_title,
    jsonb_build_object('order_id', v_order_id, 'gig_id', p_gig_id, 'seller_id', p_seller_id));

  RETURN jsonb_build_object('success', true, 'order_id', v_order_id);
END;
$$;

-- complete_gig_order: buyer accepts delivery → credit seller (minus platform fee)
CREATE OR REPLACE FUNCTION public.complete_gig_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_order RECORD;
  v_seller_amount numeric;
BEGIN
  SELECT * INTO v_order FROM gig_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;
  IF v_order.buyer_id <> v_actor THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the buyer can complete the order');
  END IF;
  IF v_order.status NOT IN ('delivered','revision_requested','in_progress','accepted') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order cannot be completed in current state');
  END IF;

  v_seller_amount := v_order.amount - COALESCE(v_order.platform_fee, 0);

  UPDATE profiles
  SET balance_withdrawable = balance_withdrawable + v_seller_amount,
      wallet_balance = wallet_balance + v_seller_amount,
      updated_at = now()
  WHERE user_id = v_order.seller_id;

  UPDATE gig_orders
  SET status = 'completed', completed_at = now(), updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO wallet_transactions(user_id, kind, amount, status, reference, metadata)
  VALUES (v_order.seller_id, 'gig_order_payout', v_seller_amount, 'completed',
    'Gig order completed: ' || v_order.title,
    jsonb_build_object('order_id', p_order_id, 'gross', v_order.amount, 'platform_fee', v_order.platform_fee));

  RETURN jsonb_build_object('success', true, 'seller_amount', v_seller_amount);
END;
$$;

-- cancel_gig_order: refund buyer if order is cancellable
CREATE OR REPLACE FUNCTION public.cancel_gig_order(p_order_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_order RECORD;
BEGIN
  SELECT * INTO v_order FROM gig_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;
  IF v_actor NOT IN (v_order.buyer_id, v_order.seller_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;
  IF v_order.status NOT IN ('pending','accepted') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order cannot be cancelled now. Please open a dispute.');
  END IF;

  -- Refund buyer
  UPDATE profiles
  SET balance_withdrawable = balance_withdrawable + v_order.amount,
      wallet_balance = wallet_balance + v_order.amount,
      updated_at = now()
  WHERE user_id = v_order.buyer_id;

  UPDATE gig_orders
  SET status = 'cancelled', cancelled_at = now(),
      cancellation_reason = p_reason, updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO wallet_transactions(user_id, kind, amount, status, reference, metadata)
  VALUES (v_order.buyer_id, 'gig_order_refund', v_order.amount, 'completed',
    'Gig order refunded: ' || v_order.title,
    jsonb_build_object('order_id', p_order_id, 'reason', p_reason));

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_gig_order(uuid,uuid,text,text,numeric,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_gig_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_gig_order(uuid,text) TO authenticated;
