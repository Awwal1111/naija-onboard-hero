
-- 1. Extend developer_escrows for real money movement
ALTER TABLE public.developer_escrows
  ADD COLUMN IF NOT EXISTS payee_user_id uuid,
  ADD COLUMN IF NOT EXISTS payee_email text,
  ADD COLUMN IF NOT EXISTS held_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payout_reference text;

CREATE INDEX IF NOT EXISTS idx_developer_escrows_payee_user ON public.developer_escrows(payee_user_id);

-- 2. Atomic fund: developer NC -> escrow hold
CREATE OR REPLACE FUNCTION public.fund_developer_escrow(
  p_developer_id uuid,
  p_escrow_id text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_escrow record;
  v_dev_balance numeric;
  v_ref text;
BEGIN
  SELECT * INTO v_escrow
  FROM public.developer_escrows
  WHERE escrow_id = p_escrow_id AND developer_id = p_developer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Escrow not found');
  END IF;
  IF v_escrow.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cannot fund escrow with status: ' || v_escrow.status);
  END IF;

  SELECT wallet_balance INTO v_dev_balance
  FROM public.profiles WHERE user_id = p_developer_id FOR UPDATE;

  IF COALESCE(v_dev_balance, 0) < v_escrow.amount THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Insufficient developer NC balance', 'required', v_escrow.amount, 'balance', COALESCE(v_dev_balance, 0));
  END IF;

  UPDATE public.profiles
    SET wallet_balance = wallet_balance - v_escrow.amount, updated_at = now()
    WHERE user_id = p_developer_id;

  UPDATE public.developer_escrows
    SET status = 'funded', funded_at = now(), held_amount = v_escrow.amount
    WHERE escrow_id = p_escrow_id;

  v_ref := 'esc_fund_' || v_escrow.escrow_id;
  INSERT INTO public.wallet_transactions (user_id, amount, type, status, description, reference)
  VALUES (p_developer_id, -v_escrow.amount, 'developer_escrow_fund', 'completed',
          'Escrow funded: ' || v_escrow.escrow_id, v_ref);

  RETURN jsonb_build_object('ok', true, 'escrow_id', v_escrow.escrow_id, 'amount', v_escrow.amount, 'funded_at', now());
END;
$$;

-- 3. Atomic release: escrow hold -> payee NC
CREATE OR REPLACE FUNCTION public.release_developer_escrow(
  p_developer_id uuid,
  p_escrow_id text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_escrow record;
  v_payee uuid;
  v_ref text;
BEGIN
  SELECT * INTO v_escrow
  FROM public.developer_escrows
  WHERE escrow_id = p_escrow_id AND developer_id = p_developer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Escrow not found');
  END IF;
  IF v_escrow.status <> 'funded' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cannot release escrow with status: ' || v_escrow.status);
  END IF;

  -- Resolve payee
  v_payee := v_escrow.payee_user_id;
  IF v_payee IS NULL AND v_escrow.payee_email IS NOT NULL THEN
    SELECT user_id INTO v_payee FROM public.profiles WHERE email = v_escrow.payee_email LIMIT 1;
  END IF;
  IF v_payee IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Payee user not found');
  END IF;

  UPDATE public.profiles
    SET wallet_balance = COALESCE(wallet_balance, 0) + v_escrow.held_amount, updated_at = now()
    WHERE user_id = v_payee;

  UPDATE public.developer_escrows
    SET status = 'released', released_at = now(), payee_user_id = v_payee, payout_reference = 'esc_rel_' || v_escrow.escrow_id
    WHERE escrow_id = p_escrow_id;

  v_ref := 'esc_rel_' || v_escrow.escrow_id;
  INSERT INTO public.wallet_transactions (user_id, amount, type, status, description, reference)
  VALUES (v_payee, v_escrow.held_amount, 'developer_escrow_release', 'completed',
          'Escrow released: ' || v_escrow.escrow_id, v_ref);

  RETURN jsonb_build_object('ok', true, 'escrow_id', v_escrow.escrow_id, 'amount', v_escrow.held_amount, 'payee_user_id', v_payee, 'released_at', now());
END;
$$;

-- 4. Atomic refund: escrow hold -> back to developer
CREATE OR REPLACE FUNCTION public.refund_developer_escrow(
  p_developer_id uuid,
  p_escrow_id text,
  p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_escrow record;
  v_ref text;
BEGIN
  SELECT * INTO v_escrow
  FROM public.developer_escrows
  WHERE escrow_id = p_escrow_id AND developer_id = p_developer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Escrow not found');
  END IF;
  IF v_escrow.status NOT IN ('pending', 'funded') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cannot refund escrow with status: ' || v_escrow.status);
  END IF;

  IF v_escrow.status = 'funded' AND v_escrow.held_amount > 0 THEN
    UPDATE public.profiles
      SET wallet_balance = COALESCE(wallet_balance, 0) + v_escrow.held_amount, updated_at = now()
      WHERE user_id = p_developer_id;

    v_ref := 'esc_ref_' || v_escrow.escrow_id;
    INSERT INTO public.wallet_transactions (user_id, amount, type, status, description, reference)
    VALUES (p_developer_id, v_escrow.held_amount, 'developer_escrow_refund', 'completed',
            'Escrow refunded: ' || v_escrow.escrow_id, v_ref);
  END IF;

  UPDATE public.developer_escrows
    SET status = 'refunded', refunded_at = now(), refund_reason = p_reason
    WHERE escrow_id = p_escrow_id;

  RETURN jsonb_build_object('ok', true, 'escrow_id', v_escrow.escrow_id, 'amount', v_escrow.held_amount, 'refunded_at', now());
END;
$$;

-- 5. Atomic developer payout (replaces buggy multi-step JS version)
CREATE OR REPLACE FUNCTION public.developer_payout_atomic(
  p_developer_id uuid,
  p_recipient_user_id uuid,
  p_amount numeric,
  p_reference text,
  p_description text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dev_balance numeric;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Amount must be positive');
  END IF;
  IF p_developer_id = p_recipient_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cannot pay yourself');
  END IF;

  SELECT wallet_balance INTO v_dev_balance
  FROM public.profiles WHERE user_id = p_developer_id FOR UPDATE;

  IF COALESCE(v_dev_balance, 0) < p_amount THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Insufficient balance', 'balance', COALESCE(v_dev_balance, 0));
  END IF;

  -- Verify recipient exists
  PERFORM 1 FROM public.profiles WHERE user_id = p_recipient_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Recipient not found');
  END IF;

  UPDATE public.profiles SET wallet_balance = wallet_balance - p_amount, updated_at = now()
    WHERE user_id = p_developer_id;
  UPDATE public.profiles SET wallet_balance = COALESCE(wallet_balance, 0) + p_amount, updated_at = now()
    WHERE user_id = p_recipient_user_id;

  INSERT INTO public.wallet_transactions (user_id, amount, type, status, description, reference) VALUES
    (p_developer_id, -p_amount, 'developer_payout', 'completed',
     COALESCE(p_description, 'API payout to ' || p_recipient_user_id::text), p_reference),
    (p_recipient_user_id, p_amount, 'developer_credit', 'completed',
     COALESCE(p_description, 'API credit from developer'), p_reference);

  RETURN jsonb_build_object('ok', true, 'reference', p_reference, 'recipient_user_id', p_recipient_user_id, 'amount', p_amount, 'developer_balance_after', v_dev_balance - p_amount);
END;
$$;

-- 6. Idempotency cache for mutating endpoints
CREATE TABLE IF NOT EXISTS public.api_idempotency (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id uuid NOT NULL,
  api_key_hash text NOT NULL,
  idempotency_key text NOT NULL,
  endpoint text NOT NULL,
  request_hash text NOT NULL,
  response_body jsonb NOT NULL,
  status_code int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (api_key_hash, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_api_idempotency_dev ON public.api_idempotency(developer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_idempotency_cleanup ON public.api_idempotency(created_at);

ALTER TABLE public.api_idempotency ENABLE ROW LEVEL SECURITY;
-- No client policies — service-role only via edge function.

GRANT EXECUTE ON FUNCTION public.fund_developer_escrow TO service_role;
GRANT EXECUTE ON FUNCTION public.release_developer_escrow TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_developer_escrow TO service_role;
GRANT EXECUTE ON FUNCTION public.developer_payout_atomic TO service_role;
