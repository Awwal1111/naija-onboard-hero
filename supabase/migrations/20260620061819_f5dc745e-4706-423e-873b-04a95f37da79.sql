
-- 1. Expert level on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS expert_level text NOT NULL DEFAULT 'new';

-- 2. User certificates table
CREATE TABLE IF NOT EXISTS public.user_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  issuer text,
  credential_url text,
  credential_id text,
  issue_date date,
  expiry_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_certificates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_certificates TO authenticated;
GRANT ALL ON public.user_certificates TO service_role;

ALTER TABLE public.user_certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Certificates are publicly readable" ON public.user_certificates;
CREATE POLICY "Certificates are publicly readable"
  ON public.user_certificates FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users manage own certificates" ON public.user_certificates;
CREATE POLICY "Users manage own certificates"
  ON public.user_certificates FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_certificates_user ON public.user_certificates(user_id);

-- 3. Hire contracts
CREATE TABLE IF NOT EXISTS public.hire_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  expert_id uuid NOT NULL,
  contract_type text NOT NULL CHECK (contract_type IN ('fixed','hourly')),
  title text NOT NULL,
  scope text NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  hourly_rate numeric,
  weekly_cap_hours numeric,
  deposit_amount numeric NOT NULL DEFAULT 0,
  escrow_held numeric NOT NULL DEFAULT 0,
  platform_fee numeric NOT NULL DEFAULT 0,
  deadline timestamptz,
  status text NOT NULL DEFAULT 'pending_expert_signature',
  client_signature text,
  expert_signature text,
  client_signed_at timestamptz,
  expert_signed_at timestamptz,
  pdf_url text,
  cancellation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  cancelled_at timestamptz
);

GRANT SELECT, INSERT, UPDATE ON public.hire_contracts TO authenticated;
GRANT ALL ON public.hire_contracts TO service_role;

ALTER TABLE public.hire_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parties can view their contracts" ON public.hire_contracts;
CREATE POLICY "Parties can view their contracts"
  ON public.hire_contracts FOR SELECT
  USING (auth.uid() = client_id OR auth.uid() = expert_id);

DROP POLICY IF EXISTS "Client can create contract" ON public.hire_contracts;
CREATE POLICY "Client can create contract"
  ON public.hire_contracts FOR INSERT
  WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "Parties can update their contracts" ON public.hire_contracts;
CREATE POLICY "Parties can update their contracts"
  ON public.hire_contracts FOR UPDATE
  USING (auth.uid() = client_id OR auth.uid() = expert_id);

CREATE INDEX IF NOT EXISTS idx_hire_contracts_client ON public.hire_contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_hire_contracts_expert ON public.hire_contracts(expert_id);

CREATE TABLE IF NOT EXISTS public.hire_contract_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.hire_contracts(id) ON DELETE CASCADE,
  actor_id uuid,
  event_type text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.hire_contract_events TO authenticated;
GRANT ALL ON public.hire_contract_events TO service_role;

ALTER TABLE public.hire_contract_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parties can view contract events" ON public.hire_contract_events;
CREATE POLICY "Parties can view contract events"
  ON public.hire_contract_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.hire_contracts c
    WHERE c.id = contract_id AND (c.client_id = auth.uid() OR c.expert_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Parties can insert contract events" ON public.hire_contract_events;
CREATE POLICY "Parties can insert contract events"
  ON public.hire_contract_events FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.hire_contracts c
    WHERE c.id = contract_id AND (c.client_id = auth.uid() OR c.expert_id = auth.uid())
  ));

-- 4. Compute expert level
CREATE OR REPLACE FUNCTION public.compute_expert_level(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_completed int;
  v_total int;
  v_avg numeric;
  v_last_active timestamptz;
BEGIN
  SELECT COUNT(*) FILTER (WHERE status = 'completed'),
         COUNT(*),
         MAX(completed_at)
    INTO v_completed, v_total, v_last_active
  FROM gig_orders WHERE seller_id = _user_id;

  SELECT COALESCE(AVG(rating), 0) INTO v_avg
  FROM expert_ratings WHERE expert_id = _user_id;

  IF v_completed >= 25 AND v_avg >= 4.8
     AND (v_total = 0 OR (v_completed::numeric / v_total) >= 0.90) THEN
    RETURN 'top_rated';
  ELSIF v_completed >= 10 AND v_avg >= 4.7
        AND v_last_active IS NOT NULL
        AND v_last_active > now() - interval '60 days' THEN
    RETURN 'level_2';
  ELSIF v_completed >= 3 AND v_avg >= 4.5 THEN
    RETURN 'level_1';
  ELSE
    RETURN 'new';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_expert_level()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := COALESCE(NEW.seller_id, NEW.expert_id, OLD.seller_id, OLD.expert_id);
  IF v_uid IS NOT NULL THEN
    UPDATE profiles SET expert_level = public.compute_expert_level(v_uid)
    WHERE user_id = v_uid;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_level_on_order ON public.gig_orders;
CREATE TRIGGER trg_refresh_level_on_order
  AFTER INSERT OR UPDATE OF status ON public.gig_orders
  FOR EACH ROW EXECUTE FUNCTION public.refresh_expert_level();

DROP TRIGGER IF EXISTS trg_refresh_level_on_rating ON public.expert_ratings;
CREATE TRIGGER trg_refresh_level_on_rating
  AFTER INSERT OR UPDATE ON public.expert_ratings
  FOR EACH ROW EXECUTE FUNCTION public.refresh_expert_level();

-- 5. Extended place_gig_order with package tier + optional milestones
DROP FUNCTION IF EXISTS public.place_gig_order(uuid, uuid, text, text, numeric, integer);
CREATE OR REPLACE FUNCTION public.place_gig_order(
  p_gig_id uuid,
  p_seller_id uuid,
  p_title text,
  p_description text,
  p_amount numeric,
  p_delivery_days integer,
  p_tier text DEFAULT NULL,
  p_milestones jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_buyer uuid := auth.uid();
  v_balance numeric;
  v_order_id uuid;
  v_platform_fee numeric;
  v_deadline timestamptz;
  v_ms_sum numeric := 0;
  v_ms jsonb;
  v_idx int := 0;
BEGIN
  IF v_buyer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF v_buyer = p_seller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot order your own gig');
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid amount');
  END IF;

  IF p_milestones IS NOT NULL AND jsonb_array_length(p_milestones) > 0 THEN
    FOR v_ms IN SELECT * FROM jsonb_array_elements(p_milestones) LOOP
      v_ms_sum := v_ms_sum + COALESCE((v_ms->>'amount')::numeric, 0);
    END LOOP;
    IF ROUND(v_ms_sum::numeric, 2) <> ROUND(p_amount::numeric, 2) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Milestones total must equal order amount');
    END IF;
  END IF;

  SELECT balance_withdrawable INTO v_balance
  FROM profiles WHERE user_id = v_buyer FOR UPDATE;

  IF v_balance IS NULL OR v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient NC balance. Please top up your wallet.');
  END IF;

  v_platform_fee := p_amount * 0.05;
  v_deadline := now() + (COALESCE(p_delivery_days, 7) || ' days')::interval;

  UPDATE profiles
  SET balance_withdrawable = balance_withdrawable - p_amount,
      wallet_balance = wallet_balance - p_amount,
      updated_at = now()
  WHERE user_id = v_buyer;

  INSERT INTO gig_orders(gig_id, buyer_id, seller_id, title, description,
    amount, platform_fee, status, delivery_deadline, buyer_notes)
  VALUES (p_gig_id, v_buyer, p_seller_id,
    CASE WHEN p_tier IS NULL OR p_tier='' THEN p_title ELSE upper(p_tier) || ' • ' || p_title END,
    p_description, p_amount, v_platform_fee, 'pending', v_deadline, p_description)
  RETURNING id INTO v_order_id;

  INSERT INTO wallet_transactions(user_id, kind, amount, status, reference, metadata)
  VALUES (v_buyer, 'gig_order_hold', -p_amount, 'completed',
    'Gig order escrow: ' || p_title,
    jsonb_build_object('order_id', v_order_id, 'gig_id', p_gig_id, 'seller_id', p_seller_id, 'tier', p_tier));

  IF p_milestones IS NOT NULL AND jsonb_array_length(p_milestones) > 0 THEN
    FOR v_ms IN SELECT * FROM jsonb_array_elements(p_milestones) LOOP
      v_idx := v_idx + 1;
      INSERT INTO project_milestones(order_id, title, description, amount, due_date, status, order_index)
      VALUES (v_order_id,
              COALESCE(v_ms->>'title','Milestone ' || v_idx),
              v_ms->>'description',
              (v_ms->>'amount')::numeric,
              NULLIF(v_ms->>'due_date','')::timestamptz,
              'pending', v_idx);
    END LOOP;
  END IF;

  RETURN jsonb_build_object('success', true, 'order_id', v_order_id);
END;
$$;

-- 6. Release a single milestone
CREATE OR REPLACE FUNCTION public.release_gig_milestone(p_milestone_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_m RECORD;
  v_order RECORD;
  v_seller_amt numeric;
  v_remaining int;
  v_fee_share numeric;
BEGIN
  SELECT * INTO v_m FROM project_milestones WHERE id = p_milestone_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Milestone not found');
  END IF;
  IF v_m.status = 'released' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already released');
  END IF;

  SELECT * INTO v_order FROM gig_orders WHERE id = v_m.order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;
  IF v_order.buyer_id <> v_actor THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only buyer can release milestone');
  END IF;

  v_fee_share := (v_m.amount / NULLIF(v_order.amount,0)) * COALESCE(v_order.platform_fee,0);
  v_seller_amt := v_m.amount - COALESCE(v_fee_share, 0);

  UPDATE profiles
  SET balance_withdrawable = balance_withdrawable + v_seller_amt,
      wallet_balance = wallet_balance + v_seller_amt,
      updated_at = now()
  WHERE user_id = v_order.seller_id;

  UPDATE project_milestones
  SET status = 'released', released_at = now()
  WHERE id = p_milestone_id;

  INSERT INTO wallet_transactions(user_id, kind, amount, status, reference, metadata)
  VALUES (v_order.seller_id, 'milestone_payout', v_seller_amt, 'completed',
    'Milestone released: ' || v_m.title,
    jsonb_build_object('order_id', v_order.id, 'milestone_id', p_milestone_id));

  SELECT COUNT(*) INTO v_remaining
  FROM project_milestones
  WHERE order_id = v_order.id AND status <> 'released';

  IF v_remaining = 0 THEN
    UPDATE gig_orders SET status = 'completed', completed_at = now(), updated_at = now()
    WHERE id = v_order.id;
  END IF;

  RETURN jsonb_build_object('success', true, 'remaining', v_remaining);
END;
$$;

-- 7. Hire contract RPCs
CREATE OR REPLACE FUNCTION public.sign_hire_contract(p_contract_id uuid, p_signature text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_c RECORD;
  v_hold numeric;
  v_balance numeric;
  v_fee numeric;
BEGIN
  SELECT * INTO v_c FROM hire_contracts WHERE id = p_contract_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contract not found');
  END IF;
  IF v_actor NOT IN (v_c.client_id, v_c.expert_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a party to this contract');
  END IF;
  IF v_c.status NOT IN ('pending_expert_signature','pending_client_signature') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contract not awaiting signature');
  END IF;

  IF v_actor = v_c.client_id THEN
    UPDATE hire_contracts SET client_signature = p_signature, client_signed_at = now(), updated_at = now()
    WHERE id = p_contract_id;
  ELSE
    UPDATE hire_contracts SET expert_signature = p_signature, expert_signed_at = now(), updated_at = now()
    WHERE id = p_contract_id;
  END IF;

  SELECT * INTO v_c FROM hire_contracts WHERE id = p_contract_id FOR UPDATE;

  IF v_c.client_signed_at IS NOT NULL AND v_c.expert_signed_at IS NOT NULL AND v_c.escrow_held = 0 THEN
    v_hold := CASE
      WHEN v_c.contract_type = 'fixed' THEN v_c.total_amount
      ELSE COALESCE(v_c.deposit_amount, 0)
    END;
    IF v_hold > 0 THEN
      SELECT balance_withdrawable INTO v_balance FROM profiles WHERE user_id = v_c.client_id FOR UPDATE;
      IF v_balance IS NULL OR v_balance < v_hold THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient NC balance for escrow');
      END IF;
      v_fee := v_hold * 0.05;
      UPDATE profiles
        SET balance_withdrawable = balance_withdrawable - v_hold,
            wallet_balance = wallet_balance - v_hold,
            updated_at = now()
      WHERE user_id = v_c.client_id;
      UPDATE hire_contracts SET escrow_held = v_hold, platform_fee = v_fee, status = 'active', updated_at = now()
      WHERE id = p_contract_id;
      INSERT INTO wallet_transactions(user_id, kind, amount, status, reference, metadata)
      VALUES (v_c.client_id, 'hire_contract_escrow', -v_hold, 'completed',
        'Hire contract escrow: ' || v_c.title,
        jsonb_build_object('contract_id', p_contract_id, 'expert_id', v_c.expert_id));
    ELSE
      UPDATE hire_contracts SET status = 'active', updated_at = now() WHERE id = p_contract_id;
    END IF;
  END IF;

  INSERT INTO hire_contract_events(contract_id, actor_id, event_type, payload)
  VALUES (p_contract_id, v_actor, 'signed',
    jsonb_build_object('role', CASE WHEN v_actor = v_c.client_id THEN 'client' ELSE 'expert' END));

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_hire_contract(p_contract_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_c RECORD;
  v_pay numeric;
BEGIN
  SELECT * INTO v_c FROM hire_contracts WHERE id = p_contract_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contract not found');
  END IF;
  IF v_c.client_id <> v_actor THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only client can complete contract');
  END IF;
  IF v_c.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contract not active');
  END IF;

  v_pay := v_c.escrow_held - COALESCE(v_c.platform_fee, 0);
  IF v_pay > 0 THEN
    UPDATE profiles
      SET balance_withdrawable = balance_withdrawable + v_pay,
          wallet_balance = wallet_balance + v_pay,
          updated_at = now()
    WHERE user_id = v_c.expert_id;
    INSERT INTO wallet_transactions(user_id, kind, amount, status, reference, metadata)
    VALUES (v_c.expert_id, 'hire_contract_payout', v_pay, 'completed',
      'Hire contract payout: ' || v_c.title,
      jsonb_build_object('contract_id', p_contract_id));
  END IF;

  UPDATE hire_contracts SET status = 'completed', completed_at = now(), escrow_held = 0, updated_at = now()
  WHERE id = p_contract_id;

  INSERT INTO hire_contract_events(contract_id, actor_id, event_type, payload)
  VALUES (p_contract_id, v_actor, 'completed', jsonb_build_object('paid', v_pay));

  RETURN jsonb_build_object('success', true, 'paid', v_pay);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_hire_contract(p_contract_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_c RECORD;
BEGIN
  SELECT * INTO v_c FROM hire_contracts WHERE id = p_contract_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contract not found');
  END IF;
  IF v_actor NOT IN (v_c.client_id, v_c.expert_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a party');
  END IF;
  IF v_c.status NOT IN ('pending_expert_signature','pending_client_signature','active') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot cancel in current state');
  END IF;

  IF v_c.escrow_held > 0 THEN
    UPDATE profiles
      SET balance_withdrawable = balance_withdrawable + v_c.escrow_held,
          wallet_balance = wallet_balance + v_c.escrow_held,
          updated_at = now()
    WHERE user_id = v_c.client_id;
    INSERT INTO wallet_transactions(user_id, kind, amount, status, reference, metadata)
    VALUES (v_c.client_id, 'hire_contract_refund', v_c.escrow_held, 'completed',
      'Hire contract refund: ' || v_c.title,
      jsonb_build_object('contract_id', p_contract_id, 'reason', p_reason));
  END IF;

  UPDATE hire_contracts SET status = 'cancelled', cancelled_at = now(), cancellation_reason = p_reason, escrow_held = 0, updated_at = now()
  WHERE id = p_contract_id;

  INSERT INTO hire_contract_events(contract_id, actor_id, event_type, payload)
  VALUES (p_contract_id, v_actor, 'cancelled', jsonb_build_object('reason', p_reason));

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 8. Updated get_public_expert (drop first to allow column changes)
DROP FUNCTION IF EXISTS public.get_public_expert(text);
CREATE OR REPLACE FUNCTION public.get_public_expert(_slug text)
RETURNS TABLE(
  user_id uuid,
  username text,
  full_name text,
  profession text,
  bio text,
  profile_picture_url text,
  average_rating numeric,
  state_name text,
  area text,
  lga_name text,
  expert_level text,
  portfolio_link text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.username, p.full_name, p.profession, p.bio,
         p.profile_picture_url, p.average_rating, p.state_name, p.area,
         p.lga_name, p.expert_level,
         (SELECT ea.portfolio_link FROM expert_applications ea
          WHERE ea.user_id = p.user_id AND ea.status = 'approved'
          ORDER BY ea.reviewed_at DESC NULLS LAST LIMIT 1)
  FROM public.profiles p
  WHERE p.is_expert = true
    AND (p.user_id::text = _slug OR p.username = _slug)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_expert(text) TO anon, authenticated;

-- 9. Backfill expert levels once
UPDATE public.profiles SET expert_level = public.compute_expert_level(user_id)
WHERE is_expert = true;
