
CREATE TABLE public.developer_charge_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id uuid NOT NULL,
  session_id text NOT NULL UNIQUE,
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'NC',
  description text,
  external_user_id text,
  external_user_email text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  reference text,
  redirect_url text,
  payer_user_id uuid,
  completed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '2 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dev_charge_sessions_developer ON public.developer_charge_sessions(developer_id, created_at DESC);
CREATE INDEX idx_dev_charge_sessions_status ON public.developer_charge_sessions(status);

GRANT SELECT, INSERT, UPDATE ON public.developer_charge_sessions TO authenticated;
GRANT ALL ON public.developer_charge_sessions TO service_role;

ALTER TABLE public.developer_charge_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Developers can view their charge sessions"
  ON public.developer_charge_sessions FOR SELECT TO authenticated
  USING (auth.uid() = developer_id);

CREATE POLICY "Payer or anyone signed-in can read by session_id"
  ON public.developer_charge_sessions FOR SELECT TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.developer_charge_consume_atomic(
  p_session_id text,
  p_payer_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_session public.developer_charge_sessions;
  v_balance numeric;
  v_ref text;
BEGIN
  SELECT * INTO v_session FROM public.developer_charge_sessions
    WHERE session_id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Session not found');
  END IF;
  IF v_session.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Session already ' || v_session.status);
  END IF;
  IF v_session.expires_at < now() THEN
    UPDATE public.developer_charge_sessions SET status='expired', updated_at=now() WHERE id=v_session.id;
    RETURN jsonb_build_object('ok', false, 'error', 'Session expired');
  END IF;
  IF v_session.developer_id = p_payer_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cannot pay yourself');
  END IF;

  SELECT wallet_balance INTO v_balance FROM public.profiles WHERE user_id = p_payer_user_id FOR UPDATE;
  IF COALESCE(v_balance, 0) < v_session.amount THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Insufficient balance', 'balance', COALESCE(v_balance, 0));
  END IF;

  PERFORM 1 FROM public.profiles WHERE user_id = v_session.developer_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Developer wallet missing');
  END IF;

  v_ref := 'dev_charge_' || v_session.session_id;

  UPDATE public.profiles SET wallet_balance = wallet_balance - v_session.amount, updated_at = now()
    WHERE user_id = p_payer_user_id;
  UPDATE public.profiles SET wallet_balance = COALESCE(wallet_balance,0) + v_session.amount, updated_at = now()
    WHERE user_id = v_session.developer_id;

  INSERT INTO public.wallet_transactions (user_id, amount, type, status, description, reference) VALUES
    (p_payer_user_id, -v_session.amount, 'developer_charge', 'completed',
      COALESCE(v_session.description, 'Charge by developer'), v_ref),
    (v_session.developer_id, v_session.amount, 'developer_charge_received', 'completed',
      COALESCE(v_session.description, 'Charge from end-user'), v_ref);

  UPDATE public.developer_charge_sessions
    SET status='completed', payer_user_id=p_payer_user_id, reference=v_ref,
        completed_at=now(), updated_at=now()
    WHERE id=v_session.id;

  RETURN jsonb_build_object('ok', true, 'reference', v_ref,
    'amount', v_session.amount, 'developer_id', v_session.developer_id,
    'payer_balance_after', v_balance - v_session.amount);
END;
$$;
