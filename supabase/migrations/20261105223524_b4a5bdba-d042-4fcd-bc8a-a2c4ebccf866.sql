ALTER TABLE public.job_posts ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS external_url text,
  ADD COLUMN IF NOT EXISTS external_id text;
CREATE UNIQUE INDEX IF NOT EXISTS job_posts_external_id_uniq ON public.job_posts(external_id) WHERE external_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.enforce_job_post_rules()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_trusted boolean := current_user IN ('service_role','postgres','supabase_admin') OR coalesce(auth.role(),'') = 'service_role';
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF v_trusted THEN RETURN NEW; END IF;
    NEW.source := 'user';
    NEW.external_url := NULL;
    NEW.external_id := NULL;
    NEW.moderation_status := 'pending';
    NEW.moderated_by := NULL;
    NEW.moderated_at := NULL;
    RETURN NEW;
  END IF;
  IF NOT v_trusted AND NOT public.has_admin_access() THEN
    NEW.moderation_status := OLD.moderation_status;
    NEW.moderated_by := OLD.moderated_by;
    NEW.moderated_at := OLD.moderated_at;
    NEW.moderation_note := OLD.moderation_note;
    NEW.source := OLD.source;
    NEW.external_url := OLD.external_url;
  END IF;
  RETURN NEW;
END;
$function$;