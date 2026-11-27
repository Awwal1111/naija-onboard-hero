-- Create job poster notifications from the trusted application insert trigger.
-- This replaces the browser's privileged send-notification call.
CREATE OR REPLACE FUNCTION public.notify_job_poster_on_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner_id uuid;
  v_job_title text;
  v_applicant_name text;
BEGIN
  SELECT jp.user_id, jp.title
  INTO v_owner_id, v_job_title
  FROM public.job_posts jp
  WHERE jp.id = NEW.job_post_id;

  IF v_owner_id IS NULL OR v_owner_id = NEW.applicant_id THEN
    RETURN NEW;
  END IF;

  SELECT p.full_name
  INTO v_applicant_name
  FROM public.profiles p
  WHERE p.user_id = NEW.applicant_id;

  INSERT INTO public.notifications (user_id, type, title, message, metadata)
  VALUES (
    v_owner_id,
    'job_application',
    'New Job Application!',
    COALESCE(v_applicant_name, 'Someone') || ' applied for "' || COALESCE(v_job_title, 'your job') || '"',
    jsonb_build_object(
      'job_post_id', NEW.job_post_id,
      'application_id', NEW.id,
      'applicant_id', NEW.applicant_id,
      'applicant_name', COALESCE(v_applicant_name, 'Someone'),
      'job_title', v_job_title
    )
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_job_poster_on_application()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notify_job_poster_on_application_trigger
  ON public.job_post_applications;

CREATE TRIGGER notify_job_poster_on_application_trigger
AFTER INSERT ON public.job_post_applications
FOR EACH ROW
EXECUTE FUNCTION public.notify_job_poster_on_application();
