-- Improve handle_new_user to properly capture Google OAuth data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_full_name TEXT;
BEGIN
  -- Extract full name from various OAuth provider formats
  -- Google OAuth stores: name, full_name, or first_name/last_name
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    CONCAT_WS(' ', 
      NEW.raw_user_meta_data->>'first_name', 
      NEW.raw_user_meta_data->>'last_name'
    ),
    ''
  );

  -- Create profile with signup bonus
  INSERT INTO public.profiles (
    user_id, 
    full_name, 
    phone_number,
    wallet_balance,
    balance_withdrawable,
    balance_non_withdrawable,
    profile_picture_url
  ) VALUES (
    NEW.id, 
    user_full_name,
    COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
    50.00,  -- ₦50NC signup bonus
    0.00,   -- Signup bonus is non-withdrawable
    50.00,  -- Non-withdrawable signup bonus
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  );
  
  -- Log the signup bonus transaction
  INSERT INTO public.wallet_transactions (
    user_id, 
    kind, 
    amount, 
    status, 
    reference
  ) VALUES (
    NEW.id,
    'signup_bonus',
    50.00,
    'completed',
    'New user signup bonus - ₦50NC'
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block signup
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$function$;