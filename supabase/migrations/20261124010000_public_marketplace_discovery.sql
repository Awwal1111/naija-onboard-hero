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
    AND COALESCE(p.is_private, false) = false
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
    AND COALESCE(p.is_private, false) = false
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_experts() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_by_id(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_by_username(text) TO anon, authenticated;
