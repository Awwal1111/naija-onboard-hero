-- Fix deduct_nc_balance function to use wallet_balance instead of nc_balance
CREATE OR REPLACE FUNCTION public.deduct_nc_balance(p_user_id uuid, p_amount numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance NUMERIC;
BEGIN
  SELECT wallet_balance INTO current_balance 
  FROM profiles 
  WHERE user_id = p_user_id;
  
  IF current_balance >= p_amount THEN
    UPDATE profiles 
    SET wallet_balance = wallet_balance - p_amount,
        updated_at = now()
    WHERE user_id = p_user_id;
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;