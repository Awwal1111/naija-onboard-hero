
CREATE OR REPLACE FUNCTION public.get_public_expert(_slug text)
RETURNS TABLE (
  user_id uuid,
  username text,
  full_name text,
  profession text,
  bio text,
  profile_picture_url text,
  average_rating numeric,
  state_name text,
  area text,
  lga_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.username, p.full_name, p.profession, p.bio,
         p.profile_picture_url, p.average_rating, p.state_name, p.area,
         p.lga_name
  FROM public.profiles p
  WHERE p.is_expert = true
    AND (p.user_id::text = _slug OR p.username = _slug)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_expert(text) TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view open job posts" ON public.job_posts;
CREATE POLICY "Public can view open job posts"
ON public.job_posts FOR SELECT
TO anon
USING (status = 'open');

GRANT SELECT ON public.job_posts TO anon;
