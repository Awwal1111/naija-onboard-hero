ALTER TABLE public.developer_escrows
  ADD COLUMN IF NOT EXISTS inspection_period_days integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS auto_release_at timestamptz,
  ADD COLUMN IF NOT EXISTS disputed_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_reason text;

CREATE INDEX IF NOT EXISTS idx_developer_escrows_auto_release
  ON public.developer_escrows (auto_release_at)
  WHERE status = 'funded';

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
  v_funded_at timestamptz := now();
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
    SET status = 'funded', funded_at = v_funded_at, held_amount = v_escrow.amount,
        auto_release_at = v_funded_at + make_interval(days => v_escrow.inspection_period_days)
    WHERE escrow_id = p_escrow_id AND developer_id = p_developer_id;

  v_ref := 'esc_fund_' || v_escrow.escrow_id;
  INSERT INTO public.wallet_transactions (user_id, amount, type, status, description, reference)
  VALUES (p_developer_id, -v_escrow.amount, 'developer_escrow_fund', 'completed',
          'Escrow funded: ' || v_escrow.escrow_id, v_ref);

  RETURN jsonb_build_object('ok', true, 'escrow_id', v_escrow.escrow_id, 'amount', v_escrow.amount, 'funded_at', v_funded_at,
    'auto_release_at', v_funded_at + make_interval(days => v_escrow.inspection_period_days));
END;
$$;

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
  IF v_escrow.status NOT IN ('funded', 'disputed') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cannot release escrow with status: ' || v_escrow.status);
  END IF;

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
    WHERE escrow_id = p_escrow_id AND developer_id = p_developer_id;

  v_ref := 'esc_rel_' || v_escrow.escrow_id;
  INSERT INTO public.wallet_transactions (user_id, amount, type, status, description, reference)
  VALUES (v_payee, v_escrow.held_amount, 'developer_escrow_release', 'completed',
          'Escrow released: ' || v_escrow.escrow_id, v_ref);

  RETURN jsonb_build_object('ok', true, 'escrow_id', v_escrow.escrow_id, 'amount', v_escrow.held_amount, 'payee_user_id', v_payee, 'released_at', now());
END;
$$;

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
  IF v_escrow.status NOT IN ('pending', 'funded', 'disputed') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cannot refund escrow with status: ' || v_escrow.status);
  END IF;

  IF v_escrow.status IN ('funded', 'disputed') AND v_escrow.held_amount > 0 THEN
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
    WHERE escrow_id = p_escrow_id AND developer_id = p_developer_id;

  RETURN jsonb_build_object('ok', true, 'escrow_id', v_escrow.escrow_id, 'amount', v_escrow.held_amount, 'refunded_at', now());
END;
$$;

CREATE OR REPLACE FUNCTION public.initiate_developer_escrow_dispute(
  p_developer_id uuid,
  p_escrow_id text,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_escrow record;
  v_disputed_at timestamptz := now();
BEGIN
  SELECT * INTO v_escrow
  FROM public.developer_escrows
  WHERE escrow_id = p_escrow_id AND developer_id = p_developer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Escrow not found');
  END IF;
  IF v_escrow.status <> 'funded' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Only funded escrows can be disputed');
  END IF;
  IF v_escrow.auto_release_at IS NOT NULL AND v_escrow.auto_release_at <= v_disputed_at THEN
    RETURN jsonb_build_object('ok', false, 'error', 'The inspection period has ended');
  END IF;

  UPDATE public.developer_escrows
    SET status = 'disputed', disputed_at = v_disputed_at, dispute_reason = left(p_reason, 500)
    WHERE escrow_id = p_escrow_id AND developer_id = p_developer_id;

  RETURN jsonb_build_object('ok', true, 'escrow_id', p_escrow_id, 'status', 'disputed', 'disputed_at', v_disputed_at,
    'reason', left(p_reason, 500));
END;
$$;

REVOKE ALL ON FUNCTION public.initiate_developer_escrow_dispute(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.initiate_developer_escrow_dispute(uuid, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.auto_release_developer_escrows()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_escrow record;
  v_result jsonb;
  v_count integer := 0;
BEGIN
  FOR v_escrow IN
    SELECT developer_id, escrow_id
    FROM public.developer_escrows
    WHERE status = 'funded'
      AND auto_release_at IS NOT NULL
      AND auto_release_at <= now()
    ORDER BY auto_release_at
    LIMIT 100
    FOR UPDATE SKIP LOCKED
  LOOP
    v_result := public.release_developer_escrow(v_escrow.developer_id, v_escrow.escrow_id);
    IF COALESCE((v_result->>'ok')::boolean, false) THEN
      v_count := v_count + 1;
      PERFORM net.http_post(
        url := 'https://jxybqmquymxkvxxpiuhv.supabase.co/functions/v1/developer-webhook',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4eWJxbXF1eW14a3Z4eHBpdWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NTg2NTAsImV4cCI6MjA3MjEzNDY1MH0.muLG6PAzyEllY7WHbz_SnUCvwhISPqqaQn0L-kP0VdA'
        ),
        body := jsonb_build_object(
          'action', 'trigger',
          'developer_id', v_escrow.developer_id,
          'event_type', 'escrow.released',
          'payload', jsonb_build_object(
            'escrow_id', v_escrow.escrow_id,
            'amount', v_result->'amount',
            'payee_user_id', v_result->'payee_user_id',
            'released_at', v_result->'released_at',
            'automatic', true
          )
        )
      );
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_release_developer_escrows() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_release_developer_escrows() TO service_role;

DO $$
DECLARE
  v_job_id bigint;
BEGIN
  FOR v_job_id IN SELECT jobid FROM cron.job WHERE jobname = 'developer-escrow-auto-release'
  LOOP
    PERFORM cron.unschedule(v_job_id);
  END LOOP;
  PERFORM cron.schedule(
    'developer-escrow-auto-release',
    '0 * * * *',
    $cron$
      SELECT public.auto_release_developer_escrows();
    $cron$
  );
END;
$$;

COMMENT ON COLUMN public.developer_escrows.inspection_period_days IS 'Number of days the payer has to inspect after funding before automatic release.';
COMMENT ON COLUMN public.developer_escrows.auto_release_at IS 'Automatic release deadline, calculated when escrow is funded.';
COMMENT ON COLUMN public.developer_escrows.disputed_at IS 'Time the developer initiated a dispute; disputed escrow is excluded from automatic release.';
COMMENT ON COLUMN public.developer_escrows.dispute_reason IS 'Developer-provided reason for disputing escrow, up to 500 characters.';
