CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.user_secrets
  ADD COLUMN IF NOT EXISTS transaction_pin_hash text;

UPDATE public.user_secrets
SET transaction_pin_hash = public.crypt(transaction_pin, public.gen_salt('bf', 12))
WHERE transaction_pin IS NOT NULL
  AND transaction_pin <> ''
  AND transaction_pin_hash IS NULL;

CREATE OR REPLACE FUNCTION public.sync_transaction_pin_hash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.transaction_pin IS DISTINCT FROM OLD.transaction_pin
     OR NEW.transaction_pin_hash IS NULL THEN
    NEW.transaction_pin_hash := CASE
      WHEN NEW.transaction_pin IS NULL OR NEW.transaction_pin = '' THEN NULL
      ELSE public.crypt(NEW.transaction_pin, public.gen_salt('bf', 12))
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_transaction_pin_hash ON public.user_secrets;
CREATE TRIGGER sync_transaction_pin_hash
BEFORE INSERT OR UPDATE OF transaction_pin ON public.user_secrets
FOR EACH ROW EXECUTE FUNCTION public.sync_transaction_pin_hash();

CREATE TABLE IF NOT EXISTS public.withdrawal_pin_attempts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawal_pin_attempts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.withdrawal_balance_reservations (
  reference text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved', 'refunded', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawal_balance_reservations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.reserve_withdrawable_balance(
  p_user_id uuid,
  p_amount numeric,
  p_pin text,
  p_reference text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pin_hash text;
  v_attempts public.withdrawal_pin_attempts%ROWTYPE;
BEGIN
  IF p_user_id IS NULL OR p_amount IS NULL
     OR p_amount::text IN ('NaN', 'Infinity', '-Infinity')
     OR p_amount <= 0 OR p_reference IS NULL OR p_reference = '' THEN
    RETURN 'invalid_amount';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.withdrawal_balance_reservations
    WHERE reference = p_reference
  ) THEN
    RETURN 'duplicate_reference';
  END IF;

  INSERT INTO public.withdrawal_pin_attempts (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_attempts
  FROM public.withdrawal_pin_attempts
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_attempts.locked_until > now() THEN
    RETURN 'pin_locked';
  ELSIF v_attempts.locked_until IS NOT NULL THEN
    UPDATE public.withdrawal_pin_attempts
    SET failed_attempts = 0, locked_until = NULL, updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  SELECT transaction_pin_hash INTO v_pin_hash
  FROM public.user_secrets
  WHERE user_id = p_user_id;

  IF v_pin_hash IS NULL OR v_pin_hash = '' THEN
    RETURN 'pin_not_set';
  END IF;

  IF p_pin IS NULL OR p_pin !~ '^[0-9]{4}$'
     OR public.crypt(p_pin, v_pin_hash) <> v_pin_hash THEN
    UPDATE public.withdrawal_pin_attempts
    SET failed_attempts = failed_attempts + 1,
        locked_until = CASE
          WHEN failed_attempts + 1 >= 5 THEN now() + interval '15 minutes'
          ELSE NULL
        END,
        updated_at = now()
    WHERE user_id = p_user_id;
    RETURN 'invalid_pin';
  END IF;

  UPDATE public.profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) - p_amount,
      balance_withdrawable = COALESCE(balance_withdrawable, 0) - p_amount,
      updated_at = now()
  WHERE user_id = p_user_id
    AND COALESCE(wallet_balance, 0) >= p_amount
    AND COALESCE(balance_withdrawable, 0) >= p_amount;

  IF NOT FOUND THEN
    RETURN 'insufficient_balance';
  END IF;

  INSERT INTO public.withdrawal_balance_reservations (reference, user_id, amount)
  VALUES (p_reference, p_user_id, p_amount);

  UPDATE public.withdrawal_pin_attempts
  SET failed_attempts = 0, locked_until = NULL, updated_at = now()
  WHERE user_id = p_user_id;

  RETURN 'ok';
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_withdrawable_balance(p_reference text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation public.withdrawal_balance_reservations%ROWTYPE;
BEGIN
  IF p_reference IS NULL OR p_reference = '' THEN
    RETURN false;
  END IF;

  SELECT * INTO v_reservation
  FROM public.withdrawal_balance_reservations
  WHERE reference = p_reference
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;
  IF v_reservation.status = 'refunded' THEN
    RETURN true;
  ELSIF v_reservation.status <> 'reserved' THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) + v_reservation.amount,
      balance_withdrawable = COALESCE(balance_withdrawable, 0) + v_reservation.amount,
      updated_at = now()
  WHERE user_id = v_reservation.user_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.withdrawal_balance_reservations
  SET status = 'refunded', updated_at = now()
  WHERE reference = p_reference;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.commit_withdrawable_balance(p_reference text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.withdrawal_balance_reservations
    WHERE reference = p_reference AND status = 'completed'
  ) THEN
    RETURN true;
  END IF;

  UPDATE public.withdrawal_balance_reservations
  SET status = 'completed', updated_at = now()
  WHERE reference = p_reference AND status = 'reserved';
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_withdrawable_balance(uuid, numeric, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_withdrawable_balance(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.commit_withdrawable_balance(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_withdrawable_balance(uuid, numeric, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_withdrawable_balance(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.commit_withdrawable_balance(text) TO service_role;
