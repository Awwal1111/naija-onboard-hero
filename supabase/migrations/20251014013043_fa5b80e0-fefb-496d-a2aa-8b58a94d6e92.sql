-- Fix propose_safepay function to ensure atomic transaction
CREATE OR REPLACE FUNCTION public.propose_safepay(p_buyer_id uuid, p_seller_id uuid, p_amount integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_buyer_balance NUMERIC;
  v_safepay_id UUID;
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid amount');
  END IF;

  -- Check if buyer is trying to create SafePay with themselves
  IF p_buyer_id = p_seller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot create SafePay with yourself');
  END IF;

  -- Get buyer balance with row lock
  SELECT wallet_balance INTO v_buyer_balance
  FROM public.profiles 
  WHERE user_id = p_buyer_id FOR UPDATE;

  IF v_buyer_balance IS NULL OR v_buyer_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Insufficient balance: Available ' || COALESCE(v_buyer_balance, 0) || ' NC, Required ' || p_amount || ' NC'
    );
  END IF;

  -- Start atomic transaction operations
  BEGIN
    -- Deduct from buyer's wallet balance immediately
    UPDATE public.profiles 
    SET 
      wallet_balance = wallet_balance - p_amount,
      balance_withdrawable = GREATEST(0, balance_withdrawable - p_amount),
      updated_at = NOW()
    WHERE user_id = p_buyer_id;

    -- Create SafePay transaction
    INSERT INTO public.safepay_transactions (buyer_id, seller_id, amount, status)
    VALUES (p_buyer_id, p_seller_id, p_amount, 'proposed')
    RETURNING id INTO v_safepay_id;

    -- Ensure user_wallets record exists and update escrow hold
    INSERT INTO public.user_wallets (user_id, balance, escrow_hold, updated_at)
    VALUES (p_buyer_id, 0, p_amount, NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      escrow_hold = user_wallets.escrow_hold + p_amount, 
      updated_at = NOW();

    -- Log the escrow transaction
    INSERT INTO public.wallet_transactions (user_id, safepay_id, kind, amount, status, reference)
    VALUES (
      p_buyer_id, 
      v_safepay_id, 
      'escrow_hold', 
      -p_amount, 
      'completed', 
      'SafePay proposal - funds locked in escrow'
    );

    RETURN jsonb_build_object('success', true, 'safepay_id', v_safepay_id);
  EXCEPTION
    WHEN OTHERS THEN
      -- Return detailed error for debugging
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'Failed to create SafePay: ' || SQLERRM
      );
  END;
END;
$function$;

-- Also update release_safepay to ensure it works correctly with both 'complete' and 'active' status
CREATE OR REPLACE FUNCTION public.release_safepay(p_safepay_id uuid)
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

  IF v_status NOT IN ('complete', 'active') THEN
    RAISE EXCEPTION 'SafePay cannot be released in current state: %', v_status;
  END IF;

  -- Check escrow hold exists
  SELECT escrow_hold INTO v_escrow_hold
  FROM public.user_wallets
  WHERE user_id = v_buyer_id;

  IF v_escrow_hold IS NULL OR v_escrow_hold < v_amount THEN
    RAISE EXCEPTION 'Insufficient escrow hold: Available % NC, Required % NC', COALESCE(v_escrow_hold, 0), v_amount;
  END IF;

  -- Release escrow hold from buyer
  UPDATE public.user_wallets 
  SET 
    escrow_hold = GREATEST(0, escrow_hold - v_amount),
    updated_at = NOW()
  WHERE user_id = v_buyer_id;

  -- Credit seller's wallet in profiles table
  UPDATE public.profiles 
  SET 
    wallet_balance = wallet_balance + v_amount,
    balance_withdrawable = balance_withdrawable + v_amount,
    updated_at = NOW()
  WHERE user_id = v_seller_id;

  -- Log seller transaction
  INSERT INTO public.wallet_transactions (user_id, safepay_id, kind, amount, status, reference)
  VALUES (
    v_seller_id, 
    p_safepay_id, 
    'payment_received', 
    v_amount, 
    'completed', 
    'SafePay payment received'
  );

  -- Update SafePay status to released
  UPDATE public.safepay_transactions 
  SET 
    status = 'released',
    released_at = NOW(),
    updated_at = NOW()
  WHERE id = p_safepay_id;
END;
$function$;