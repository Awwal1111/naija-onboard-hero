-- Add boost_amount to jobs_services for Gig Boost feature
ALTER TABLE public.jobs_services 
ADD COLUMN IF NOT EXISTS boost_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS boosted_at timestamp with time zone;

-- Create index for boost-based ranking
DROP INDEX IF EXISTS idx_jobs_services_boost_ranking;
CREATE INDEX idx_jobs_services_boost_ranking 
ON public.jobs_services (category, boost_amount DESC, created_at ASC) 
WHERE status = 'active';

-- Drop and recreate the gigs function with boost support
DROP FUNCTION IF EXISTS public.get_personalized_gigs(uuid, integer, integer);

CREATE FUNCTION public.get_personalized_gigs(
  p_user_id uuid,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  price numeric,
  category text,
  photo_urls text[],
  status text,
  created_at timestamptz,
  boost_amount numeric,
  seller_id uuid,
  seller_name text,
  seller_picture text,
  seller_rating numeric,
  seller_is_expert boolean,
  seller_state text,
  average_rating numeric,
  review_count integer,
  relevance_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_state text;
BEGIN
  -- Get user's state for personalization
  SELECT p.state_name
  INTO v_user_state
  FROM profiles p
  WHERE p.user_id = p_user_id;

  RETURN QUERY
  SELECT 
    js.id,
    js.title,
    js.description,
    js.price,
    js.category,
    js.photo_urls,
    js.status,
    js.created_at,
    COALESCE(js.boost_amount, 0::numeric) as boost_amount,
    js.user_id as seller_id,
    p.full_name as seller_name,
    p.profile_picture_url as seller_picture,
    COALESCE(p.average_rating, 0::numeric) as seller_rating,
    COALESCE(p.is_expert, false) as seller_is_expert,
    p.state_name as seller_state,
    COALESCE(js.average_rating, 0::numeric) as average_rating,
    COALESCE(js.review_count, 0) as review_count,
    (
      COALESCE(js.boost_amount, 0) * 100 +
      CASE WHEN p.state_name = v_user_state THEN 20 ELSE 0 END +
      CASE WHEN p.is_expert THEN 10 ELSE 0 END +
      COALESCE(p.average_rating, 0) * 5 +
      CASE WHEN js.created_at > NOW() - INTERVAL '7 days' THEN 5 ELSE 0 END
    )::numeric as relevance_score
  FROM jobs_services js
  LEFT JOIN profiles p ON p.user_id = js.user_id
  WHERE js.status = 'active'
    AND js.user_id != p_user_id
  ORDER BY 
    COALESCE(js.boost_amount, 0) DESC,
    relevance_score DESC,
    js.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;