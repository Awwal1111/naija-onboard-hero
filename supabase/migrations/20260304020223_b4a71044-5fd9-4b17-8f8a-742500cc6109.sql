
-- Add commission tracking columns to mini_app_transactions
ALTER TABLE public.mini_app_transactions
  ADD COLUMN IF NOT EXISTS developer_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS developer_credited boolean DEFAULT false;

-- Add developer earnings tracking columns to mini_apps
ALTER TABLE public.mini_apps
  ADD COLUMN IF NOT EXISTS total_earnings numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT 0.10;

-- Create a function to process mini app payments with commission split
CREATE OR REPLACE FUNCTION public.process_mini_app_payment(
  p_user_id uuid,
  p_mini_app_id uuid,
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
  v_wallet_balance numeric;
  v_balance_withdrawable numeric;
  v_balance_non_withdrawable numeric;
  v_developer_id uuid;
  v_commission_rate numeric;
  v_developer_amount numeric;
  v_commission_amount numeric;
  v_deduct_withdrawable numeric;
  v_deduct_non_withdrawable numeric;
  v_app_name text;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid amount');
  END IF;

  SELECT wallet_balance, balance_withdrawable, balance_non_withdrawable
  INTO v_wallet_balance, v_balance_withdrawable, v_balance_non_withdrawable
  FROM profiles WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  IF v_wallet_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  SELECT developer_id, commission_rate, app_name
  INTO v_developer_id, v_commission_rate, v_app_name
  FROM mini_apps WHERE id = p_mini_app_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mini app not found');
  END IF;

  v_commission_rate := COALESCE(v_commission_rate, 0.10);
  v_commission_amount := ROUND(p_amount * v_commission_rate, 2);
  v_developer_amount := p_amount - v_commission_amount;

  -- Deduct withdrawable first, then non-withdrawable
  IF v_balance_withdrawable >= p_amount THEN
    v_deduct_withdrawable := p_amount;
    v_deduct_non_withdrawable := 0;
  ELSE
    v_deduct_withdrawable := GREATEST(v_balance_withdrawable, 0);
    v_deduct_non_withdrawable := p_amount - v_deduct_withdrawable;
  END IF;

  UPDATE profiles SET
    wallet_balance = wallet_balance - p_amount,
    balance_withdrawable = balance_withdrawable - v_deduct_withdrawable,
    balance_non_withdrawable = balance_non_withdrawable - v_deduct_non_withdrawable,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Credit developer 90% (withdrawable - real earned money)
  UPDATE profiles SET
    wallet_balance = wallet_balance + v_developer_amount,
    balance_withdrawable = balance_withdrawable + v_developer_amount,
    updated_at = NOW()
  WHERE user_id = v_developer_id;

  -- Credit platform 10% commission
  UPDATE admin_wallet SET
    balance = balance + v_commission_amount,
    updated_at = NOW()
  WHERE id = 1;

  INSERT INTO mini_app_transactions (
    mini_app_id, user_id, amount, description, tx_ref, status,
    developer_amount, commission_amount, developer_credited
  ) VALUES (
    p_mini_app_id, p_user_id, p_amount, p_description, p_tx_ref, 'completed',
    v_developer_amount, v_commission_amount, true
  );

  UPDATE mini_apps SET
    total_earnings = total_earnings + v_developer_amount,
    updated_at = NOW()
  WHERE id = p_mini_app_id;

  INSERT INTO wallet_transactions (user_id, kind, amount, status, reference)
  VALUES (p_user_id, 'mini_app_payment', -p_amount, 'completed',
    v_app_name || ': ' || p_description);

  INSERT INTO wallet_transactions (user_id, kind, amount, status, reference)
  VALUES (v_developer_id, 'mini_app_earning', v_developer_amount, 'completed',
    v_app_name || ': ' || p_description || ' (90% revenue)');

  RETURN jsonb_build_object(
    'success', true,
    'tx_ref', p_tx_ref,
    'developer_amount', v_developer_amount,
    'commission_amount', v_commission_amount
  );
END;
$$;
