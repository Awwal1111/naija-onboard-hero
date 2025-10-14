-- Fix the complete SafePay flow with proper error handling

-- 1. Fix accept_safepay function (it was incomplete)
CREATE OR REPLACE FUNCTION public.accept_safepay(p_safepay_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_amount INTEGER;
  v_buyer_id UUID;
  v_seller_id UUID;
  v_status TEXT;
  v_escrow_hold NUMERIC;
BEGIN
  -- Get transaction details with row lock
  SELECT amount, buyer_id, seller_id, status 
  INTO v_amount, v_buyer_id, v_seller_id, v_status
  FROM public.safepay_transactions 
  WHERE id = p_safepay_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SafePay transaction not found';
  END IF;

  IF v_status != 'proposed' THEN
    RAISE EXCEPTION 'SafePay is not in proposed state';
  END IF;

  -- Verify funds are in escrow
  SELECT escrow_hold INTO v_escrow_hold
  FROM public.user_wallets
  WHERE user_id = v_buyer_id;

  IF v_escrow_hold IS NULL OR v_escrow_hold < v_amount THEN
    RAISE EXCEPTION 'Insufficient funds in escrow';
  END IF;

  -- Update SafePay status to active
  UPDATE public.safepay_transactions
  SET 
    status = 'active',
    updated_at = NOW()
  WHERE id = p_safepay_id;
  
  -- Log acceptance
  RAISE NOTICE 'SafePay accepted: % by seller %', p_safepay_id, auth.uid();
END;
$function$;

-- 2. Fix cancel_safepay to handle proposed status properly
CREATE OR REPLACE FUNCTION public.cancel_safepay(p_safepay_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_amount INTEGER;
  v_buyer_id UUID;
  v_seller_id UUID;
  v_status TEXT;
  v_escrow_hold NUMERIC;
BEGIN
  -- Get transaction details
  SELECT amount, buyer_id, seller_id, status
  INTO v_amount, v_buyer_id, v_seller_id, v_status
  FROM public.safepay_transactions
  WHERE id = p_safepay_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SafePay transaction not found';
  END IF;

  -- Can only cancel if proposed (before acceptance)
  IF v_status != 'proposed' THEN
    RAISE EXCEPTION 'Can only cancel SafePay in proposed state';
  END IF;

  -- Verify user is buyer or seller
  IF auth.uid() != v_buyer_id AND auth.uid() != v_seller_id THEN
    RAISE EXCEPTION 'Only participants can cancel';
  END IF;

  -- Get current escrow hold
  SELECT escrow_hold INTO v_escrow_hold
  FROM public.user_wallets
  WHERE user_id = v_buyer_id;

  -- Release escrow hold back to buyer
  IF v_escrow_hold >= v_amount THEN
    UPDATE public.user_wallets
    SET 
      escrow_hold = GREATEST(0, escrow_hold - v_amount),
      updated_at = NOW()
    WHERE user_id = v_buyer_id;

    -- Return funds to buyer's withdrawable balance
    UPDATE public.profiles
    SET 
      wallet_balance = wallet_balance + v_amount,
      balance_withdrawable = balance_withdrawable + v_amount,
      updated_at = NOW()
    WHERE user_id = v_buyer_id;

    -- Log refund transaction
    INSERT INTO public.wallet_transactions (user_id, safepay_id, kind, amount, status, reference)
    VALUES (
      v_buyer_id,
      p_safepay_id,
      'refund',
      v_amount,
      'completed',
      'SafePay cancelled - funds returned'
    );
  END IF;

  -- Update SafePay status
  UPDATE public.safepay_transactions
  SET 
    status = 'cancelled',
    cancelled_at = NOW(),
    updated_at = NOW()
  WHERE id = p_safepay_id;
  
  RAISE NOTICE 'SafePay cancelled: %, funds returned to buyer', p_safepay_id;
END;
$function$;