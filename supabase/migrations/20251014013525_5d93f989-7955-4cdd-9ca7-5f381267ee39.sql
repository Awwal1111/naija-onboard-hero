-- Update cancel_safepay to handle both proposed and active states properly
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
  -- Get transaction details with row lock
  SELECT amount, buyer_id, seller_id, status 
  INTO v_amount, v_buyer_id, v_seller_id, v_status
  FROM public.safepay_transactions 
  WHERE id = p_safepay_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SafePay transaction not found';
  END IF;

  -- Can only cancel proposed or active transactions
  IF v_status NOT IN ('proposed', 'active') THEN
    RAISE EXCEPTION 'SafePay cannot be cancelled in current state: %', v_status;
  END IF;

  -- Check escrow hold
  SELECT escrow_hold INTO v_escrow_hold
  FROM public.user_wallets
  WHERE user_id = v_buyer_id;

  IF v_escrow_hold IS NULL OR v_escrow_hold < v_amount THEN
    RAISE EXCEPTION 'Escrow hold mismatch: Available % NC, Expected % NC', COALESCE(v_escrow_hold, 0), v_amount;
  END IF;

  -- Release escrow hold from buyer
  UPDATE public.user_wallets
  SET 
    escrow_hold = GREATEST(0, escrow_hold - v_amount),
    updated_at = NOW()
  WHERE user_id = v_buyer_id;

  -- Refund to buyer's balance
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
    'SafePay cancelled - funds refunded'
  );

  -- Update SafePay status
  UPDATE public.safepay_transactions
  SET 
    status = 'cancelled',
    cancelled_at = NOW(),
    updated_at = NOW()
  WHERE id = p_safepay_id;
  
  RAISE NOTICE 'SafePay cancelled successfully. Refunded % NC to buyer %', v_amount, v_buyer_id;
END;
$function$;