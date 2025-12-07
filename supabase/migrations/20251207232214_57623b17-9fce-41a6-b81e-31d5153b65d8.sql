-- Fix type mismatch: rating_count is bigint, cast to INT in functions
DROP FUNCTION IF EXISTS public.get_personalized_experts(UUID, INT, INT);

CREATE FUNCTION public.get_personalized_experts(
  p_user_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id TEXT,
  user_id UUID,
  full_name TEXT,
  skill_category TEXT,
  years_experience INT,
  location_state TEXT,
  location_lga TEXT,
  location_area TEXT,
  status TEXT,
  profile_picture_url TEXT,
  bio TEXT,
  profession TEXT,
  average_rating NUMERIC,
  rating_count BIGINT,
  is_expert BOOLEAN,
  email_verified BOOLEAN,
  phone_verified BOOLEAN,
  face_verified BOOLEAN,
  relevance_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_state TEXT;
  v_user_lga TEXT;
  v_user_profession TEXT;
BEGIN
  SELECT pr.state_name, pr.lga_name, pr.profession
  INTO v_user_state, v_user_lga, v_user_profession
  FROM profiles pr WHERE pr.user_id = p_user_id;

  RETURN QUERY
  SELECT 
    ea.id::TEXT,
    ea.user_id,
    COALESCE(p.full_name, ea.full_name) AS full_name,
    ea.skill_category,
    ea.years_experience,
    ea.location_state,
    ea.location_lga,
    ea.location_area,
    ea.status,
    p.profile_picture_url,
    p.bio,
    p.profession,
    COALESCE(p.average_rating, 0) AS average_rating,
    COALESCE(p.rating_count, 0) AS rating_count,
    COALESCE(p.is_expert, false) AS is_expert,
    COALESCE(p.email_verified, false) AS email_verified,
    COALESCE(p.phone_verified, false) AS phone_verified,
    COALESCE(p.face_verified, false) AS face_verified,
    (
      10 +
      LEAST(ea.years_experience * 2, 20) +
      (COALESCE(p.average_rating, 0) * 5) +
      LEAST(COALESCE(p.rating_count, 0)::INT, 15) +
      CASE WHEN v_user_profession IS NOT NULL AND 
           (ea.skill_category ILIKE '%' || v_user_profession || '%' OR
            v_user_profession ILIKE '%' || ea.skill_category || '%')
      THEN 30 ELSE 0 END +
      CASE WHEN v_user_state IS NOT NULL AND ea.location_state = v_user_state THEN 15 ELSE 0 END +
      CASE WHEN v_user_lga IS NOT NULL AND ea.location_lga = v_user_lga THEN 10 ELSE 0 END +
      CASE WHEN COALESCE(p.email_verified, false) THEN 5 ELSE 0 END +
      CASE WHEN COALESCE(p.phone_verified, false) THEN 5 ELSE 0 END +
      CASE WHEN COALESCE(p.face_verified, false) THEN 10 ELSE 0 END +
      CASE WHEN COALESCE(p.average_rating, 0) >= 4.5 AND COALESCE(p.rating_count, 0) >= 5 THEN 15 ELSE 0 END
    )::NUMERIC AS relevance_score
  FROM expert_applications ea
  LEFT JOIN profiles p ON p.user_id = ea.user_id
  WHERE ea.status = 'approved'
  AND p.user_id IS NOT NULL
  ORDER BY relevance_score DESC, p.average_rating DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;