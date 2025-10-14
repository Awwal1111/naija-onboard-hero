-- Complete SafePay System Redesign
-- Simplified, reliable flow with proper escrow management

-- 1. Drop all existing SafePay functions to start fresh
DROP FUNCTION IF EXISTS public.propose_safepay(uuid, uuid, integer);
DROP FUNCTION IF EXISTS public.accept_safepay(uuid);
DROP FUNCTION IF EXISTS public.complete_safepay_work(uuid);
DROP FUNCTION IF EXISTS public.release_safepay(uuid);
DROP FUNCTION IF EXISTS public.cancel_safepay(uuid);
DROP FUNCTION IF EXISTS public.request_cancel_safepay(uuid);
DROP FUNCTION IF EXISTS public.approve_cancel_safepay(uuid);

-- 2. Create simplified propose function
CREATE OR REPLACE FUNCTION public.propose_safepay(
  p_buyer_id uuid,
  p_seller_id uuid,
  p_amount integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_buyer_balance NUMERIC;
  v_safepay_id UUID;
BEGIN
  -- Basic validations
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid amount');
  END IF;

  IF p_buyer_id = p_seller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot create SafePay with yourself');
  END IF;

  -- Check balance with lock
  SELECT balance_withdrawable INTO v_buyer_balance
  FROM public.profiles 
  WHERE user_id = p_buyer_id 
  FOR UPDATE;

  IF v_buyer_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Insufficient balance'
    );
  END IF;

  -- Deduct from buyer's balance
  UPDATE public.profiles 
  SET 
    wallet_balance = wallet_balance - p_amount,
    balance_withdrawable = balance_withdrawable - p_amount,
    updated_at = NOW()
  WHERE user_id = p_buyer_id;

  -- Create SafePay record
  INSERT INTO public.safepay_transactions (
    buyer_id, 
    seller_id, 
    amount, 
    status
  )
  VALUES (p_buyer_id, p_seller_id, p_amount, 'proposed')
  RETURNING id INTO v_safepay_id;

  -- Add to escrow hold
  INSERT INTO public.user_wallets (user_id, balance, escrow_hold)
  VALUES (p_buyer_id, 0, p_amount)
  ON CONFLICT (user_id) 
  DO UPDATE SET escrow_hold = user_wallets.escrow_hold + p_amount;

  -- Log transaction
  INSERT INTO public.wallet_transactions (
    user_id, 
    safepay_id, 
    kind, 
    amount, 
    status, 
    reference
  )
  VALUES (
    p_buyer_id,
    v_safepay_id,
    'escrow_hold',
    -p_amount,
    'completed',
    'SafePay funds locked'
  );

  RETURN jsonb_build_object(
    'success', true, 
    'safepay_id', v_safepay_id
  );
END;
$$;

-- 3. Accept SafePay (seller accepts proposal)
CREATE OR REPLACE FUNCTION public.accept_safepay(p_safepay_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_transaction RECORD;
BEGIN
  -- Get transaction
  SELECT * INTO v_transaction
  FROM public.safepay_transactions
  WHERE id = p_safepay_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SafePay not found';
  END IF;

  IF v_transaction.status != 'proposed' THEN
    RAISE EXCEPTION 'SafePay must be in proposed state';
  END IF;

  -- Update to active
  UPDATE public.safepay_transactions
  SET 
    status = 'active',
    updated_at = NOW()
  WHERE id = p_safepay_id;
END;
$$;

-- 4. Mark work complete (seller marks done)
CREATE OR REPLACE FUNCTION public.mark_safepay_complete(p_safepay_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_transaction RECORD;
BEGIN
  SELECT * INTO v_transaction
  FROM public.safepay_transactions
  WHERE id = p_safepay_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SafePay not found';
  END IF;

  IF v_transaction.status != 'active' THEN
    RAISE EXCEPTION 'SafePay must be active';
  END IF;

  -- Only seller can mark complete
  IF auth.uid() != v_transaction.seller_id THEN
    RAISE EXCEPTION 'Only seller can mark complete';
  END IF;

  -- Update to complete
  UPDATE public.safepay_transactions
  SET 
    status = 'complete',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_safepay_id;
END;
$$;

-- 5. Release funds (buyer releases to seller)
CREATE OR REPLACE FUNCTION public.release_safepay_funds(p_safepay_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_transaction RECORD;
BEGIN
  SELECT * INTO v_transaction
  FROM public.safepay_transactions
  WHERE id = p_safepay_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SafePay not found';
  END IF;

  IF v_transaction.status != 'complete' THEN
    RAISE EXCEPTION 'SafePay must be completed first';
  END IF;

  -- Only buyer can release
  IF auth.uid() != v_transaction.buyer_id THEN
    RAISE EXCEPTION 'Only buyer can release funds';
  END IF;

  -- Release escrow hold
  UPDATE public.user_wallets
  SET escrow_hold = escrow_hold - v_transaction.amount
  WHERE user_id = v_transaction.buyer_id;

  -- Pay seller
  UPDATE public.profiles
  SET 
    wallet_balance = wallet_balance + v_transaction.amount,
    balance_withdrawable = balance_withdrawable + v_transaction.amount,
    updated_at = NOW()
  WHERE user_id = v_transaction.seller_id;

  -- Log payment to seller
  INSERT INTO public.wallet_transactions (
    user_id,
    safepay_id,
    kind,
    amount,
    status,
    reference
  )
  VALUES (
    v_transaction.seller_id,
    p_safepay_id,
    'payment_received',
    v_transaction.amount,
    'completed',
    'SafePay payment received'
  );

  -- Update SafePay status
  UPDATE public.safepay_transactions
  SET 
    status = 'released',
    released_at = NOW(),
    updated_at = NOW()
  WHERE id = p_safepay_id;
END;
$$;

-- 6. Cancel SafePay (only when proposed, refunds buyer)
CREATE OR REPLACE FUNCTION public.cancel_safepay_proposal(p_safepay_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_transaction RECORD;
BEGIN
  SELECT * INTO v_transaction
  FROM public.safepay_transactions
  WHERE id = p_safepay_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SafePay not found';
  END IF;

  IF v_transaction.status != 'proposed' THEN
    RAISE EXCEPTION 'Can only cancel proposed SafePay';
  END IF;

  -- Release escrow
  UPDATE public.user_wallets
  SET escrow_hold = escrow_hold - v_transaction.amount
  WHERE user_id = v_transaction.buyer_id;

  -- Refund buyer
  UPDATE public.profiles
  SET 
    wallet_balance = wallet_balance + v_transaction.amount,
    balance_withdrawable = balance_withdrawable + v_transaction.amount,
    updated_at = NOW()
  WHERE user_id = v_transaction.buyer_id;

  -- Log refund
  INSERT INTO public.wallet_transactions (
    user_id,
    safepay_id,
    kind,
    amount,
    status,
    reference
  )
  VALUES (
    v_transaction.buyer_id,
    p_safepay_id,
    'refund',
    v_transaction.amount,
    'completed',
    'SafePay cancelled - refund'
  );

  -- Update status
  UPDATE public.safepay_transactions
  SET 
    status = 'cancelled',
    cancelled_at = NOW(),
    updated_at = NOW()
  WHERE id = p_safepay_id;
END;
$$;