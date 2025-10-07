-- Function to look up user by email
CREATE OR REPLACE FUNCTION public.lookup_user_by_email(lookup_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Look up user from auth.users and join with profiles
  SELECT 
    au.id as user_id,
    au.email,
    p.full_name,
    p.phone_number
  INTO user_record
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.user_id = au.id
  WHERE LOWER(au.email) = LOWER(lookup_email)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'user_id', user_record.user_id,
    'email', user_record.email,
    'full_name', COALESCE(user_record.full_name, 'NaijaLancers User'),
    'phone_number', user_record.phone_number
  );
END;
$$;

-- Update the transfer_funds function to properly handle transfers
CREATE OR REPLACE FUNCTION public.transfer_funds(sender_id uuid, recipient_email text, amount numeric, pin_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_record RECORD;
  sender_balance NUMERIC;
  sender_pin TEXT;
  result JSONB;
BEGIN
  -- Validate sender exists and get PIN
  SELECT balance_withdrawable, transaction_pin INTO sender_balance, sender_pin
  FROM public.profiles WHERE user_id = sender_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sender not found');
  END IF;
  
  -- Check if PIN is set
  IF sender_pin IS NULL OR sender_pin = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Please set up your transaction PIN in Settings first');
  END IF;
  
  -- Validate PIN
  IF sender_pin != pin_hash THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incorrect PIN');
  END IF;
  
  -- Find recipient by email from auth.users
  SELECT 
    au.id as user_id,
    au.email,
    p.full_name,
    p.email_confirmed
  INTO recipient_record
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.user_id = au.id
  WHERE LOWER(au.email) = LOWER(recipient_email)
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recipient not found');
  END IF;
  
  -- Validate amount and balance
  IF amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid amount');
  END IF;
  
  IF sender_balance < amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
  IF sender_id = recipient_record.user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot transfer to yourself');
  END IF;
  
  -- Perform the transfer (BEGIN transaction)
  BEGIN
    -- Deduct from sender
    UPDATE public.profiles 
    SET 
      balance_withdrawable = balance_withdrawable - amount,
      wallet_balance = wallet_balance - amount,
      updated_at = NOW()
    WHERE user_id = sender_id;
    
    -- Add to recipient
    UPDATE public.profiles 
    SET 
      balance_withdrawable = balance_withdrawable + amount,
      wallet_balance = wallet_balance + amount,
      updated_at = NOW()
    WHERE user_id = recipient_record.user_id;
    
    -- Log sender transaction
    INSERT INTO public.wallet_transactions (user_id, transaction_type, amount, status, description)
    VALUES (
      sender_id, 
      'transfer_out', 
      -amount, 
      'completed', 
      'Transfer to ' || COALESCE(recipient_record.full_name, recipient_record.email)
    );
    
    -- Log recipient transaction
    INSERT INTO public.wallet_transactions (user_id, transaction_type, amount, status, description)
    VALUES (
      recipient_record.user_id, 
      'transfer_in', 
      amount, 
      'completed', 
      'Transfer from sender'
    );
    
    RETURN jsonb_build_object(
      'success', true,
      'recipient_name', COALESCE(recipient_record.full_name, recipient_record.email),
      'amount', amount
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transfer failed: ' || SQLERRM);
  END;
END;
$$;