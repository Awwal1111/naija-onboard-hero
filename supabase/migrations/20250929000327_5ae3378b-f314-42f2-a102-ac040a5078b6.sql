-- Add functions to properly handle SafePay with wallet integration
CREATE OR REPLACE FUNCTION public.accept_safepay(p_safepay_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_amount INTEGER;
  v_buyer_id UUID;
  v_status TEXT;
  v_buyer_balance NUMERIC;
BEGIN
  -- Get transaction details
  SELECT amount, buyer_id, status INTO v_amount, v_buyer_id, v_status
  FROM public.safepay_transactions 
  WHERE id = p_safepay_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SafePay transaction not found';
  END IF;

  IF v_status != 'proposed' THEN
    RAISE EXCEPTION 'SafePay is not in proposed state';
  END IF;

  -- Get buyer balance from profiles table
  SELECT wallet_balance INTO v_buyer_balance
  FROM public.profiles 
  WHERE user_id = v_buyer_id FOR UPDATE;

  IF v_buyer_balance IS NULL OR v_buyer_balance < v_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Deduct from buyer's wallet and update escrow
  UPDATE public.profiles 
  SET wallet_balance = wallet_balance - v_amount,
      balance_withdrawable = balance_withdrawable - v_amount,
      updated_at = NOW()
  WHERE user_id = v_buyer_id;

  -- Ensure user_wallets record exists and update escrow hold
  INSERT INTO public.user_wallets (user_id, balance, escrow_hold, updated_at)
  VALUES (v_buyer_id, 0, v_amount, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET escrow_hold = user_wallets.escrow_hold + v_amount, updated_at = NOW();

  -- Log the transaction
  INSERT INTO public.wallet_transactions (user_id, safepay_id, transaction_type, amount, status, description)
  VALUES (v_buyer_id, p_safepay_id, 'escrow_hold', v_amount, 'completed', 'SafePay escrow hold');

  -- Update SafePay status
  UPDATE public.safepay_transactions 
  SET status = 'active', updated_at = NOW()
  WHERE id = p_safepay_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.release_safepay(p_safepay_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_amount INTEGER;
  v_buyer_id UUID;
  v_seller_id UUID;
  v_status TEXT;
BEGIN
  -- Get transaction details
  SELECT amount, buyer_id, seller_id, status INTO v_amount, v_buyer_id, v_seller_id, v_status
  FROM public.safepay_transactions 
  WHERE id = p_safepay_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SafePay transaction not found';
  END IF;

  IF v_status != 'complete' AND v_status != 'active' THEN
    RAISE EXCEPTION 'SafePay cannot be released in current state';
  END IF;

  -- Release escrow hold from buyer
  UPDATE public.user_wallets 
  SET escrow_hold = escrow_hold - v_amount,
      updated_at = NOW()
  WHERE user_id = v_buyer_id;

  -- Credit seller's wallet in profiles table
  UPDATE public.profiles 
  SET wallet_balance = wallet_balance + v_amount,
      balance_withdrawable = balance_withdrawable + v_amount,
      updated_at = NOW()
  WHERE user_id = v_seller_id;

  -- Log transactions
  INSERT INTO public.wallet_transactions (user_id, safepay_id, transaction_type, amount, status, description)
  VALUES (v_seller_id, p_safepay_id, 'payment_received', v_amount, 'completed', 'SafePay payment received');

  -- Update SafePay status
  UPDATE public.safepay_transactions 
  SET status = 'released', updated_at = NOW()
  WHERE id = p_safepay_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_safepay(p_safepay_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_amount INTEGER;
  v_buyer_id UUID;
  v_status TEXT;
BEGIN
  -- Get transaction details
  SELECT amount, buyer_id, status INTO v_amount, v_buyer_id, v_status
  FROM public.safepay_transactions 
  WHERE id = p_safepay_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SafePay transaction not found';
  END IF;

  IF v_status = 'active' THEN
    -- Refund buyer and release escrow hold
    UPDATE public.profiles 
    SET wallet_balance = wallet_balance + v_amount,
        balance_withdrawable = balance_withdrawable + v_amount,
        updated_at = NOW()
    WHERE user_id = v_buyer_id;

    UPDATE public.user_wallets 
    SET escrow_hold = escrow_hold - v_amount,
        updated_at = NOW()
    WHERE user_id = v_buyer_id;

    -- Log the refund transaction
    INSERT INTO public.wallet_transactions (user_id, safepay_id, transaction_type, amount, status, description)
    VALUES (v_buyer_id, p_safepay_id, 'refund', v_amount, 'completed', 'SafePay refund');
  END IF;

  -- Update SafePay status
  UPDATE public.safepay_transactions 
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_safepay_id;
END;
$function$;