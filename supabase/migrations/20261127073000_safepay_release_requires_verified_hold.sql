-- STAGED ONLY: SafePay escrow release invariants.
-- This file is intentionally under supabase/pending and is NOT a migration.
-- Do not apply to production until staging tests and legacy-hold reconciliation pass.
--
-- Fail-closed rule: a SafePay payout/refund is allowed only when the buyer's
-- recorded escrow_hold covers the exact transaction amount. Never clamp a
-- missing/insufficient hold to zero and continue paying.

BEGIN;

CREATE OR REPLACE FUNCTION public.release_safepay_funds(p_safepay_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_tx public.safepay_transactions%ROWTYPE;
  v_hold integer;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT * INTO v_tx
  FROM public.safepay_transactions
  WHERE id = p_safepay_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'SafePay not found'; END IF;
  IF v_actor IS DISTINCT FROM v_tx.buyer_id THEN
    RAISE EXCEPTION 'Only the buyer can release funds';
  END IF;
  IF v_tx.status <> 'complete' THEN
    RAISE EXCEPTION 'SafePay must be completed first';
  END IF;
  IF v_tx.amount IS NULL OR v_tx.amount <= 0 THEN
    RAISE EXCEPTION 'Invalid SafePay amount';
  END IF;

  SELECT escrow_hold INTO v_hold
  FROM public.user_wallets
  WHERE user_id = v_tx.buyer_id
  FOR UPDATE;

  IF NOT FOUND OR COALESCE(v_hold, 0) < v_tx.amount THEN
    RAISE EXCEPTION 'SafePay escrow hold is missing or insufficient; manual review required'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.user_wallets
  SET escrow_hold = escrow_hold - v_tx.amount, updated_at = now()
  WHERE user_id = v_tx.buyer_id;

  UPDATE public.profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) + v_tx.amount,
      balance_withdrawable = COALESCE(balance_withdrawable, 0) + v_tx.amount,
      updated_at = now()
  WHERE user_id = v_tx.seller_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Seller profile not found'; END IF;

  INSERT INTO public.wallet_transactions(user_id, safepay_id, kind, amount, status, reference)
  VALUES (v_tx.seller_id, p_safepay_id, 'payment_received', v_tx.amount,
          'completed', 'SafePay payment received');

  UPDATE public.safepay_transactions
  SET status = 'released', released_at = now(), updated_at = now()
  WHERE id = p_safepay_id;
END;
$function$;


CREATE OR REPLACE FUNCTION public.cancel_safepay_proposal(p_safepay_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_tx public.safepay_transactions%ROWTYPE;
  v_hold integer;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT * INTO v_tx
  FROM public.safepay_transactions
  WHERE id = p_safepay_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'SafePay not found'; END IF;
  IF v_actor IS DISTINCT FROM v_tx.buyer_id THEN
    RAISE EXCEPTION 'Only the buyer can cancel a proposed SafePay';
  END IF;
  IF v_tx.status <> 'proposed' THEN
    RAISE EXCEPTION 'Only proposed SafePay can be cancelled';
  END IF;
  IF v_tx.amount IS NULL OR v_tx.amount <= 0 THEN
    RAISE EXCEPTION 'Invalid SafePay amount';
  END IF;

  SELECT escrow_hold INTO v_hold
  FROM public.user_wallets
  WHERE user_id = v_tx.buyer_id
  FOR UPDATE;

  IF NOT FOUND OR COALESCE(v_hold, 0) < v_tx.amount THEN
    RAISE EXCEPTION 'SafePay escrow hold is missing or insufficient; manual review required'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.user_wallets
  SET escrow_hold = escrow_hold - v_tx.amount, updated_at = now()
  WHERE user_id = v_tx.buyer_id;

  UPDATE public.profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) + v_tx.amount,
      balance_withdrawable = COALESCE(balance_withdrawable, 0) + v_tx.amount,
      updated_at = now()
  WHERE user_id = v_tx.buyer_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Buyer profile not found'; END IF;

  INSERT INTO public.wallet_transactions(user_id, safepay_id, kind, amount, status, reference)
  VALUES (v_tx.buyer_id, p_safepay_id, 'refund', v_tx.amount, 'completed',
          'SafePay cancelled - refund');

  UPDATE public.safepay_transactions
  SET status = 'cancelled', cancelled_at = now(), updated_at = now()
  WHERE id = p_safepay_id;
END;
$function$;


CREATE OR REPLACE FUNCTION public.auto_release_safepay()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_tx record;
  v_hold integer;
BEGIN
  FOR v_tx IN
    SELECT id, buyer_id, seller_id, amount
    FROM public.safepay_transactions
    WHERE status = 'complete'
      AND auto_release_at IS NOT NULL
      AND auto_release_at <= now()
    FOR UPDATE SKIP LOCKED
  LOOP
    SELECT escrow_hold INTO v_hold
    FROM public.user_wallets
    WHERE user_id = v_tx.buyer_id
    FOR UPDATE;

    IF NOT FOUND OR COALESCE(v_hold, 0) < v_tx.amount THEN
      RAISE WARNING 'SafePay % skipped: escrow hold missing or insufficient; manual review required',
        v_tx.id;
      CONTINUE;
    END IF;

    UPDATE public.user_wallets
    SET escrow_hold = escrow_hold - v_tx.amount, updated_at = now()
    WHERE user_id = v_tx.buyer_id;

    UPDATE public.profiles
    SET wallet_balance = COALESCE(wallet_balance, 0) + v_tx.amount,
        balance_withdrawable = COALESCE(balance_withdrawable, 0) + v_tx.amount,
        updated_at = now()
    WHERE user_id = v_tx.seller_id;

    IF NOT FOUND THEN RAISE EXCEPTION 'Seller profile not found for SafePay auto-release'; END IF;

    INSERT INTO public.wallet_transactions(user_id, safepay_id, kind, amount, status, reference)
    VALUES (v_tx.seller_id, v_tx.id, 'payment_received', v_tx.amount,
            'completed', 'SafePay auto-released');

    UPDATE public.safepay_transactions
    SET status = 'released', released_at = now(), updated_at = now()
    WHERE id = v_tx.id;
  END LOOP;
END;
$function$;


CREATE OR REPLACE FUNCTION public.admin_resolve_safepay_dispute(
  p_dispute_id uuid,
  p_ruling text,
  p_response text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_dispute public.transaction_disputes%ROWTYPE;
  v_tx public.safepay_transactions%ROWTYPE;
  v_hold integer;
BEGIN
  IF NOT public.is_admin_user() THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF p_ruling NOT IN ('release_seller', 'refund_buyer') THEN
    RAISE EXCEPTION 'Invalid ruling';
  END IF;

  SELECT * INTO v_dispute
  FROM public.transaction_disputes
  WHERE id = p_dispute_id
  FOR UPDATE;

  IF NOT FOUND OR v_dispute.dispute_type <> 'safepay' OR v_dispute.safepay_id IS NULL THEN
    RAISE EXCEPTION 'SafePay dispute not found';
  END IF;
  IF v_dispute.status NOT IN ('pending', 'investigating') THEN
    RAISE EXCEPTION 'Dispute already %', v_dispute.status;
  END IF;

  SELECT * INTO v_tx
  FROM public.safepay_transactions
  WHERE id = v_dispute.safepay_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'SafePay not found'; END IF;
  IF v_tx.status NOT IN ('disputed', 'active', 'complete') THEN
    RAISE EXCEPTION 'SafePay no longer disputable (status %)', v_tx.status;
  END IF;
  IF v_tx.amount IS NULL OR v_tx.amount <= 0 THEN
    RAISE EXCEPTION 'Invalid SafePay amount';
  END IF;

  SELECT escrow_hold INTO v_hold
  FROM public.user_wallets
  WHERE user_id = v_tx.buyer_id
  FOR UPDATE;

  IF NOT FOUND OR COALESCE(v_hold, 0) < v_tx.amount THEN
    RAISE EXCEPTION 'SafePay escrow hold is missing or insufficient; dispute requires manual reconciliation'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.user_wallets
  SET escrow_hold = escrow_hold - v_tx.amount, updated_at = now()
  WHERE user_id = v_tx.buyer_id;

  IF p_ruling = 'release_seller' THEN
    UPDATE public.profiles
    SET wallet_balance = COALESCE(wallet_balance, 0) + v_tx.amount,
        balance_withdrawable = COALESCE(balance_withdrawable, 0) + v_tx.amount,
        updated_at = now()
    WHERE user_id = v_tx.seller_id;

    IF NOT FOUND THEN RAISE EXCEPTION 'Seller profile not found'; END IF;

    INSERT INTO public.wallet_transactions(user_id, safepay_id, kind, amount, status, reference)
    VALUES (v_tx.seller_id, v_tx.id, 'payment_received', v_tx.amount, 'completed',
            'SafePay dispute resolved - released to seller');

    UPDATE public.safepay_transactions
    SET status = 'released', released_at = now(),
        admin_ruling = 'release_seller', updated_at = now()
    WHERE id = v_tx.id;
  ELSE
    UPDATE public.profiles
    SET wallet_balance = COALESCE(wallet_balance, 0) + v_tx.amount,
        balance_withdrawable = COALESCE(balance_withdrawable, 0) + v_tx.amount,
        updated_at = now()
    WHERE user_id = v_tx.buyer_id;

    IF NOT FOUND THEN RAISE EXCEPTION 'Buyer profile not found'; END IF;

    INSERT INTO public.wallet_transactions(user_id, safepay_id, kind, amount, status, reference)
    VALUES (v_tx.buyer_id, v_tx.id, 'refund', v_tx.amount, 'completed',
            'SafePay dispute resolved - refunded to buyer');

    UPDATE public.safepay_transactions
    SET status = 'cancelled', cancelled_at = now(),
        admin_ruling = 'refund_buyer', updated_at = now()
    WHERE id = v_tx.id;
  END IF;

  UPDATE public.transaction_disputes
  SET status = 'resolved',
      admin_response = COALESCE(p_response, admin_response),
      resolved_at = now(),
      resolved_by = auth.uid(),
      updated_at = now()
  WHERE id = p_dispute_id;

  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES
    (v_tx.buyer_id, 'safepay_resolved', 'SafePay dispute resolved',
     CASE WHEN p_ruling = 'release_seller'
          THEN 'Admin ruled in favor of the seller. Funds released.'
          ELSE 'Admin refunded your funds.' END,
     jsonb_build_object('safepay_id', v_tx.id, 'ruling', p_ruling)),
    (v_tx.seller_id, 'safepay_resolved', 'SafePay dispute resolved',
     CASE WHEN p_ruling = 'release_seller'
          THEN 'Admin released the SafePay funds to you.'
          ELSE 'Admin ruled in favor of the buyer. Funds refunded.' END,
     jsonb_build_object('safepay_id', v_tx.id, 'ruling', p_ruling));
END;
$function$;

COMMIT;

-- Follow-up still required before production:
-- * Reconcile legacy SafePay rows whose user_wallets.escrow_hold is below the
--   sum of active transaction amounts; these now fail closed rather than paying.
-- * Lock down direct INSERT/UPDATE on safepay_transactions with the separate
--   staged permission hotfix, or a caller can still forge rows before it lands.
-- * Gig-order completion/cancellation/milestone release still need a dedicated
--   per-order hold ledger; the existing wallet_transactions INSERT policy is
--   not authoritative because browser clients can create ledger rows.
