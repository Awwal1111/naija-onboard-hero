-- Add premium subscription fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS premium_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS premium_subscribed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS whatsapp_number text,
ADD COLUMN IF NOT EXISTS facebook_url text,
ADD COLUMN IF NOT EXISTS google_meet_link text;

-- Create index for premium queries
CREATE INDEX IF NOT EXISTS idx_profiles_premium ON public.profiles(is_premium) WHERE is_premium = true;

-- Function to check and expire premium subscriptions
CREATE OR REPLACE FUNCTION public.check_premium_status(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_premium boolean;
  v_expires_at timestamp with time zone;
BEGIN
  SELECT is_premium, premium_expires_at 
  INTO v_is_premium, v_expires_at
  FROM profiles 
  WHERE user_id = p_user_id;
  
  -- If premium but expired, update status
  IF v_is_premium = true AND v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
    UPDATE profiles 
    SET is_premium = false, premium_expires_at = NULL 
    WHERE user_id = p_user_id;
    RETURN false;
  END IF;
  
  RETURN COALESCE(v_is_premium, false);
END;
$$;

-- Function to subscribe to premium
CREATE OR REPLACE FUNCTION public.subscribe_premium(p_user_id uuid, p_months integer DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost numeric;
  v_balance numeric;
  v_current_expiry timestamp with time zone;
  v_new_expiry timestamp with time zone;
BEGIN
  -- Cost is ₦2000 per month
  v_cost := p_months * 2000;
  
  -- Check user balance
  SELECT balance_withdrawable INTO v_balance
  FROM profiles WHERE user_id = p_user_id;
  
  IF v_balance IS NULL OR v_balance < v_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance. You need ₦' || v_cost || ' NC');
  END IF;
  
  -- Get current premium expiry (if any)
  SELECT premium_expires_at INTO v_current_expiry
  FROM profiles WHERE user_id = p_user_id;
  
  -- Calculate new expiry (extend if already premium)
  IF v_current_expiry IS NOT NULL AND v_current_expiry > NOW() THEN
    v_new_expiry := v_current_expiry + (p_months || ' months')::interval;
  ELSE
    v_new_expiry := NOW() + (p_months || ' months')::interval;
  END IF;
  
  -- Deduct balance and update premium status
  UPDATE profiles SET
    wallet_balance = wallet_balance - v_cost,
    balance_withdrawable = balance_withdrawable - v_cost,
    is_premium = true,
    premium_expires_at = v_new_expiry,
    premium_subscribed_at = COALESCE(premium_subscribed_at, NOW()),
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Log transaction
  INSERT INTO wallet_transactions (user_id, kind, amount, status, reference)
  VALUES (p_user_id, 'premium_subscription', -v_cost, 'completed', 
          'Premium subscription - ' || p_months || ' month(s)');
  
  RETURN jsonb_build_object(
    'success', true, 
    'expires_at', v_new_expiry,
    'months', p_months,
    'cost', v_cost
  );
END;
$$;

-- Add admin balance for premium payments
-- Premium payments go to admin wallet for platform revenue