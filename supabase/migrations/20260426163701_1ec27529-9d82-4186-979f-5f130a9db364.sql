-- ============================================================
-- 1. SECURE GIG BOOST RPC
-- Atomic, dual-balance aware, with proper validation
-- ============================================================
CREATE OR REPLACE FUNCTION public.boost_gig(
  p_gig_id uuid,
  p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_gig_owner uuid;
  v_gig_title text;
  v_current_boost numeric;
  v_wallet_balance numeric;
  v_balance_withdrawable numeric;
  v_balance_non_withdrawable numeric;
  v_deduct_withdrawable numeric;
  v_deduct_non_withdrawable numeric;
  v_new_total numeric;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_amount IS NULL OR p_amount < 200 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Minimum boost amount is ₦200');
  END IF;

  IF p_amount > 1000000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Maximum boost amount is ₦1,000,000');
  END IF;

  -- Verify gig ownership and lock the row
  SELECT user_id, title, COALESCE(boost_amount, 0)
  INTO v_gig_owner, v_gig_title, v_current_boost
  FROM public.jobs_services
  WHERE id = p_gig_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gig not found');
  END IF;

  IF v_gig_owner <> v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You can only boost your own gigs');
  END IF;

  -- Lock and read user wallet
  SELECT wallet_balance, balance_withdrawable, balance_non_withdrawable
  INTO v_wallet_balance, v_balance_withdrawable, v_balance_non_withdrawable
  FROM public.profiles
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  IF COALESCE(v_wallet_balance, 0) < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Deduct from withdrawable first, then non-withdrawable
  IF COALESCE(v_balance_withdrawable, 0) >= p_amount THEN
    v_deduct_withdrawable := p_amount;
    v_deduct_non_withdrawable := 0;
  ELSE
    v_deduct_withdrawable := GREATEST(COALESCE(v_balance_withdrawable, 0), 0);
    v_deduct_non_withdrawable := p_amount - v_deduct_withdrawable;
  END IF;

  UPDATE public.profiles
  SET wallet_balance = wallet_balance - p_amount,
      balance_withdrawable = GREATEST(balance_withdrawable - v_deduct_withdrawable, 0),
      balance_non_withdrawable = GREATEST(balance_non_withdrawable - v_deduct_non_withdrawable, 0),
      updated_at = NOW()
  WHERE user_id = v_user_id;

  v_new_total := v_current_boost + p_amount;

  UPDATE public.jobs_services
  SET boost_amount = v_new_total,
      boosted_at = NOW()
  WHERE id = p_gig_id;

  INSERT INTO public.wallet_transactions (user_id, kind, amount, status, reference)
  VALUES (v_user_id, 'gig_boost', -p_amount, 'completed',
          'Boost for gig: ' || COALESCE(LEFT(v_gig_title, 50), p_gig_id::text));

  RETURN jsonb_build_object(
    'success', true,
    'new_total_boost', v_new_total,
    'amount_paid', p_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.boost_gig(uuid, numeric) TO authenticated;


-- ============================================================
-- 2. SECURE POST BOOST RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.boost_post(
  p_post_id uuid,
  p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_post_owner uuid;
  v_current_boost numeric;
  v_wallet_balance numeric;
  v_balance_withdrawable numeric;
  v_balance_non_withdrawable numeric;
  v_deduct_withdrawable numeric;
  v_deduct_non_withdrawable numeric;
  v_new_total numeric;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_amount IS NULL OR p_amount < 100 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Minimum boost amount is ₦100');
  END IF;

  IF p_amount > 1000000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Maximum boost amount is ₦1,000,000');
  END IF;

  SELECT user_id, COALESCE(boost_amount, 0)
  INTO v_post_owner, v_current_boost
  FROM public.posts
  WHERE id = p_post_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Post not found');
  END IF;

  IF v_post_owner <> v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You can only boost your own posts');
  END IF;

  SELECT wallet_balance, balance_withdrawable, balance_non_withdrawable
  INTO v_wallet_balance, v_balance_withdrawable, v_balance_non_withdrawable
  FROM public.profiles
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  IF COALESCE(v_wallet_balance, 0) < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  IF COALESCE(v_balance_withdrawable, 0) >= p_amount THEN
    v_deduct_withdrawable := p_amount;
    v_deduct_non_withdrawable := 0;
  ELSE
    v_deduct_withdrawable := GREATEST(COALESCE(v_balance_withdrawable, 0), 0);
    v_deduct_non_withdrawable := p_amount - v_deduct_withdrawable;
  END IF;

  UPDATE public.profiles
  SET wallet_balance = wallet_balance - p_amount,
      balance_withdrawable = GREATEST(balance_withdrawable - v_deduct_withdrawable, 0),
      balance_non_withdrawable = GREATEST(balance_non_withdrawable - v_deduct_non_withdrawable, 0),
      updated_at = NOW()
  WHERE user_id = v_user_id;

  v_new_total := v_current_boost + p_amount;

  UPDATE public.posts
  SET boost_amount = v_new_total,
      boosted_at = NOW()
  WHERE id = p_post_id;

  INSERT INTO public.wallet_transactions (user_id, kind, amount, status, reference)
  VALUES (v_user_id, 'post_boost', -p_amount, 'completed',
          'Boost for post: ' || p_post_id::text);

  RETURN jsonb_build_object(
    'success', true,
    'new_total_boost', v_new_total,
    'amount_paid', p_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.boost_post(uuid, numeric) TO authenticated;


-- ============================================================
-- 3. SECURE EXPERT (PROFILE) BOOST RPC
-- Validates verification status server-side
-- ============================================================
CREATE OR REPLACE FUNCTION public.boost_expert_profile(
  p_amount numeric,
  p_duration_days integer,
  p_package_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_expert boolean;
  v_expert_verified_at timestamptz;
  v_wallet_balance numeric;
  v_balance_withdrawable numeric;
  v_balance_non_withdrawable numeric;
  v_deduct_withdrawable numeric;
  v_deduct_non_withdrawable numeric;
  v_boost_end timestamptz;
  v_current_expiry timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid amount');
  END IF;

  IF p_duration_days NOT IN (1, 7, 30) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid duration');
  END IF;

  -- Lock profile and verify expert status
  SELECT is_expert, expert_verified_at, wallet_balance, balance_withdrawable,
         balance_non_withdrawable, boost_expires_at
  INTO v_is_expert, v_expert_verified_at, v_wallet_balance, v_balance_withdrawable,
       v_balance_non_withdrawable, v_current_expiry
  FROM public.profiles
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  IF NOT COALESCE(v_is_expert, false) OR v_expert_verified_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You must be a verified expert to boost your profile');
  END IF;

  IF COALESCE(v_wallet_balance, 0) < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  IF COALESCE(v_balance_withdrawable, 0) >= p_amount THEN
    v_deduct_withdrawable := p_amount;
    v_deduct_non_withdrawable := 0;
  ELSE
    v_deduct_withdrawable := GREATEST(COALESCE(v_balance_withdrawable, 0), 0);
    v_deduct_non_withdrawable := p_amount - v_deduct_withdrawable;
  END IF;

  -- Extend boost from current expiry if still active, otherwise from now
  IF v_current_expiry IS NOT NULL AND v_current_expiry > NOW() THEN
    v_boost_end := v_current_expiry + (p_duration_days || ' days')::interval;
  ELSE
    v_boost_end := NOW() + (p_duration_days || ' days')::interval;
  END IF;

  UPDATE public.profiles
  SET wallet_balance = wallet_balance - p_amount,
      balance_withdrawable = GREATEST(balance_withdrawable - v_deduct_withdrawable, 0),
      balance_non_withdrawable = GREATEST(balance_non_withdrawable - v_deduct_non_withdrawable, 0),
      is_boosted = true,
      boost_expires_at = v_boost_end,
      updated_at = NOW()
  WHERE user_id = v_user_id;

  INSERT INTO public.wallet_transactions (user_id, kind, amount, status, reference)
  VALUES (v_user_id, 'expert_boost', -p_amount, 'completed',
          'Expert Boost - ' || COALESCE(p_package_name, p_duration_days || ' days'));

  RETURN jsonb_build_object(
    'success', true,
    'expires_at', v_boost_end,
    'amount_paid', p_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.boost_expert_profile(numeric, integer, text) TO authenticated;


-- ============================================================
-- 4. SCHEDULE expire_expert_boosts via pg_cron (hourly)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  -- Remove any existing schedule first
  PERFORM cron.unschedule('expire-expert-boosts-hourly')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-expert-boosts-hourly');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'expire-expert-boosts-hourly',
  '0 * * * *',
  $$ SELECT public.expire_expert_boosts(); $$
);

-- Run once now to clean up any already-expired boosts
SELECT public.expire_expert_boosts();