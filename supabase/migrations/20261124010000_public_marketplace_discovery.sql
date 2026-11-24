-- Safe anonymous discovery APIs for the public NaijaLancers marketplace.
-- Expose only fields intended for public profile pages; never expose phone, email,
-- wallet balances, referral codes, secrets, or verification documents.

CREATE OR REPLACE FUNCTION public.get_public_experts()
RETURNS TABLE (
  user_id uuid,
  username text,
  full_name text,
  profession text,
  bio text,
  profile_picture_url text,
  state_name text,
  average_rating numeric,
  rating_count integer,
  expert_verified_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.username, p.full_name, p.profession, p.bio,
         p.profile_picture_url, p.state_name, p.average_rating,
         p.rating_count, p.expert_verified_at, p.updated_at
  FROM public.profiles p
  WHERE p.is_expert = true
    AND COALESCE(p.full_name, '') <> ''
  ORDER BY p.updated_at DESC NULLS LAST
  LIMIT 100;
$$;

CREATE OR REPLACE FUNCTION public.get_public_profile_by_id(_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  username text,
  full_name text,
  profession text,
  bio text,
  profile_picture_url text,
  state_name text,
  lga_name text,
  area text,
  is_expert boolean,
  expert_verified_at timestamptz,
  average_rating numeric,
  rating_count integer,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.username, p.full_name, p.profession, p.bio,
         p.profile_picture_url, p.state_name, p.lga_name, p.area,
         p.is_expert, p.expert_verified_at, p.average_rating,
         p.rating_count, p.updated_at
  FROM public.profiles p
  WHERE p.user_id = _user_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_public_profile_by_username(_username text)
RETURNS TABLE (
  user_id uuid,
  username text,
  full_name text,
  profession text,
  bio text,
  profile_picture_url text,
  state_name text,
  lga_name text,
  area text,
  is_expert boolean,
  expert_verified_at timestamptz,
  average_rating numeric,
  rating_count integer,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.username, p.full_name, p.profession, p.bio,
         p.profile_picture_url, p.state_name, p.lga_name, p.area,
         p.is_expert, p.expert_verified_at, p.average_rating,
         p.rating_count, p.updated_at
  FROM public.profiles p
  WHERE lower(p.username) = lower(_username)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_experts() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_by_id(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_by_username(text) TO anon, authenticated;


-- Public gig cards include the seller's display identity, never private contact or wallet data.
CREATE OR REPLACE FUNCTION public.get_public_gigs()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  title text,
  description text,
  price numeric,
  category text,
  status text,
  created_at timestamptz,
  photo_urls text[],
  seller_username text,
  seller_name text,
  seller_profession text,
  seller_picture text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.id, g.user_id, g.title, g.description, g.price, g.category,
         g.status, g.created_at, g.photo_urls,
         p.username, p.full_name, p.profession, p.profile_picture_url
  FROM public.jobs_services g
  LEFT JOIN public.profiles p ON p.user_id = g.user_id
  WHERE g.status IN ('open', 'active')
  ORDER BY g.created_at DESC
  LIMIT 100;
$$;

-- Public job list exposes job details and poster display name only.
CREATE OR REPLACE FUNCTION public.get_public_jobs()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  title text,
  description text,
  budget_min numeric,
  budget_max numeric,
  industry text,
  job_type text,
  location text,
  status text,
  created_at timestamptz,
  required_skills text[],
  company_name text,
  poster_name text,
  poster_username text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT j.id, j.user_id, j.title, j.description, j.budget_min, j.budget_max,
         j.industry, j.job_type, j.location, j.status, j.created_at,
         j.required_skills, j.company_name, p.full_name, p.username
  FROM public.job_posts j
  LEFT JOIN public.profiles p ON p.user_id = j.user_id
  WHERE j.status = 'open'
  ORDER BY j.created_at DESC
  LIMIT 100;
$$;

-- Job detail deliberately omits contact_email/contact_phone and moderation internals.
CREATE OR REPLACE FUNCTION public.get_public_job(_job_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  title text,
  description text,
  company_name text,
  company_logo_url text,
  location text,
  budget_min numeric,
  budget_max numeric,
  currency text,
  salary_currency text,
  salary_period text,
  job_type text,
  required_skills text[],
  experience_level text,
  industry text,
  is_remote boolean,
  work_schedule text,
  created_at timestamptz,
  application_deadline timestamptz,
  poster_name text,
  poster_username text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT j.id, j.user_id, j.title, j.description, j.company_name,
         j.company_logo_url, j.location, j.budget_min, j.budget_max,
         j.currency, j.salary_currency, j.salary_period, j.job_type,
         j.required_skills, j.experience_level, j.industry, j.is_remote,
         j.work_schedule, j.created_at, j.application_deadline,
         p.full_name, p.username
  FROM public.job_posts j
  LEFT JOIN public.profiles p ON p.user_id = j.user_id
  WHERE j.id = _job_id AND j.status = 'open'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_gigs() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_jobs() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_job(uuid) TO anon, authenticated;
