-- Fix profession matching to be more accurate (exact or similar terms, not substring)
CREATE OR REPLACE FUNCTION public.get_personalized_connections(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  user_id UUID,
  full_name TEXT,
  profession TEXT,
  profile_picture_url TEXT,
  state_name TEXT,
  lga_name TEXT,
  is_expert BOOLEAN,
  average_rating NUMERIC,
  relevance_score NUMERIC
)
LANGUAGE plpgsql
STABLE
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
    pr.user_id,
    pr.full_name,
    pr.profession,
    pr.profile_picture_url,
    pr.state_name,
    pr.lga_name,
    COALESCE(pr.is_expert, false) AS is_expert,
    COALESCE(pr.average_rating, 0)::NUMERIC AS average_rating,
    (
      -- Location match
      CASE WHEN pr.state_name = v_user_state THEN 20
           WHEN pr.lga_name = v_user_lga THEN 30
           ELSE 0 END
      +
      -- Profession match - EXACT match or very similar (not substring)
      CASE 
        WHEN v_user_profession IS NULL OR v_user_profession = '' THEN 0
        WHEN pr.profession IS NULL OR pr.profession = '' THEN 0
        WHEN LOWER(TRIM(pr.profession)) = LOWER(TRIM(v_user_profession)) THEN 25
        -- Similar profession category (e.g., both contain "developer" or "designer")
        WHEN (
          (LOWER(pr.profession) LIKE '%developer%' AND LOWER(v_user_profession) LIKE '%developer%') OR
          (LOWER(pr.profession) LIKE '%designer%' AND LOWER(v_user_profession) LIKE '%designer%') OR
          (LOWER(pr.profession) LIKE '%engineer%' AND LOWER(v_user_profession) LIKE '%engineer%') OR
          (LOWER(pr.profession) LIKE '%marketer%' AND LOWER(v_user_profession) LIKE '%marketer%') OR
          (LOWER(pr.profession) LIKE '%marketing%' AND LOWER(v_user_profession) LIKE '%marketing%') OR
          (LOWER(pr.profession) LIKE '%writer%' AND LOWER(v_user_profession) LIKE '%writer%') OR
          (LOWER(pr.profession) LIKE '%analyst%' AND LOWER(v_user_profession) LIKE '%analyst%') OR
          (LOWER(pr.profession) LIKE '%consultant%' AND LOWER(v_user_profession) LIKE '%consultant%') OR
          (LOWER(pr.profession) LIKE '%manager%' AND LOWER(v_user_profession) LIKE '%manager%')
        ) THEN 15
        ELSE 0 
      END
      +
      -- Expert status
      CASE WHEN pr.is_expert = true THEN 15 ELSE 0 END
      +
      -- Rating
      COALESCE(pr.average_rating, 0) * 5
      +
      -- Trust score
      CASE WHEN pr.email_verified = true THEN 3 ELSE 0 END
      + CASE WHEN pr.phone_verified = true THEN 3 ELSE 0 END
      + CASE WHEN pr.face_verified = true THEN 6 ELSE 0 END
    )::NUMERIC AS relevance_score
  FROM profiles pr
  WHERE pr.user_id != p_user_id
    -- Exclude already connected users
    AND NOT EXISTS (
      SELECT 1 FROM connections c 
      WHERE (c.user1_id = p_user_id AND c.user2_id = pr.user_id)
         OR (c.user2_id = p_user_id AND c.user1_id = pr.user_id)
    )
    -- Exclude pending connection requests
    AND NOT EXISTS (
      SELECT 1 FROM connection_requests cr
      WHERE (cr.requester_id = p_user_id AND cr.requested_id = pr.user_id)
         OR (cr.requester_id = pr.user_id AND cr.requested_id = p_user_id)
    )
  ORDER BY relevance_score DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;