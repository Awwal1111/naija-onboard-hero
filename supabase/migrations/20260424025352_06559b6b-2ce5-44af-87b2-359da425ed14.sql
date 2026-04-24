
-- 1) Unique reference per IvoryPay wallet_transactions row (scoped, doesn't touch other providers)
CREATE UNIQUE INDEX IF NOT EXISTS wallet_transactions_ivorypay_reference_unique_idx
  ON public.wallet_transactions (reference)
  WHERE reference IS NOT NULL
    AND (metadata->>'provider') = 'ivorypay';

-- 2) Atomic, idempotent crediting function for IvoryPay deposits
CREATE OR REPLACE FUNCTION public.process_ivorypay_deposit(
  p_user_id      UUID,
  p_reference    TEXT,
  p_nc_amount    NUMERIC,
  p_settled_crypto NUMERIC,
  p_crypto_currency TEXT,
  p_via          TEXT
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.wallet_transactions%ROWTYPE;
BEGIN
  IF p_nc_amount IS NULL OR p_nc_amount <= 0 THEN
    RETURN jsonb_build_object('credited', false, 'reason', 'invalid_amount');
  END IF;

  -- Look up any existing row for this reference (pending or completed)
  SELECT * INTO v_existing
  FROM public.wallet_transactions
  WHERE reference = p_reference
    AND (metadata->>'provider') = 'ivorypay'
  LIMIT 1;

  IF v_existing.id IS NOT NULL AND v_existing.status = 'completed' THEN
    RETURN jsonb_build_object('credited', false, 'reason', 'already_completed');
  END IF;

  -- Credit the user wallet
  UPDATE public.profiles
     SET wallet_balance        = COALESCE(wallet_balance, 0)        + p_nc_amount,
         balance_withdrawable  = COALESCE(balance_withdrawable, 0)  + p_nc_amount,
         updated_at            = now()
   WHERE user_id = p_user_id;

  IF v_existing.id IS NOT NULL THEN
    UPDATE public.wallet_transactions
       SET amount   = p_nc_amount,
           status   = 'completed',
           kind     = 'deposit',
           metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
             'provider', 'ivorypay',
             'settled_crypto', p_settled_crypto,
             'crypto_currency', p_crypto_currency,
             'credited_via', p_via,
             'credited_at', now()
           )
     WHERE id = v_existing.id;
  ELSE
    INSERT INTO public.wallet_transactions
      (user_id, amount, currency, kind, status, reference, metadata)
    VALUES
      (p_user_id, p_nc_amount, 'NC', 'deposit', 'completed', p_reference,
       jsonb_build_object(
         'provider', 'ivorypay',
         'settled_crypto', p_settled_crypto,
         'crypto_currency', p_crypto_currency,
         'credited_via', p_via,
         'credited_at', now()
       ));
  END IF;

  RETURN jsonb_build_object('credited', true, 'nc_amount', p_nc_amount);
END;
$$;

REVOKE ALL ON FUNCTION public.process_ivorypay_deposit(UUID, TEXT, NUMERIC, NUMERIC, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_ivorypay_deposit(UUID, TEXT, NUMERIC, NUMERIC, TEXT, TEXT) TO service_role;
