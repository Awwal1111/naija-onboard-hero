-- Create function to increment wallet balance safely
CREATE OR REPLACE FUNCTION public.increment_wallet_balance(target_user_id uuid, amount_to_add numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET wallet_balance = wallet_balance + amount_to_add
  WHERE user_id = target_user_id;
END;
$$;