-- Add missing safepay_id column to wallet_transactions table
ALTER TABLE public.wallet_transactions 
ADD COLUMN IF NOT EXISTS safepay_id UUID REFERENCES public.safepay_transactions(id) ON DELETE CASCADE;

-- Update SafePay functions to use correct column names
CREATE OR REPLACE FUNCTION public.accept_safepay(p_safepay_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_amount INTEGER;
  v_buyer_id UUID;
  v_status TEXT;
  v_buyer_balance NUMERIC;
BEGIN
  -- Get transaction details with row lock
  SELECT amount, buyer_id, status INTO v_amount, v_buyer_id, v_status
  FROM public.safepay_transactions 
  WHERE id = p_safepay_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SafePay transaction not found';
  END IF;

  IF v_status != 'proposed' THEN
    RAISE EXCEPTION 'SafePay is not in proposed state';
  END IF;

  -- Get buyer balance from profiles table with row lock
  SELECT wallet_balance INTO v_buyer_balance
  FROM public.profiles 
  WHERE user_id = v_buyer_id FOR UPDATE;

  IF v_buyer_balance IS NULL OR v_buyer_balance < v_amount THEN
    RAISE EXCEPTION 'Insufficient balance: Available % NC, Required % NC', COALESCE(v_buyer_balance, 0), v_amount;
  END IF;

  -- Deduct from buyer's wallet balance
  UPDATE public.profiles 
  SET wallet_balance = wallet_balance - v_amount,
      balance_withdrawable = GREATEST(0, balance_withdrawable - v_amount),
      updated_at = NOW()
  WHERE user_id = v_buyer_id;

  -- Ensure user_wallets record exists and update escrow hold
  INSERT INTO public.user_wallets (user_id, balance, escrow_hold, updated_at)
  VALUES (v_buyer_id, 0, v_amount, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    escrow_hold = user_wallets.escrow_hold + v_amount, 
    updated_at = NOW();

  -- Log the escrow transaction using 'kind' column
  INSERT INTO public.wallet_transactions (user_id, safepay_id, kind, amount, status, reference)
  VALUES (v_buyer_id, p_safepay_id, 'escrow_hold', -v_amount, 'completed', 'SafePay funds locked in escrow');

  -- Update SafePay status to active
  UPDATE public.safepay_transactions 
  SET status = 'active', updated_at = NOW()
  WHERE id = p_safepay_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.release_safepay(p_safepay_id UUID)
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
BEGIN
  -- Get transaction details with row lock
  SELECT amount, buyer_id, seller_id, status INTO v_amount, v_buyer_id, v_seller_id, v_status
  FROM public.safepay_transactions 
  WHERE id = p_safepay_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SafePay transaction not found';
  END IF;

  IF v_status != 'complete' AND v_status != 'active' THEN
    RAISE EXCEPTION 'SafePay cannot be released in current state: %', v_status;
  END IF;

  -- Release escrow hold from buyer
  UPDATE public.user_wallets 
  SET escrow_hold = GREATEST(0, escrow_hold - v_amount),
      updated_at = NOW()
  WHERE user_id = v_buyer_id;

  -- Credit seller's wallet in profiles table
  UPDATE public.profiles 
  SET wallet_balance = wallet_balance + v_amount,
      balance_withdrawable = balance_withdrawable + v_amount,
      updated_at = NOW()
  WHERE user_id = v_seller_id;

  -- Log seller transaction using 'kind' column
  INSERT INTO public.wallet_transactions (user_id, safepay_id, kind, amount, status, reference)
  VALUES (v_seller_id, p_safepay_id, 'payment_received', v_amount, 'completed', 'SafePay payment received');

  -- Update SafePay status to released
  UPDATE public.safepay_transactions 
  SET status = 'released', updated_at = NOW()
  WHERE id = p_safepay_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.approve_cancel_safepay(p_safepay_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_buyer_id UUID;
  v_seller_id UUID;
  v_amount INTEGER;
  v_cancel_requester_id UUID;
  v_status TEXT;
BEGIN
  -- Get transaction details with row lock
  SELECT buyer_id, seller_id, amount, cancel_requester_id, status
  INTO v_buyer_id, v_seller_id, v_amount, v_cancel_requester_id, v_status
  FROM public.safepay_transactions
  WHERE id = p_safepay_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SafePay transaction not found';
  END IF;

  IF v_status != 'active' THEN
    RAISE EXCEPTION 'SafePay must be in active state';
  END IF;

  IF v_cancel_requester_id IS NULL THEN
    RAISE EXCEPTION 'No cancellation request exists';
  END IF;

  IF auth.uid() = v_cancel_requester_id THEN
    RAISE EXCEPTION 'Cannot approve your own cancellation request';
  END IF;

  IF auth.uid() != v_buyer_id AND auth.uid() != v_seller_id THEN
    RAISE EXCEPTION 'Only the other participant can approve';
  END IF;

  -- Release escrow hold from buyer
  UPDATE public.user_wallets
  SET 
    escrow_hold = GREATEST(0, escrow_hold - v_amount),
    updated_at = NOW()
  WHERE user_id = v_buyer_id;

  -- Refund to buyer's withdrawable balance
  UPDATE public.profiles
  SET 
    wallet_balance = wallet_balance + v_amount,
    balance_withdrawable = balance_withdrawable + v_amount,
    updated_at = NOW()
  WHERE user_id = v_buyer_id;

  -- Log refund transaction using 'kind' column
  INSERT INTO public.wallet_transactions (user_id, safepay_id, kind, amount, status, reference)
  VALUES (
    v_buyer_id, 
    p_safepay_id, 
    'refund', 
    v_amount, 
    'completed', 
    'SafePay cancelled by mutual agreement'
  );

  -- Update SafePay status
  UPDATE public.safepay_transactions
  SET 
    status = 'cancelled',
    cancel_approved_by = auth.uid(),
    cancelled_at = NOW(),
    updated_at = NOW()
  WHERE id = p_safepay_id;
END;
$function$;