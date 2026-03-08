
CREATE OR REPLACE FUNCTION public.convert_nc_balance(p_user_id uuid, p_input_amount numeric DEFAULT 100, p_output_amount numeric DEFAULT 5)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_non_withdrawable numeric;
BEGIN
  -- Lock the row to prevent race conditions
  SELECT balance_non_withdrawable INTO v_non_withdrawable
  FROM profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_non_withdrawable IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  IF v_non_withdrawable < p_input_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient non-withdrawable balance', 'current_balance', v_non_withdrawable);
  END IF;

  -- Atomic update: deduct non-withdrawable, add withdrawable
  UPDATE profiles
  SET
    balance_non_withdrawable = balance_non_withdrawable - p_input_amount,
    wallet_balance = wallet_balance - p_input_amount + p_output_amount,
    balance_withdrawable = balance_withdrawable + p_output_amount,
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Log the transaction
  INSERT INTO wallet_transactions (user_id, kind, amount, status, reference)
  VALUES (p_user_id, 'nc_conversion', p_output_amount, 'completed', 
    'Converted ' || p_input_amount || ' non-withdrawable NC → ' || p_output_amount || ' withdrawable NC');

  RETURN jsonb_build_object(
    'success', true, 
    'converted_from', p_input_amount, 
    'converted_to', p_output_amount,
    'new_non_withdrawable', v_non_withdrawable - p_input_amount
  );
END;
$$;
