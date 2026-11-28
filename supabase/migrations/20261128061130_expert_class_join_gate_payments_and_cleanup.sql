-- ExpertClass hardening (applied to production 2026-11-28).
-- Server-side join gate (status, capacity, payment), automatic participant counts,
-- expert-only class creation, protected server-owned fields, stale class cleanup.

ALTER TABLE public.class_participants
  ADD COLUMN IF NOT EXISTS amount_paid numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.join_class(p_class_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid := auth.uid();
  c public.expert_classes%ROWTYPE;
  p public.class_participants%ROWTYPE;
  v_active int;
  v_wallet numeric;
  v_withdrawable numeric;
  v_fee numeric;
  v_host_amount numeric;
  v_paid numeric := 0;
  v_end timestamptz;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('status','auth_required');
  END IF;

  SELECT * INTO c FROM public.expert_classes WHERE id = p_class_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','not_found');
  END IF;

  IF c.status IN ('ended','cancelled') THEN
    RETURN jsonb_build_object('status','ended');
  END IF;

  IF c.expert_id = v_user THEN
    RETURN jsonb_build_object('status','ok','role','host');
  END IF;

  IF c.status = 'scheduled' THEN
    v_end := c.scheduled_start + make_interval(mins => COALESCE(c.duration_minutes, 60) + 30);
    IF c.scheduled_start IS NOT NULL AND v_end < now() THEN
      RETURN jsonb_build_object('status','expired');
    END IF;
    IF c.scheduled_start IS NOT NULL AND c.scheduled_start - interval '10 minutes' > now() THEN
      RETURN jsonb_build_object('status','too_early','scheduled_start',c.scheduled_start);
    END IF;
    RETURN jsonb_build_object('status','waiting');
  END IF;

  IF c.status <> 'live' THEN
    RETURN jsonb_build_object('status','unavailable');
  END IF;

  SELECT * INTO p FROM public.class_participants
  WHERE class_id = p_class_id AND user_id = v_user FOR UPDATE;

  SELECT count(*) INTO v_active FROM public.class_participants
  WHERE class_id = p_class_id AND is_active AND user_id <> v_user;
  IF v_active >= c.max_participants THEN
    RETURN jsonb_build_object('status','full','max',c.max_participants);
  END IF;

  IF NOT COALESCE(c.is_free, true) AND COALESCE(c.price,0) > 0
     AND COALESCE(p.amount_paid,0) = 0 THEN
    SELECT wallet_balance, balance_withdrawable INTO v_wallet, v_withdrawable
    FROM public.profiles WHERE user_id = v_user FOR UPDATE;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('status','error','message','Wallet not found');
    END IF;
    IF COALESCE(v_wallet,0) < c.price OR COALESCE(v_withdrawable,0) < c.price THEN
      RETURN jsonb_build_object('status','insufficient_balance','price',c.price);
    END IF;

    v_fee := ROUND(c.price * 0.05, 2);
    v_host_amount := c.price - v_fee;

    UPDATE public.profiles
    SET wallet_balance = wallet_balance - c.price,
        balance_withdrawable = balance_withdrawable - c.price,
        updated_at = now()
    WHERE user_id = v_user;

    UPDATE public.profiles
    SET wallet_balance = COALESCE(wallet_balance,0) + v_host_amount,
        balance_withdrawable = COALESCE(balance_withdrawable,0) + v_host_amount,
        updated_at = now()
    WHERE user_id = c.expert_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Class host wallet not found';
    END IF;

    INSERT INTO public.wallet_transactions(user_id, kind, amount, status, reference, metadata)
    VALUES
      (v_user, 'class_enrollment', -c.price, 'completed', 'Class: ' || c.title,
        jsonb_build_object('class_id', c.id, 'host_id', c.expert_id)),
      (c.expert_id, 'class_sale', v_host_amount, 'completed', 'Class sale: ' || c.title,
        jsonb_build_object('class_id', c.id, 'buyer_id', v_user, 'gross', c.price, 'platform_fee', v_fee));

    IF v_fee > 0 THEN
      PERFORM public.credit_platform_revenue('class_fee', v_fee, v_user, c.id::text,
        jsonb_build_object('host_id', c.expert_id, 'gross', c.price));
    END IF;
    v_paid := c.price;
  END IF;

  INSERT INTO public.class_participants(class_id, user_id, is_active, joined_at, amount_paid)
  VALUES (p_class_id, v_user, true, now(), v_paid)
  ON CONFLICT (class_id, user_id) DO UPDATE
    SET is_active = true, left_at = NULL, joined_at = now(),
        amount_paid = GREATEST(public.class_participants.amount_paid, EXCLUDED.amount_paid);

  RETURN jsonb_build_object('status','ok','role','participant','charged',v_paid);
END;
$$;

REVOKE ALL ON FUNCTION public.join_class(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_class(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Users can join classes" ON public.class_participants;
REVOKE INSERT ON public.class_participants FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.guard_class_participant_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_user IN ('anon','authenticated') THEN
    IF NEW.class_id IS DISTINCT FROM OLD.class_id
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.amount_paid IS DISTINCT FROM OLD.amount_paid
       OR NEW.joined_at IS DISTINCT FROM OLD.joined_at
       OR (NEW.is_active AND NOT OLD.is_active) THEN
      RAISE EXCEPTION 'Participation can only be ended from the client' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS class_participants_guard_update ON public.class_participants;
CREATE TRIGGER class_participants_guard_update BEFORE UPDATE ON public.class_participants
FOR EACH ROW EXECUTE FUNCTION public.guard_class_participant_update();

CREATE OR REPLACE FUNCTION public.sync_class_participant_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_class uuid := COALESCE(NEW.class_id, OLD.class_id);
BEGIN
  UPDATE public.expert_classes
  SET current_participants = (SELECT count(*) FROM public.class_participants WHERE class_id = v_class AND is_active)
  WHERE id = v_class;
  RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS class_participants_sync_count ON public.class_participants;
CREATE TRIGGER class_participants_sync_count
AFTER INSERT OR DELETE OR UPDATE OF is_active ON public.class_participants
FOR EACH ROW EXECUTE FUNCTION public.sync_class_participant_count();

CREATE OR REPLACE FUNCTION public.close_class_participants()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.class_participants
  SET is_active = false, left_at = COALESCE(left_at, now())
  WHERE class_id = NEW.id AND is_active;
  RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS expert_classes_close_participants ON public.expert_classes;
CREATE TRIGGER expert_classes_close_participants
AFTER UPDATE OF status ON public.expert_classes
FOR EACH ROW WHEN (NEW.status IN ('ended','cancelled') AND OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.close_class_participants();

DROP POLICY IF EXISTS "Experts can create their own classes" ON public.expert_classes;
CREATE POLICY "Experts can create their own classes" ON public.expert_classes
FOR INSERT WITH CHECK (
  auth.uid() = expert_id
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_expert IS TRUE)
);

CREATE OR REPLACE FUNCTION public.guard_expert_class_write()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_user IN ('anon','authenticated') THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.status NOT IN ('scheduled','live') THEN
        RAISE EXCEPTION 'Invalid class status' USING ERRCODE = '42501';
      END IF;
      IF NEW.max_participants < 1 OR NEW.max_participants > 50 THEN
        RAISE EXCEPTION 'Max participants must be between 1 and 50' USING ERRCODE = '22023';
      END IF;
      IF NOT COALESCE(NEW.is_free, true) AND COALESCE(NEW.price,0) < 100 THEN
        RAISE EXCEPTION 'Paid classes must cost at least 100 NC' USING ERRCODE = '22023';
      END IF;
      IF COALESCE(NEW.is_free, true) THEN NEW.price := 0; END IF;
      NEW.current_participants := 0;
      NEW.expert_pass := NULL;
      NEW.actual_end := NULL;
      NEW.recording_url := NULL;
    ELSE
      IF NEW.expert_id IS DISTINCT FROM OLD.expert_id OR NEW.room_code IS DISTINCT FROM OLD.room_code THEN
        RAISE EXCEPTION 'Class ownership and room code cannot change' USING ERRCODE = '42501';
      END IF;
      NEW.current_participants := OLD.current_participants;
      NEW.expert_pass := NULL;
      IF OLD.status IN ('ended','cancelled') AND NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'A finished class cannot be reopened' USING ERRCODE = '42501';
      END IF;
      IF OLD.status = 'live' AND NEW.status NOT IN ('live','ended') THEN
        RAISE EXCEPTION 'Invalid status change' USING ERRCODE = '42501';
      END IF;
      IF (NEW.price IS DISTINCT FROM OLD.price OR NEW.is_free IS DISTINCT FROM OLD.is_free)
         AND EXISTS (SELECT 1 FROM public.class_participants WHERE class_id = OLD.id) THEN
        RAISE EXCEPTION 'Price cannot change after people have joined' USING ERRCODE = '42501';
      END IF;
      IF NOT COALESCE(NEW.is_free, true) AND COALESCE(NEW.price,0) < 100 THEN
        RAISE EXCEPTION 'Paid classes must cost at least 100 NC' USING ERRCODE = '22023';
      END IF;
      IF COALESCE(NEW.is_free, true) THEN NEW.price := 0; END IF;
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS expert_classes_guard_write ON public.expert_classes;
CREATE TRIGGER expert_classes_guard_write BEFORE INSERT OR UPDATE ON public.expert_classes
FOR EACH ROW EXECUTE FUNCTION public.guard_expert_class_write();

CREATE OR REPLACE FUNCTION public.expire_stale_classes()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE n1 int; n2 int;
BEGIN
  UPDATE public.expert_classes
  SET status = 'cancelled'
  WHERE status = 'scheduled' AND actual_start IS NULL AND scheduled_start IS NOT NULL
    AND scheduled_start + make_interval(mins => COALESCE(duration_minutes, 60) + 30) < now();
  GET DIAGNOSTICS n1 = ROW_COUNT;

  UPDATE public.expert_classes
  SET status = 'ended', actual_end = now()
  WHERE status = 'live'
    AND COALESCE(actual_start, scheduled_start, created_at)
        + make_interval(mins => COALESCE(duration_minutes, 60) + 120) < now();
  GET DIAGNOSTICS n2 = ROW_COUNT;
  RETURN n1 + n2;
END; $$;
REVOKE ALL ON FUNCTION public.expire_stale_classes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_stale_classes() TO service_role;

SELECT cron.schedule('expire-stale-expert-classes', '*/10 * * * *', 'select public.expire_stale_classes();');

UPDATE public.expert_classes SET expert_pass = NULL WHERE expert_pass IS NOT NULL;
UPDATE public.class_participants p SET is_active = false, left_at = COALESCE(left_at, now())
FROM public.expert_classes c WHERE c.id = p.class_id AND c.status IN ('ended','cancelled') AND p.is_active;
UPDATE public.expert_classes c SET current_participants =
  (SELECT count(*) FROM public.class_participants p WHERE p.class_id = c.id AND p.is_active);
