
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;

CREATE OR REPLACE FUNCTION public.generate_profile_username(_full_name text, _user_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  base text;
  candidate text;
  suffix text;
  i int := 0;
BEGIN
  base := lower(regexp_replace(coalesce(_full_name, ''), '[^a-zA-Z0-9]+', '-', 'g'));
  base := trim(both '-' from base);
  IF base IS NULL OR length(base) < 3 THEN
    base := 'user';
  END IF;
  IF length(base) > 40 THEN base := substr(base, 1, 40); END IF;
  suffix := substr(replace(_user_id::text, '-', ''), 1, 6);
  candidate := base || '-' || suffix;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(candidate)) AND i < 5 LOOP
    i := i + 1;
    candidate := base || '-' || substr(md5(_user_id::text || i::text), 1, 6);
  END LOOP;
  RETURN candidate;
END;
$$;

UPDATE public.profiles
SET username = public.generate_profile_username(full_name, user_id)
WHERE username IS NULL OR length(trim(username)) = 0;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx ON public.profiles (lower(username));

CREATE OR REPLACE FUNCTION public.set_profile_username()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.username IS NULL OR length(trim(NEW.username)) = 0 THEN
    NEW.username := public.generate_profile_username(NEW.full_name, NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_profile_username ON public.profiles;
CREATE TRIGGER trg_set_profile_username
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_profile_username();
