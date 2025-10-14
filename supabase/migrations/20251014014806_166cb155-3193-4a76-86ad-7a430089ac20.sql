-- Fix propose_safepay to properly handle escrow and bypass RLS issues

-- First, grant BYPASSRLS to the function so it can update user_wallets
DROP FUNCTION IF EXISTS public.propose_safepay(uuid, uuid, integer);

CREATE OR REPLACE FUNCTION public.propose_safepay(p_buyer_id uuid, p_seller_id uuid, p_amount integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_buyer_balance NUMERIC;
  v_safepay_id UUID;
  v_escrow_updated BOOLEAN;
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
  SELECT balance_withdrawable INTO v_buyer_balance
  FROM public.profiles 
  WHERE user_id = p_buyer_id FOR UPDATE;

  IF v_buyer_balance IS NULL OR v_buyer_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Insufficient balance: Available ' || COALESCE(v_buyer_balance, 0) || ' NC, Required ' || p_amount || ' NC'
    );
  END IF;

  -- Deduct from buyer's wallet balance immediately
  UPDATE public.profiles 
  SET 
    wallet_balance = wallet_balance - p_amount,
    balance_withdrawable = GREATEST(0, balance_withdrawable - p_amount),
    updated_at = NOW()
  WHERE user_id = p_buyer_id;

  RAISE NOTICE 'Deducted % from buyer % balance', p_amount, p_buyer_id;

  -- Create SafePay transaction
  INSERT INTO public.safepay_transactions (buyer_id, seller_id, amount, status)
  VALUES (p_buyer_id, p_seller_id, p_amount, 'proposed')
  RETURNING id INTO v_safepay_id;

  RAISE NOTICE 'Created SafePay transaction: %', v_safepay_id;

  -- Ensure user_wallets record exists
  INSERT INTO public.user_wallets (user_id, balance, escrow_hold, updated_at)
  VALUES (p_buyer_id, 0, p_amount, NOW())
  ON CONFLICT (user_id) DO NOTHING;

  -- Now update the escrow hold (bypass RLS by using direct UPDATE)
  UPDATE public.user_wallets 
  SET 
    escrow_hold = escrow_hold + p_amount,
    updated_at = NOW()
  WHERE user_id = p_buyer_id;

  GET DIAGNOSTICS v_escrow_updated = ROW_COUNT;
  
  IF v_escrow_updated = 0 THEN
    RAISE EXCEPTION 'Failed to update escrow hold for user %', p_buyer_id;
  END IF;

  RAISE NOTICE 'Updated escrow_hold to % for buyer %', p_amount, p_buyer_id;

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

  RAISE NOTICE 'SafePay proposal complete: %', v_safepay_id;

  RETURN jsonb_build_object('success', true, 'safepay_id', v_safepay_id);
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in propose_safepay: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Failed to create SafePay: ' || SQLERRM
    );
END;
$function$;