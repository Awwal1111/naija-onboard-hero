DELETE FROM public.posts WHERE id IN ('11751f22-623e-4a0b-b32a-c191a1e3ee9c','7be925d1-59fc-4a0b-afc4-0f6309837298');

CREATE OR REPLACE FUNCTION public.enforce_daily_post_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_premium boolean := false;
  v_count integer := 0;
BEGIN
  SELECT (p.is_premium IS TRUE AND (p.premium_expires_at IS NULL OR p.premium_expires_at > now()))
    INTO v_premium
  FROM public.profiles p
  WHERE p.user_id = NEW.user_id;

  IF COALESCE(v_premium, false) THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.posts
  WHERE user_id = NEW.user_id
    AND created_at > now() - interval '24 hours';

  IF v_count >= 2 THEN
    RAISE EXCEPTION 'Free accounts can publish 2 posts per 24 hours. Upgrade to Premium for unlimited posting.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_daily_post_limit ON public.posts;
CREATE TRIGGER trg_enforce_daily_post_limit
BEFORE INSERT ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.enforce_daily_post_limit();