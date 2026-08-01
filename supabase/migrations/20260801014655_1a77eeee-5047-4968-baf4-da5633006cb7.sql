CREATE OR REPLACE FUNCTION public.transfer_funds(sender_id uuid, recipient_email text, amount numeric, pin_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  authenticated_user_id uuid := auth.uid();
  recipient_record RECORD;
  sender_balance numeric;
  sender_pin text;
BEGIN
  IF authenticated_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF sender_id IS DISTINCT FROM authenticated_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid sender');
  END IF;

  IF amount IS NULL OR amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid amount');
  END IF;

  SELECT p.balance_withdrawable, s.transaction_pin
    INTO sender_balance, sender_pin
  FROM public.profiles p
  LEFT JOIN public.user_secrets s ON s.user_id = p.user_id
  WHERE p.user_id = authenticated_user_id
  FOR UPDATE OF p;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sender not found');
  END IF;

  IF sender_pin IS NULL OR sender_pin = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Please set up your transaction PIN in Settings first');
  END IF;

  IF sender_pin <> pin_hash THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incorrect PIN');
  END IF;

  SELECT au.id AS user_id, au.email, p.full_name
    INTO recipient_record
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.user_id = au.id
  WHERE lower(au.email) = lower(recipient_email)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recipient not found');
  END IF;

  IF authenticated_user_id = recipient_record.user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot transfer to yourself');
  END IF;

  IF coalesce(sender_balance, 0) < amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  UPDATE public.profiles
  SET balance_withdrawable = balance_withdrawable - amount,
      wallet_balance = wallet_balance - amount,
      updated_at = now()
  WHERE user_id = authenticated_user_id;

  UPDATE public.profiles
  SET balance_withdrawable = coalesce(balance_withdrawable, 0) + amount,
      wallet_balance = coalesce(wallet_balance, 0) + amount,
      updated_at = now()
  WHERE user_id = recipient_record.user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recipient profile not found';
  END IF;

  INSERT INTO public.wallet_transactions (user_id, kind, amount, status, reference)
  VALUES
    (authenticated_user_id, 'transfer_out', -amount, 'completed', 'Transfer to ' || coalesce(recipient_record.full_name, recipient_record.email)),
    (recipient_record.user_id, 'transfer_in', amount, 'completed', 'Transfer received');

  RETURN jsonb_build_object(
    'success', true,
    'recipient_name', coalesce(recipient_record.full_name, recipient_record.email),
    'amount', amount
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', 'Transfer failed: ' || SQLERRM);
END;
$function$;

REVOKE ALL ON FUNCTION public.transfer_funds(uuid, text, numeric, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.transfer_funds(uuid, text, numeric, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.transfer_funds(uuid, text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_funds(uuid, text, numeric, text) TO service_role;