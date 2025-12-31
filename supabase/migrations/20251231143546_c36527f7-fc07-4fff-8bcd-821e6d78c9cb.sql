-- Drop and recreate the get_personalized_experts function with correct types
DROP FUNCTION IF EXISTS get_personalized_experts(uuid, integer, integer);

CREATE OR REPLACE FUNCTION get_personalized_experts(
  p_user_id uuid,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  profession text,
  bio text,
  profile_picture_url text,
  state_name text,
  lga_name text,
  area text,
  average_rating numeric,
  rating_count bigint,
  connections_count bigint,
  is_expert boolean,
  expert_verified_at timestamptz,
  is_boosted boolean,
  boost_expires_at timestamptz,
  is_premium boolean,
  premium_expires_at timestamptz,
  skill_category text,
  years_experience integer,
  relevance_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_state text;
BEGIN
  -- Get user's state for location-based matching
  SELECT p.state_name INTO v_user_state FROM profiles p WHERE p.user_id = get_personalized_experts.p_user_id;
  
  RETURN QUERY
  SELECT 
    p.user_id,
    p.full_name,
    p.profession,
    p.bio,
    p.profile_picture_url,
    p.state_name,
    p.lga_name,
    p.area,
    COALESCE(p.average_rating, 0::numeric) as average_rating,
    COALESCE(p.rating_count, 0::bigint) as rating_count,
    COALESCE(p.connections_count, 0::bigint) as connections_count,
    p.is_expert,
    p.expert_verified_at,
    COALESCE(p.is_boosted, false) as is_boosted,
    p.boost_expires_at,
    COALESCE(p.is_premium, false) as is_premium,
    p.premium_expires_at,
    ea.skill_category,
    ea.years_experience,
    (
      CASE WHEN p.is_premium = true AND p.premium_expires_at > NOW() THEN 100 ELSE 0 END +
      CASE WHEN p.is_boosted = true AND p.boost_expires_at > NOW() THEN 80 ELSE 0 END +
      CASE WHEN p.expert_verified_at IS NOT NULL THEN 30 ELSE 0 END +
      COALESCE(p.average_rating, 0) * 5 +
      CASE WHEN p.state_name = v_user_state THEN 15 ELSE 0 END +
      LEAST(COALESCE(p.rating_count, 0), 10) +
      LEAST(COALESCE(p.connections_count, 0) / 10, 10)
    )::numeric as relevance_score
  FROM profiles p
  LEFT JOIN expert_applications ea ON ea.user_id = p.user_id AND ea.status = 'approved'
  WHERE p.is_expert = true
    AND p.user_id != get_personalized_experts.p_user_id
  ORDER BY 
    (CASE WHEN p.is_premium = true AND p.premium_expires_at > NOW() THEN 1 ELSE 0 END) DESC,
    (CASE WHEN p.is_boosted = true AND p.boost_expires_at > NOW() THEN 1 ELSE 0 END) DESC,
    relevance_score DESC,
    p.average_rating DESC NULLS LAST,
    p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;