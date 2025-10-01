-- Fix transfer_funds to properly validate PIN
CREATE OR REPLACE FUNCTION public.transfer_funds(sender_id uuid, recipient_email text, amount numeric, pin_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  recipient_profile RECORD;
  sender_balance NUMERIC;
  sender_pin TEXT;
  result JSONB;
BEGIN
  -- Validate sender exists and get PIN
  SELECT balance_withdrawable, transaction_pin INTO sender_balance, sender_pin
  FROM profiles WHERE user_id = sender_id;
  
  IF NOT FOUND THEN
    RETURN '{"success": false, "error": "Sender not found"}';
  END IF;
  
  -- Check if PIN is set
  IF sender_pin IS NULL OR sender_pin = '' THEN
    RETURN '{"success": false, "error": "Please set up your transaction PIN in Settings first"}';
  END IF;
  
  -- Validate PIN (in production, use proper hashing comparison)
  IF sender_pin != pin_hash THEN
    RETURN '{"success": false, "error": "Incorrect PIN"}';
  END IF;
  
  -- Find recipient by email
  SELECT user_id, full_name, email_confirmed 
  INTO recipient_profile
  FROM profiles 
  WHERE phone_number = recipient_email OR user_id IN (
    SELECT id FROM auth.users WHERE email = recipient_email
  );
  
  IF NOT FOUND THEN
    RETURN '{"success": false, "error": "Recipient not found"}';
  END IF;
  
  IF NOT recipient_profile.email_confirmed THEN
    RETURN '{"success": false, "error": "Recipient email not confirmed"}';
  END IF;
  
  -- Validate amount and balance
  IF amount <= 0 THEN
    RETURN '{"success": false, "error": "Invalid amount"}';
  END IF;
  
  IF sender_balance < amount THEN
    RETURN '{"success": false, "error": "Insufficient balance"}';
  END IF;
  
  IF sender_id = recipient_profile.user_id THEN
    RETURN '{"success": false, "error": "Cannot transfer to yourself"}';
  END IF;
  
  -- Perform the transfer
  UPDATE profiles 
  SET balance_withdrawable = balance_withdrawable - amount,
      wallet_balance = wallet_balance - amount
  WHERE user_id = sender_id;
  
  UPDATE profiles 
  SET balance_withdrawable = balance_withdrawable + amount,
      wallet_balance = wallet_balance + amount
  WHERE user_id = recipient_profile.user_id;
  
  -- Log transactions
  INSERT INTO wallet_transactions (user_id, transaction_type, amount, status, description)
  VALUES (sender_id, 'transfer_out', -amount, 'completed', 'Transfer to ' || recipient_profile.full_name);
  
  INSERT INTO wallet_transactions (user_id, transaction_type, amount, status, description)
  VALUES (recipient_profile.user_id, 'transfer_in', amount, 'completed', 'Transfer from sender');
  
  RETURN jsonb_build_object(
    'success', true, 
    'recipient_name', recipient_profile.full_name,
    'amount', amount
  );
END;
$function$;