
-- Add charge_type to mini_app_transactions
ALTER TABLE public.mini_app_transactions 
ADD COLUMN IF NOT EXISTS charge_type text DEFAULT 'one_time';

-- Create payout function: mini app sends money back to user
CREATE OR REPLACE FUNCTION public.process_mini_app_payout(
  p_mini_app_id uuid,
  p_user_id uuid,
  p_amount numeric,
  p_description text,
  p_tx_ref text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_developer_id uuid;
  v_developer_balance numeric;
  v_app_name text;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid amount');
  END IF;

  -- Get mini app developer
  SELECT developer_id, app_name INTO v_developer_id, v_app_name
  FROM mini_apps WHERE id = p_mini_app_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mini app not found');
  END IF;

  -- Check developer has enough withdrawable balance
  SELECT balance_withdrawable INTO v_developer_balance
  FROM profiles WHERE user_id = v_developer_id FOR UPDATE;

  IF v_developer_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient developer balance');
  END IF;

  -- Deduct from developer
  UPDATE profiles SET
    wallet_balance = wallet_balance - p_amount,
    balance_withdrawable = balance_withdrawable - p_amount,
    updated_at = NOW()
  WHERE user_id = v_developer_id;

  -- Credit to user (withdrawable since it's real earned money)
  UPDATE profiles SET
    wallet_balance = wallet_balance + p_amount,
    balance_withdrawable = balance_withdrawable + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Log transaction
  INSERT INTO mini_app_transactions (
    mini_app_id, user_id, amount, description, tx_ref, status,
    developer_amount, commission_amount, developer_credited, charge_type
  ) VALUES (
    p_mini_app_id, p_user_id, p_amount, p_description, p_tx_ref, 'completed',
    -p_amount, 0, true, 'payout'
  );

  INSERT INTO wallet_transactions (user_id, kind, amount, status, reference)
  VALUES (v_developer_id, 'mini_app_payout', -p_amount, 'completed',
    v_app_name || ': Payout - ' || p_description);

  INSERT INTO wallet_transactions (user_id, kind, amount, status, reference)
  VALUES (p_user_id, 'mini_app_payout_received', p_amount, 'completed',
    v_app_name || ': ' || p_description);

  RETURN jsonb_build_object(
    'success', true,
    'tx_ref', p_tx_ref,
    'amount', p_amount
  );
END;
$$;
