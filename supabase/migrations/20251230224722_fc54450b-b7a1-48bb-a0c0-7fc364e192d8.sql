-- Update the get_personalized_gigs function with proper ranking per spec
-- Ranking: boost_amount DESC, trust_score DESC, created_at ASC
CREATE OR REPLACE FUNCTION public.get_personalized_gigs(p_user_id uuid, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, title text, description text, price numeric, category text, photo_urls text[], status text, created_at timestamp with time zone, boost_amount numeric, seller_id uuid, seller_name text, seller_picture text, seller_rating numeric, seller_is_expert boolean, seller_state text, average_rating numeric, review_count integer, relevance_score numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- Calculate trust score from profile fields
    (
      COALESCE(p.average_rating, 0) * 20 +
      CASE WHEN p.is_expert THEN 15 ELSE 0 END +
      CASE WHEN p.email_confirmed THEN 10 ELSE 0 END +
      CASE WHEN p.phone_verified THEN 10 ELSE 0 END +
      CASE WHEN p.face_verified THEN 15 ELSE 0 END +
      CASE WHEN p.state_name = v_user_state THEN 5 ELSE 0 END
    )::numeric as relevance_score
  FROM jobs_services js
  LEFT JOIN profiles p ON p.user_id = js.user_id
  WHERE js.status = 'active'
    AND js.user_id != p_user_id
  ORDER BY 
    COALESCE(js.boost_amount, 0) DESC,  -- Primary: boost_amount
    relevance_score DESC,                 -- Secondary: trust_score
    js.created_at ASC                     -- Tertiary: older gigs first (fair to early sellers)
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;