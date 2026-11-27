-- STAGED ONLY: authoritative gig-order escrow ledger and status transitions.
-- This file is intentionally under supabase/pending, not supabase/migrations.
-- Existing orders are NOT backfilled automatically: reconcile them manually
-- against independent wallet evidence before applying this file.
--
-- New orders get a private hold row in the same transaction that debits the
-- buyer. Completion, cancellation, and milestone release must consume that row.
-- wallet_transactions is not treated as proof because browser INSERT remains
-- enabled for legacy product flows.

BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.gig_order_escrow_holds (
  order_id uuid PRIMARY KEY REFERENCES public.gig_orders(id) ON DELETE RESTRICT,
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  remaining_amount numeric(18,2) NOT NULL CHECK (remaining_amount >= 0 AND remaining_amount <= amount),
  state text NOT NULL DEFAULT 'held'
    CHECK (state IN ('held', 'partially_released', 'released', 'refunded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE private.gig_order_escrow_holds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.gig_order_escrow_holds FROM PUBLIC, anon, authenticated, service_role;


-- 1. Order placement: debit buyer and create authoritative hold atomically.
CREATE OR REPLACE FUNCTION public.place_gig_order(
  p_gig_id uuid,
  p_seller_id uuid,
  p_title text,
  p_description text,
  p_amount numeric,
  p_delivery_days integer,
  p_tier text DEFAULT NULL,
  p_milestones jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_buyer uuid := auth.uid();
  v_balance numeric;
  v_wallet numeric;
  v_gig_seller uuid;
  v_order_id uuid;
  v_platform_fee numeric;
  v_deadline timestamptz;
  v_ms_sum numeric := 0;
  v_ms jsonb;
  v_idx integer := 0;
BEGIN
  IF v_buyer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_seller_id IS NULL OR v_buyer = p_seller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid seller');
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR NULLIF(trim(COALESCE(p_title, '')), '') IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid order details');
  END IF;
  IF p_delivery_days IS NULL OR p_delivery_days < 1 OR p_delivery_days > 365 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Delivery period must be between 1 and 365 days');
  END IF;

  SELECT user_id INTO v_gig_seller
  FROM public.jobs_services
  WHERE id = p_gig_id AND status = 'active'
  FOR SHARE;
  IF NOT FOUND OR v_gig_seller IS DISTINCT FROM p_seller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gig is unavailable or seller does not match the gig owner');
  END IF;

  IF p_milestones IS NOT NULL AND jsonb_typeof(p_milestones) <> 'array' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Milestones must be an array');
  END IF;
  IF p_milestones IS NOT NULL AND jsonb_array_length(p_milestones) > 0 THEN
    IF jsonb_array_length(p_milestones) > 50 THEN
      RETURN jsonb_build_object('success', false, 'error', 'A maximum of 50 milestones is allowed');
    END IF;
    FOR v_ms IN SELECT * FROM jsonb_array_elements(p_milestones) LOOP
      IF COALESCE(NULLIF(v_ms->>'amount', '')::numeric, 0) <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Every milestone must have a positive amount');
      END IF;
      v_ms_sum := v_ms_sum + (v_ms->>'amount')::numeric;
    END LOOP;
    IF ROUND(v_ms_sum, 2) <> ROUND(p_amount, 2) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Milestones total must equal order amount');
    END IF;
  END IF;

  SELECT balance_withdrawable, wallet_balance INTO v_balance, v_wallet
  FROM public.profiles
  WHERE user_id = v_buyer
  FOR UPDATE;

  IF NOT FOUND OR COALESCE(v_balance, 0) < p_amount OR COALESCE(v_wallet, 0) < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient available NC balance');
  END IF;

  v_platform_fee := ROUND(p_amount * 0.05, 2);
  v_deadline := now() + make_interval(days => p_delivery_days);

  UPDATE public.profiles
  SET balance_withdrawable = balance_withdrawable - p_amount,
      wallet_balance = COALESCE(wallet_balance, 0) - p_amount,
      updated_at = now()
  WHERE user_id = v_buyer;

  INSERT INTO public.gig_orders(
    gig_id, buyer_id, seller_id, title, description, amount, platform_fee,
    status, delivery_deadline, buyer_notes
  )
  VALUES (
    p_gig_id, v_buyer, p_seller_id,
    CASE WHEN p_tier IS NULL OR p_tier = '' THEN trim(p_title) ELSE upper(p_tier) || ' • ' || trim(p_title) END,
    p_description, p_amount, v_platform_fee, 'pending', v_deadline, p_description
  )
  RETURNING id INTO v_order_id;

  INSERT INTO private.gig_order_escrow_holds(
    order_id, buyer_id, seller_id, amount, remaining_amount, state
  )
  VALUES (v_order_id, v_buyer, p_seller_id, p_amount, p_amount, 'held');

  INSERT INTO public.wallet_transactions(user_id, kind, amount, status, reference, metadata)
  VALUES (
    v_buyer, 'gig_order_hold', -p_amount, 'completed',
    'Gig order escrow: ' || trim(p_title),
    jsonb_build_object('order_id', v_order_id, 'gig_id', p_gig_id, 'seller_id', p_seller_id, 'tier', p_tier)
  );

  IF p_milestones IS NOT NULL AND jsonb_array_length(p_milestones) > 0 THEN
    FOR v_ms IN SELECT * FROM jsonb_array_elements(p_milestones) LOOP
      v_idx := v_idx + 1;
      INSERT INTO public.project_milestones(order_id, title, description, amount, due_date, status, order_index)
      VALUES (
        v_order_id,
        COALESCE(NULLIF(v_ms->>'title', ''), 'Milestone ' || v_idx),
        v_ms->>'description',
        (v_ms->>'amount')::numeric,
        NULLIF(v_ms->>'due_date', '')::timestamptz,
        'pending',
        v_idx
      );
    END LOOP;
  END IF;

  RETURN jsonb_build_object('success', true, 'order_id', v_order_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.place_gig_order(uuid, uuid, text, text, numeric, integer, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_gig_order(uuid, uuid, text, text, numeric, integer, text, jsonb) TO authenticated;


-- 2. Explicit, party-authorized workflow transitions. No arbitrary column updates.
CREATE OR REPLACE FUNCTION public.transition_gig_order(
  p_order_id uuid,
  p_status text,
  p_seller_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_order public.gig_orders%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  SELECT * INTO v_order
  FROM public.gig_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_actor = v_order.seller_id THEN
    IF p_status = 'accepted' AND v_order.status = 'pending' THEN
      UPDATE public.gig_orders SET status = 'accepted', updated_at = now() WHERE id = p_order_id;
    ELSIF p_status = 'in_progress' AND v_order.status = 'accepted' THEN
      UPDATE public.gig_orders SET status = 'in_progress', updated_at = now() WHERE id = p_order_id;
    ELSIF p_status = 'delivered' AND v_order.status IN ('in_progress', 'revision_requested') THEN
      UPDATE public.gig_orders
      SET status = 'delivered',
          delivered_at = now(),
          seller_notes = COALESCE(p_seller_notes, seller_notes),
          updated_at = now()
      WHERE id = p_order_id;
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Invalid seller transition');
    END IF;
  ELSIF v_actor = v_order.buyer_id THEN
    IF p_status = 'revision_requested' AND v_order.status = 'delivered' THEN
      IF COALESCE(v_order.revision_count, 0) >= COALESCE(v_order.max_revisions, 0) THEN
        RETURN jsonb_build_object('success', false, 'error', 'No revisions remaining');
      END IF;
      UPDATE public.gig_orders
      SET status = 'revision_requested',
          revision_count = COALESCE(revision_count, 0) + 1,
          updated_at = now()
      WHERE id = p_order_id;
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Invalid buyer transition');
    END IF;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.transition_gig_order(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_gig_order(uuid, text, text) TO authenticated;

-- Browser clients must use the constrained RPC above. SECURITY DEFINER settlement
-- functions retain owner privileges and continue to update these rows atomically.
REVOKE UPDATE ON TABLE public.gig_orders FROM PUBLIC, anon, authenticated;


-- 3. Completion requires an unconsumed private hold for the exact buyer/order/amount.
CREATE OR REPLACE FUNCTION public.complete_gig_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_order public.gig_orders%ROWTYPE;
  v_hold private.gig_order_escrow_holds%ROWTYPE;
  v_partner record;
  v_partner_share numeric := 0;
  v_platform_share numeric := 0;
  v_seller_amount numeric := 0;
BEGIN
  IF v_actor IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Authentication required'); END IF;

  SELECT * INTO v_order FROM public.gig_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Order not found'); END IF;
  IF v_order.buyer_id IS DISTINCT FROM v_actor THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the buyer can complete the order');
  END IF;
  IF v_order.status <> 'delivered' THEN
    RETURN jsonb_build_object('success', false, 'error', 'The seller must mark the order delivered before payment release');
  END IF;
  IF EXISTS (SELECT 1 FROM public.project_milestones WHERE order_id = p_order_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This order uses milestones. Approve and release each milestone separately.');
  END IF;

  SELECT * INTO v_hold
  FROM private.gig_order_escrow_holds
  WHERE order_id = p_order_id
  FOR UPDATE;

  IF NOT FOUND
     OR v_hold.state <> 'held'
     OR v_hold.buyer_id IS DISTINCT FROM v_order.buyer_id
     OR v_hold.seller_id IS DISTINCT FROM v_order.seller_id
     OR v_hold.amount IS DISTINCT FROM v_order.amount
     OR v_hold.remaining_amount IS DISTINCT FROM v_order.amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Verified order escrow is missing or insufficient; manual review required');
  END IF;

  SELECT p.id, p.partner_cut_pct, p.platform_fee_pct INTO v_partner
  FROM public.profiles pr
  JOIN public.partners p ON p.id = pr.partner_id AND p.is_active IS TRUE
  WHERE pr.user_id = v_order.seller_id
  FOR UPDATE OF p;

  IF FOUND THEN
    v_partner_share := ROUND(v_order.amount * COALESCE(v_partner.partner_cut_pct, 0) / 100.0, 2);
    v_platform_share := ROUND(v_order.amount * COALESCE(v_partner.platform_fee_pct, 0) / 100.0, 2);
  ELSE
    v_platform_share := COALESCE(v_order.platform_fee, 0);
  END IF;

  v_seller_amount := v_order.amount - v_partner_share - v_platform_share;
  IF v_seller_amount < 0 THEN RAISE EXCEPTION 'Partner and platform fees exceed gig gross amount'; END IF;

  UPDATE public.profiles
  SET balance_withdrawable = COALESCE(balance_withdrawable, 0) + v_seller_amount,
      wallet_balance = COALESCE(wallet_balance, 0) + v_seller_amount,
      updated_at = now()
  WHERE user_id = v_order.seller_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Seller profile not found'; END IF;

  UPDATE private.gig_order_escrow_holds
  SET remaining_amount = 0, state = 'released', updated_at = now()
  WHERE order_id = p_order_id;

  UPDATE public.gig_orders
  SET status = 'completed', completed_at = now(), updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO public.wallet_transactions(user_id, kind, amount, status, reference, metadata)
  VALUES (
    v_order.seller_id, 'gig_order_payout', v_seller_amount, 'completed',
    'Gig order completed: ' || v_order.title,
    jsonb_build_object('order_id', p_order_id, 'gross', v_order.amount,
      'partner_commission', v_partner_share, 'platform_fee', v_platform_share)
  );

  IF v_partner_share > 0 THEN
    UPDATE public.partners SET total_earned = total_earned + v_partner_share WHERE id = v_partner.id;
    INSERT INTO public.partner_payout_logs(
      partner_id, gig_id, amount, type, deal_type, reference_id,
      gross_amount, commission_amount, platform_fee_amount, notes
    )
    VALUES (
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

REVOKE ALL ON FUNCTION public.complete_gig_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_gig_order(uuid) TO authenticated;


-- 4. Cancellation refunds only an exact, still-held amount.
CREATE OR REPLACE FUNCTION public.cancel_gig_order(p_order_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_order public.gig_orders%ROWTYPE;
  v_hold private.gig_order_escrow_holds%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Authentication required'); END IF;

  SELECT * INTO v_order FROM public.gig_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Order not found'); END IF;
  IF v_actor IS DISTINCT FROM v_order.buyer_id AND v_actor IS DISTINCT FROM v_order.seller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;
  IF v_order.status NOT IN ('pending', 'accepted') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order cannot be cancelled now. Please open a dispute.');
  END IF;
  IF EXISTS (SELECT 1 FROM public.project_milestones WHERE order_id = p_order_id AND status = 'released') THEN
    RETURN jsonb_build_object('success', false, 'error', 'A milestone has already been paid. Open a dispute instead of cancelling the full order.');
  END IF;

  SELECT * INTO v_hold
  FROM private.gig_order_escrow_holds
  WHERE order_id = p_order_id
  FOR UPDATE;

  IF NOT FOUND
     OR v_hold.state <> 'held'
     OR v_hold.buyer_id IS DISTINCT FROM v_order.buyer_id
     OR v_hold.amount IS DISTINCT FROM v_order.amount
     OR v_hold.remaining_amount IS DISTINCT FROM v_order.amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Verified order escrow is missing or insufficient; manual review required');
  END IF;

  UPDATE public.profiles
  SET balance_withdrawable = COALESCE(balance_withdrawable, 0) + v_order.amount,
      wallet_balance = COALESCE(wallet_balance, 0) + v_order.amount,
      updated_at = now()
  WHERE user_id = v_order.buyer_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Buyer profile not found for refund'; END IF;

  UPDATE private.gig_order_escrow_holds
  SET remaining_amount = 0, state = 'refunded', updated_at = now()
  WHERE order_id = p_order_id;

  UPDATE public.gig_orders
  SET status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = NULLIF(trim(COALESCE(p_reason, '')), ''),
      updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO public.wallet_transactions(user_id, kind, amount, status, reference, metadata)
  VALUES (
    v_order.buyer_id, 'gig_order_refund', v_order.amount, 'completed',
    'Gig order refunded: ' || v_order.title,
    jsonb_build_object('order_id', p_order_id, 'reason', p_reason)
  );

  RETURN jsonb_build_object('success', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.cancel_gig_order(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_gig_order(uuid, text) TO authenticated;


-- 5. Milestone releases consume the same private remaining-balance ledger.
CREATE OR REPLACE FUNCTION public.release_gig_milestone(p_milestone_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_m public.project_milestones%ROWTYPE;
  v_order public.gig_orders%ROWTYPE;
  v_hold private.gig_order_escrow_holds%ROWTYPE;
  v_seller_amt numeric;
  v_fee_share numeric;
  v_partner_share numeric := 0;
  v_partner record;
  v_remaining integer;
  v_milestone_total numeric;
  v_released_total numeric;
  v_new_remaining numeric;
BEGIN
  IF v_actor IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Authentication required'); END IF;

  SELECT * INTO v_m FROM public.project_milestones WHERE id = p_milestone_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Milestone not found'); END IF;
  IF v_m.order_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'This release function only supports gig-order milestones');
  END IF;
  IF v_m.status <> 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'The buyer must approve the milestone before release');
  END IF;

  SELECT * INTO v_order FROM public.gig_orders WHERE id = v_m.order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Order not found'); END IF;
  IF v_order.buyer_id IS DISTINCT FROM v_actor THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the buyer can release this milestone');
  END IF;
  IF v_order.status NOT IN ('accepted', 'in_progress', 'delivered', 'revision_requested') THEN
    RETURN jsonb_build_object('success', false, 'error', 'The order must be accepted or in progress before a milestone can be released');
  END IF;

  SELECT * INTO v_hold
  FROM private.gig_order_escrow_holds
  WHERE order_id = v_order.id
  FOR UPDATE;

  IF NOT FOUND
     OR v_hold.state NOT IN ('held', 'partially_released')
     OR v_hold.buyer_id IS DISTINCT FROM v_order.buyer_id
     OR v_hold.seller_id IS DISTINCT FROM v_order.seller_id
     OR v_hold.amount IS DISTINCT FROM v_order.amount
     OR COALESCE(v_hold.remaining_amount, 0) < v_m.amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Verified milestone escrow is missing or insufficient; manual review required');
  END IF;

  SELECT COALESCE(SUM(amount), 0),
         COALESCE(SUM(amount) FILTER (WHERE status = 'released'), 0)
  INTO v_milestone_total, v_released_total
  FROM public.project_milestones
  WHERE order_id = v_order.id;

  IF ROUND(v_milestone_total, 2) <> ROUND(v_order.amount, 2) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Milestone amounts must add up to the full escrowed order amount before release');
  END IF;
  IF v_released_total + v_m.amount > v_order.amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Milestone release would exceed the order escrow');
  END IF;

  SELECT p.id, p.partner_cut_pct, p.platform_fee_pct INTO v_partner
  FROM public.profiles pr
  JOIN public.partners p ON p.id = pr.partner_id AND p.is_active IS TRUE
  WHERE pr.user_id = v_order.seller_id
  FOR UPDATE OF p;

  IF FOUND THEN
    v_partner_share := ROUND(v_m.amount * COALESCE(v_partner.partner_cut_pct, 0) / 100.0, 2);
    v_fee_share := ROUND(v_m.amount * COALESCE(v_partner.platform_fee_pct, 0) / 100.0, 2);
  ELSE
    v_fee_share := ROUND((v_m.amount / NULLIF(v_order.amount, 0)) * COALESCE(v_order.platform_fee, 0), 2);
  END IF;

  v_seller_amt := v_m.amount - COALESCE(v_partner_share, 0) - COALESCE(v_fee_share, 0);
  IF v_seller_amt < 0 THEN RAISE EXCEPTION 'Milestone fee exceeds milestone amount'; END IF;

  UPDATE public.profiles
  SET balance_withdrawable = COALESCE(balance_withdrawable, 0) + v_seller_amt,
      wallet_balance = COALESCE(wallet_balance, 0) + v_seller_amt,
      updated_at = now()
  WHERE user_id = v_order.seller_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Seller profile not found'; END IF;

  v_new_remaining := v_hold.remaining_amount - v_m.amount;
  UPDATE private.gig_order_escrow_holds
  SET remaining_amount = v_new_remaining,
      state = CASE WHEN v_new_remaining = 0 THEN 'released' ELSE 'partially_released' END,
      updated_at = now()
  WHERE order_id = v_order.id;

  INSERT INTO public.wallet_transactions(user_id, kind, amount, status, reference, metadata)
  VALUES (
    v_order.seller_id, 'milestone_payout', v_seller_amt, 'completed',
    'Milestone released: ' || v_m.title,
    jsonb_build_object('order_id', v_order.id, 'milestone_id', p_milestone_id, 'platform_fee', v_fee_share)
  );

  IF v_partner_share > 0 THEN
    UPDATE public.partners SET total_earned = total_earned + v_partner_share WHERE id = v_partner.id;
    INSERT INTO public.partner_payout_logs(
      partner_id, gig_id, amount, type, deal_type, reference_id,
      gross_amount, commission_amount, platform_fee_amount, notes
    )
    VALUES (
      v_partner.id, v_order.gig_id, v_partner_share, 'commission_earned', 'gig_milestone',
      p_milestone_id, v_m.amount, v_partner_share, v_fee_share, 'Released gig milestone commission'
    );
  END IF;

  IF v_fee_share > 0 THEN
    PERFORM public.credit_platform_revenue(
      'gig_milestone_fee', v_fee_share, v_order.buyer_id, p_milestone_id::text,
      jsonb_build_object('order_id', v_order.id, 'seller_id', v_order.seller_id,
        'partner_id', v_partner.id, 'partner_commission', v_partner_share)
    );
  END IF;

  UPDATE public.project_milestones SET status = 'released', released_at = now()
  WHERE id = p_milestone_id;

  SELECT COUNT(*) INTO v_remaining
  FROM public.project_milestones
  WHERE order_id = v_order.id AND status <> 'released';

  IF v_remaining = 0 THEN
    IF v_new_remaining <> 0 THEN
      RAISE EXCEPTION 'All milestones released but escrow ledger still has a remainder';
    END IF;
    UPDATE public.gig_orders SET status = 'completed', completed_at = now(), updated_at = now()
    WHERE id = v_order.id;
  END IF;

  RETURN jsonb_build_object('success', true, 'remaining', v_remaining,
    'seller_amount', v_seller_amt, 'platform_fee', v_fee_share);
END;
$function$;

REVOKE ALL ON FUNCTION public.release_gig_milestone(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_gig_milestone(uuid) TO authenticated;

COMMIT;

-- IMPORTANT LEGACY COMPATIBILITY:
-- Existing open gig orders have no private hold rows and are intentionally
-- blocked from payout/refund after this file is applied. Reconcile each against
-- the buyer's original debit and independent ledger records, then insert a
-- verified hold row manually. Do not bulk-backfill from wallet_transactions:
-- authenticated clients currently have INSERT permission on that table.
