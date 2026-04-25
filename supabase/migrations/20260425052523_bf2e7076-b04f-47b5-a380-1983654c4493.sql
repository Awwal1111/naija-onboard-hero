
CREATE TABLE IF NOT EXISTS public.gig_spam_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID NOT NULL REFERENCES public.jobs_services(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reasons TEXT[] NOT NULL DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'medium',
  reviewed BOOLEAN NOT NULL DEFAULT false,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  action TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gig_spam_flags_gig ON public.gig_spam_flags(gig_id);
CREATE INDEX IF NOT EXISTS idx_gig_spam_flags_reviewed ON public.gig_spam_flags(reviewed);

ALTER TABLE public.gig_spam_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage spam flags" ON public.gig_spam_flags;
CREATE POLICY "Admins can manage spam flags"
ON public.gig_spam_flags
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Users can view their own spam flags" ON public.gig_spam_flags;
CREATE POLICY "Users can view their own spam flags"
ON public.gig_spam_flags
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.detect_gig_spam()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_text TEXT;
  v_title TEXT;
  v_desc TEXT;
  v_reasons TEXT[] := ARRAY[]::TEXT[];
  v_severity TEXT := 'low';
  v_block BOOLEAN := false;
  v_link_count INT;
BEGIN
  v_title := COALESCE(NEW.title, '');
  v_desc := COALESCE(NEW.description, '');
  v_text := LOWER(v_title || ' ' || v_desc);

  IF v_text ~ '\m(hiring|we are hiring|now hiring|looking for a (personal assistant|freelancer|remote|virtual)|remote jobs?|work[ -]from[ -]home|jobseekers?|apply now|send (your )?(cv|resume))\M' THEN
    v_reasons := array_append(v_reasons, 'job_listing_disguised_as_gig');
    v_severity := 'high';
    v_block := true;
  END IF;

  IF v_text ~ '\m(download (this |the |our )?(app|game)|sign ?up (and|to)|earn \$?\d+|play to earn|refer(ral)? code|use my (code|link)|join my team|click (the )?link|register (now|here|today))\M' THEN
    v_reasons := array_append(v_reasons, 'promotional_referral_spam');
    v_severity := 'high';
    v_block := true;
  END IF;

  IF v_text ~ '\m(whatsapp|telegram|wa\.me|t\.me|chat me on|dm me on|message me on)\M' AND v_text ~ '\d{7,}' THEN
    v_reasons := array_append(v_reasons, 'external_contact_solicitation');
    v_severity := 'high';
    v_block := true;
  END IF;

  IF v_text ~ '\m(get rich|easy money|guaranteed (income|profit)|make \$?\d+ (per |a |daily|hourly)|crypto (signal|pump))\M' THEN
    v_reasons := array_append(v_reasons, 'get_rich_quick_claims');
    IF v_severity = 'low' THEN v_severity := 'medium'; END IF;
  END IF;

  IF length(trim(v_title)) < 8 THEN
    v_reasons := array_append(v_reasons, 'title_too_short');
    IF v_severity = 'low' THEN v_severity := 'medium'; END IF;
  END IF;

  IF length(trim(v_desc)) < 40 THEN
    v_reasons := array_append(v_reasons, 'description_too_short');
    IF v_severity = 'low' THEN v_severity := 'medium'; END IF;
  END IF;

  v_link_count := (length(v_desc) - length(regexp_replace(v_desc, 'https?://', '', 'gi'))) / 8;
  IF v_link_count > 2 THEN
    v_reasons := array_append(v_reasons, 'excessive_links');
    IF v_severity = 'low' THEN v_severity := 'medium'; END IF;
  END IF;

  IF v_block THEN
    RAISE EXCEPTION 'GIG_SPAM_BLOCKED: %', array_to_string(v_reasons, ',')
      USING HINT = 'This listing looks like a job posting or promotional spam. Use the Jobs section to post jobs, and write a real service description for gigs.',
            ERRCODE = 'check_violation';
  END IF;

  IF array_length(v_reasons, 1) > 0 AND v_severity = 'medium' THEN
    NEW.status := 'under_review';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_detect_gig_spam ON public.jobs_services;
CREATE TRIGGER trg_detect_gig_spam
BEFORE INSERT OR UPDATE OF title, description ON public.jobs_services
FOR EACH ROW
EXECUTE FUNCTION public.detect_gig_spam();

CREATE OR REPLACE FUNCTION public.log_gig_spam_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'under_review' THEN
    INSERT INTO public.gig_spam_flags (gig_id, user_id, reasons, severity)
    VALUES (NEW.id, NEW.user_id, ARRAY['auto_flagged_on_insert'], 'medium')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_gig_spam_flag ON public.jobs_services;
CREATE TRIGGER trg_log_gig_spam_flag
AFTER INSERT ON public.jobs_services
FOR EACH ROW
EXECUTE FUNCTION public.log_gig_spam_flag();

DELETE FROM public.jobs_services
WHERE id IN (
  '47785530-95ec-416b-abde-79b483027acb',
  'be59e8e2-3fe2-4c1a-a21c-36996b385237'
);
