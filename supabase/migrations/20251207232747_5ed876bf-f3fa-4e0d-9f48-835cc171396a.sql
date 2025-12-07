-- Create personalized connection suggestions function
CREATE OR REPLACE FUNCTION get_personalized_connections(p_user_id UUID, p_limit INT DEFAULT 20, p_offset INT DEFAULT 0)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  profession TEXT,
  profile_picture_url TEXT,
  state_name TEXT,
  lga_name TEXT,
  is_expert BOOLEAN,
  average_rating NUMERIC,
  relevance_score INT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_profession TEXT;
  v_user_state TEXT;
  v_user_lga TEXT;
BEGIN
  -- Get user's profile info
  SELECT pr.profession, pr.state_name, pr.lga_name 
  INTO v_user_profession, v_user_state, v_user_lga
  FROM profiles pr WHERE pr.user_id = p_user_id;

  RETURN QUERY
  SELECT 
    pr.user_id,
    pr.full_name,
    pr.profession,
    pr.profile_picture_url,
    pr.state_name,
    pr.lga_name,
    pr.is_expert,
    pr.average_rating,
    (
      -- Same profession (15 points)
      CASE WHEN v_user_profession IS NOT NULL AND pr.profession = v_user_profession THEN 15 ELSE 0 END +
      -- Same state (10 points)
      CASE WHEN v_user_state IS NOT NULL AND pr.state_name = v_user_state THEN 10 ELSE 0 END +
      -- Same LGA (8 points)
      CASE WHEN v_user_lga IS NOT NULL AND pr.lga_name = v_user_lga THEN 8 ELSE 0 END +
      -- Is expert (5 points)
      CASE WHEN pr.is_expert = true THEN 5 ELSE 0 END +
      -- High rating (up to 5 points)
      COALESCE(pr.average_rating::INT, 0) +
      -- Trust score bonus
      CASE WHEN pr.email_verified = true THEN 3 ELSE 0 END +
      CASE WHEN pr.phone_verified = true THEN 3 ELSE 0 END +
      CASE WHEN pr.face_verified = true THEN 5 ELSE 0 END
    )::INT as relevance_score
  FROM profiles pr
  WHERE pr.user_id != p_user_id
    -- Exclude existing connections
    AND NOT EXISTS (
      SELECT 1 FROM connections c 
      WHERE (c.user1_id = p_user_id AND c.user2_id = pr.user_id)
         OR (c.user2_id = p_user_id AND c.user1_id = pr.user_id)
    )
    -- Exclude pending requests
    AND NOT EXISTS (
      SELECT 1 FROM connection_requests cr
      WHERE (cr.requester_id = p_user_id AND cr.requested_id = pr.user_id)
         OR (cr.requested_id = p_user_id AND cr.requester_id = pr.user_id)
    )
  ORDER BY relevance_score DESC, pr.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Create personalized job posts function (for JobsEnhanced page)
CREATE OR REPLACE FUNCTION get_personalized_job_posts(p_user_id UUID, p_limit INT DEFAULT 20, p_offset INT DEFAULT 0)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  company_name TEXT,
  company_logo_url TEXT,
  location TEXT,
  budget_min NUMERIC,
  budget_max NUMERIC,
  job_type TEXT,
  experience_level TEXT,
  required_skills TEXT[],
  is_remote BOOLEAN,
  application_deadline TIMESTAMPTZ,
  applications_count INT,
  views_count INT,
  created_at TIMESTAMPTZ,
  user_id UUID,
  poster_name TEXT,
  poster_picture TEXT,
  poster_profession TEXT,
  relevance_score INT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_skills TEXT[];
  v_user_state TEXT;
  v_user_profession TEXT;
BEGIN
  -- Get user's profile and skills
  SELECT pr.state_name, pr.profession
  INTO v_user_state, v_user_profession
  FROM profiles pr WHERE pr.user_id = p_user_id;

  -- Get user's skills
  SELECT ARRAY_AGG(s.skill_name) INTO v_user_skills
  FROM skills s WHERE s.user_id = p_user_id;

  RETURN QUERY
  SELECT 
    jp.id,
    jp.title,
    jp.description,
    jp.company_name,
    jp.company_logo_url,
    jp.location,
    jp.budget_min,
    jp.budget_max,
    jp.job_type,
    jp.experience_level,
    jp.required_skills,
    jp.is_remote,
    jp.application_deadline,
    jp.applications_count,
    jp.views_count,
    jp.created_at,
    jp.user_id,
    pr.full_name as poster_name,
    pr.profile_picture_url as poster_picture,
    pr.profession as poster_profession,
    (
      -- Skill match (20 points max)
      CASE WHEN v_user_skills IS NOT NULL AND jp.required_skills IS NOT NULL 
           AND jp.required_skills && v_user_skills THEN 20 ELSE 0 END +
      -- Location match (15 points)
      CASE WHEN v_user_state IS NOT NULL AND jp.location ILIKE '%' || v_user_state || '%' THEN 15 ELSE 0 END +
      -- Remote job bonus (10 points)
      CASE WHEN jp.is_remote = true THEN 10 ELSE 0 END +
      -- Higher budget priority
      CASE WHEN jp.budget_max > 100000 THEN 8
           WHEN jp.budget_max > 50000 THEN 5
           ELSE 2 END +
      -- Recency (newer = better)
      CASE WHEN jp.created_at > NOW() - INTERVAL '1 day' THEN 15
           WHEN jp.created_at > NOW() - INTERVAL '3 days' THEN 10
           WHEN jp.created_at > NOW() - INTERVAL '7 days' THEN 5
           ELSE 0 END +
      -- Application deadline urgency
      CASE WHEN jp.application_deadline IS NOT NULL 
           AND jp.application_deadline > NOW() 
           AND jp.application_deadline < NOW() + INTERVAL '7 days' THEN 10 
           ELSE 0 END +
      -- Poster trust score
      CASE WHEN pr.is_expert = true THEN 5 ELSE 0 END +
      CASE WHEN pr.email_verified = true THEN 2 ELSE 0 END
    )::INT as relevance_score
  FROM job_posts jp
  LEFT JOIN profiles pr ON pr.user_id = jp.user_id
  WHERE jp.status = 'open'
    AND jp.user_id != p_user_id
    -- Not already applied
    AND NOT EXISTS (
      SELECT 1 FROM job_post_applications jpa 
      WHERE jpa.job_post_id = jp.id AND jpa.applicant_id = p_user_id
    )
  ORDER BY relevance_score DESC, jp.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;