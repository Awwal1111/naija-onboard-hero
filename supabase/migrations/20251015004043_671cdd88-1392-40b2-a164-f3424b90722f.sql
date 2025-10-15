-- Make fundraisings publicly viewable (anyone can view campaigns)
DROP POLICY IF EXISTS "Anyone can view approved fundraisings" ON fundraisings;
CREATE POLICY "Anyone can view approved fundraisings"
ON fundraisings FOR SELECT
USING (status = 'approved');

-- Allow anyone to view fundraising contributions (for transparency)
ALTER TABLE fundraising_contributions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view fundraising contributions" ON fundraising_contributions;
CREATE POLICY "Anyone can view fundraising contributions"
ON fundraising_contributions FOR SELECT
USING (true);

-- Add fund release tracking to fundraisings
ALTER TABLE fundraisings 
ADD COLUMN IF NOT EXISTS funds_held_by_admin BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS funds_release_requested BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS funds_released_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS release_requested_at TIMESTAMP WITH TIME ZONE;

-- Create function to handle contributions going to admin wallet
CREATE OR REPLACE FUNCTION contribute_to_fundraising(
  p_fundraising_id UUID,
  p_contributor_id UUID,
  p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contributor_balance NUMERIC;
  v_admin_wallet_id BIGINT;
BEGIN
  -- Check contributor balance
  SELECT balance_withdrawable INTO v_contributor_balance
  FROM profiles
  WHERE user_id = p_contributor_id;

  IF v_contributor_balance IS NULL OR v_contributor_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Get admin wallet (id = 1)
  SELECT id INTO v_admin_wallet_id FROM admin_wallet WHERE id = 1;
  
  IF v_admin_wallet_id IS NULL THEN
    -- Create admin wallet if it doesn't exist
    INSERT INTO admin_wallet (id, balance) VALUES (1, 0)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Deduct from contributor
  UPDATE profiles
  SET 
    wallet_balance = wallet_balance - p_amount,
    balance_withdrawable = balance_withdrawable - p_amount
  WHERE user_id = p_contributor_id;

  -- Add to admin wallet
  UPDATE admin_wallet
  SET balance = balance + p_amount, updated_at = NOW()
  WHERE id = 1;

  -- Update fundraising raised amount
  UPDATE fundraisings
  SET raised_amount = raised_amount + p_amount
  WHERE id = p_fundraising_id;

  -- Record contribution
  INSERT INTO fundraising_contributions (
    fundraising_id,
    contributor_id,
    amount
  ) VALUES (
    p_fundraising_id,
    p_contributor_id,
    p_amount
  );

  -- Log transaction
  INSERT INTO wallet_transactions (
    user_id,
    kind,
    amount,
    status,
    reference
  ) VALUES (
    p_contributor_id,
    'fundraising_contribution',
    -p_amount,
    'completed',
    'Fundraising contribution (held by admin)'
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Create function to request fund release
CREATE OR REPLACE FUNCTION request_fundraising_release(
  p_fundraising_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign_owner UUID;
BEGIN
  -- Verify ownership
  SELECT user_id INTO v_campaign_owner
  FROM fundraisings
  WHERE id = p_fundraising_id;

  IF v_campaign_owner != p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Mark as release requested
  UPDATE fundraisings
  SET 
    funds_release_requested = true,
    release_requested_at = NOW()
  WHERE id = p_fundraising_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Admin function to release funds
CREATE OR REPLACE FUNCTION admin_release_fundraising_funds(
  p_fundraising_id UUID,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raised_amount NUMERIC;
  v_campaign_owner UUID;
  v_admin_balance NUMERIC;
BEGIN
  -- Verify admin
  IF NOT is_admin_user() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Get campaign details
  SELECT raised_amount, user_id INTO v_raised_amount, v_campaign_owner
  FROM fundraisings
  WHERE id = p_fundraising_id;

  -- Check admin wallet balance
  SELECT balance INTO v_admin_balance FROM admin_wallet WHERE id = 1;
  
  IF v_admin_balance < v_raised_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient admin funds');
  END IF;

  -- Transfer from admin wallet to campaign owner
  UPDATE admin_wallet
  SET balance = balance - v_raised_amount, updated_at = NOW()
  WHERE id = 1;

  UPDATE profiles
  SET 
    wallet_balance = wallet_balance + v_raised_amount,
    balance_withdrawable = balance_withdrawable + v_raised_amount
  WHERE user_id = v_campaign_owner;

  -- Update fundraising status
  UPDATE fundraisings
  SET 
    funds_held_by_admin = false,
    funds_released_at = NOW()
  WHERE id = p_fundraising_id;

  -- Log transaction
  INSERT INTO wallet_transactions (
    user_id,
    kind,
    amount,
    status,
    reference
  ) VALUES (
    v_campaign_owner,
    'fundraising_release',
    v_raised_amount,
    'completed',
    'Fundraising funds released by admin'
  );

  RETURN jsonb_build_object('success', true);
END;
$$;