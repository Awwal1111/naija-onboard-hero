-- Security fix: balance-changing SECURITY DEFINER functions must not be callable
-- by end users. Previously deduct_nc_balance(p_user_id, p_amount) was granted to
-- `authenticated` and never checked the caller, so any logged-in user could debit
-- any other user's wallet. All three functions below are now service_role only
-- (called from Edge Functions) and each is a single atomic UPDATE, so concurrent
-- requests cannot double-spend.

-- 1) deduct_nc_balance: atomic + service_role only
CREATE OR REPLACE FUNCTION public.deduct_nc_balance(p_user_id uuid, p_amount numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows integer;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
     SET wallet_balance = wallet_balance - p_amount,
         updated_at = now()
   WHERE user_id = p_user_id
     AND wallet_balance >= p_amount;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.deduct_nc_balance(uuid, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_nc_balance(uuid, numeric) TO service_role;

-- 2) debit_user_balances: atomic debit of wallet_balance AND balance_withdrawable
--    (used by send-sms). Returns false when the withdrawable balance is too low.
CREATE OR REPLACE FUNCTION public.debit_user_balances(p_user_id uuid, p_amount numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows integer;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
     SET wallet_balance = COALESCE(wallet_balance, 0) - p_amount,
         balance_withdrawable = COALESCE(balance_withdrawable, 0) - p_amount,
         updated_at = now()
   WHERE user_id = p_user_id
     AND COALESCE(balance_withdrawable, 0) >= p_amount
     AND COALESCE(wallet_balance, 0) >= p_amount;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.debit_user_balances(uuid, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.debit_user_balances(uuid, numeric) TO service_role;

-- 3) credit_user_balances: atomic credit of wallet_balance and (optionally)
--    balance_withdrawable. Used for refunds/escrow where the old code called the
--    non-existent supabase-js `.raw()`.
CREATE OR REPLACE FUNCTION public.credit_user_balances(
  p_user_id uuid,
  p_wallet numeric,
  p_withdrawable numeric DEFAULT 0
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows integer;
BEGIN
  IF COALESCE(p_wallet, 0) < 0 OR COALESCE(p_withdrawable, 0) < 0 THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
     SET wallet_balance = COALESCE(wallet_balance, 0) + COALESCE(p_wallet, 0),
         balance_withdrawable = COALESCE(balance_withdrawable, 0) + COALESCE(p_withdrawable, 0),
         updated_at = now()
   WHERE user_id = p_user_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_user_balances(uuid, numeric, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_user_balances(uuid, numeric, numeric) TO service_role;
