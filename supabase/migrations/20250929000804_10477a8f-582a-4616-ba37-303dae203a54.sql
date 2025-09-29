-- Add ₦50NC signup bonus for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Create profile with signup bonus
  INSERT INTO public.profiles (
    user_id, 
    full_name, 
    phone_number,
    wallet_balance,
    balance_non_withdrawable
  ) VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
    50.00,  -- ₦50NC signup bonus
    50.00   -- Non-withdrawable signup bonus
  );
  
  -- Log the signup bonus transaction
  INSERT INTO public.wallet_transactions (
    user_id, 
    transaction_type, 
    amount, 
    status, 
    description
  ) VALUES (
    NEW.id,
    'signup_bonus',
    50.00,
    'completed',
    'New user signup bonus - ₦50NC'
  );
  
  RETURN NEW;
END;
$function$;