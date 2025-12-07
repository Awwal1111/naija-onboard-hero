-- Fix all personalized discovery functions with correct table/column names

-- 1. Fix get_personalized_feed - uses wrong table name 'social_posts', should be 'posts'
DROP FUNCTION IF EXISTS get_personalized_feed(uuid, integer, integer);
CREATE OR REPLACE FUNCTION get_personalized_feed(
  p_user_id UUID,
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  post_id UUID,
  user_id UUID,
  content_type TEXT,
  title TEXT,
  content TEXT,
  media_urls TEXT[],
  metadata JSONB,
  visibility TEXT,
  likes_count INT,
  comments_count INT,
  shares_count INT,
  views_count INT,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  is_pinned BOOLEAN,
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
  -- Get user's profile data for matching
  SELECT pr.state_name, pr.lga_name, pr.profession
  INTO v_user_state, v_user_lga, v_user_profession
  FROM profiles pr WHERE pr.user_id = p_user_id;

  RETURN QUERY
  SELECT
    p.id AS post_id,
    p.user_id,
    p.content_type,
    p.title,
    p.content,
    p.media_urls,
    p.metadata,
    p.visibility,
    p.likes_count,
    p.comments_count,
    p.shares_count,
    p.views_count,
    p.status,
    p.created_at,
    p.updated_at,
    p.is_pinned,
    (
      -- Connection boost (50 points if connected)
      CASE WHEN EXISTS (
        SELECT 1 FROM connections c 
        WHERE (c.user1_id = p_user_id AND c.user2_id = p.user_id)
           OR (c.user2_id = p_user_id AND c.user1_id = p.user_id)
      ) THEN 50 ELSE 0 END
      +
      -- Engagement score (likes + comments weighted)
      (COALESCE(p.likes_count, 0) * 2 + COALESCE(p.comments_count, 0) * 3)
      +
      -- Recency score (newer posts get higher score)
      GREATEST(0, 100 - EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600)
      +
      -- Location similarity
      CASE WHEN pr.state_name = v_user_state THEN 20 
           WHEN pr.lga_name = v_user_lga THEN 30 
           ELSE 0 END
      +
      -- Profession match
      CASE WHEN pr.profession = v_user_profession THEN 25 ELSE 0 END
      +
      -- Expert content boost
      CASE WHEN pr.is_expert = true THEN 15 ELSE 0 END
      +
      -- Trust score boost
      CASE WHEN pr.email_verified = true THEN 5 ELSE 0 END
      + CASE WHEN pr.phone_verified = true THEN 5 ELSE 0 END
      + CASE WHEN pr.face_verified = true THEN 10 ELSE 0 END
      +
      -- Pinned posts boost
      CASE WHEN p.is_pinned = true THEN 20 ELSE 0 END
    )::NUMERIC AS relevance_score
  FROM posts p
  LEFT JOIN profiles pr ON pr.user_id = p.user_id
  WHERE p.status = 'active'
    AND (p.visibility = 'public' OR p.visibility IS NULL OR p.user_id = p_user_id)
  ORDER BY relevance_score DESC, p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 2. Fix get_personalized_experts to use correct profile field references
DROP FUNCTION IF EXISTS get_personalized_experts(uuid, integer, integer);
CREATE OR REPLACE FUNCTION get_personalized_experts(
  p_user_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
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
    ea.id,
    ea.user_id,
    ea.full_name,
    ea.skill_category,
    ea.years_experience,
    ea.location_state,
    ea.location_lga,
    ea.location_area,
    ea.status,
    pr.profile_picture_url,
    pr.bio,
    pr.profession,
    COALESCE(pr.average_rating, 0)::NUMERIC AS average_rating,
    COALESCE(pr.rating_count, 0)::BIGINT AS rating_count,
    COALESCE(pr.is_expert, false) AS is_expert,
    COALESCE(pr.email_verified, false) AS email_verified,
    COALESCE(pr.phone_verified, false) AS phone_verified,
    COALESCE(pr.face_verified, false) AS face_verified,
    (
      -- Skill match
      CASE WHEN ea.skill_category ILIKE '%' || v_user_profession || '%' THEN 30 
           WHEN v_user_profession ILIKE '%' || ea.skill_category || '%' THEN 30
           ELSE 0 END
      +
      -- Location match
      CASE WHEN ea.location_state = v_user_state THEN 15
           WHEN ea.location_lga = v_user_lga THEN 25
           ELSE 0 END
      +
      -- Rating score
      COALESCE(pr.average_rating, 0) * 8
      +
      -- Experience bonus
      LEAST(ea.years_experience * 2, 20)
      +
      -- Trust score
      CASE WHEN pr.email_verified = true THEN 5 ELSE 0 END
      + CASE WHEN pr.phone_verified = true THEN 5 ELSE 0 END
      + CASE WHEN pr.face_verified = true THEN 10 ELSE 0 END
    )::NUMERIC AS relevance_score
  FROM expert_applications ea
  JOIN profiles pr ON pr.user_id = ea.user_id
  WHERE ea.status = 'approved'
  ORDER BY relevance_score DESC, pr.average_rating DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 3. Fix get_personalized_courses
DROP FUNCTION IF EXISTS get_personalized_courses(uuid, integer, integer);
CREATE OR REPLACE FUNCTION get_personalized_courses(
  p_user_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  price NUMERIC,
  course_category TEXT,
  instructor_name TEXT,
  thumbnail_url TEXT,
  average_rating NUMERIC,
  review_count INT,
  enrollment_count INT,
  duration_hours INT,
  level TEXT,
  is_demo BOOLEAN,
  created_at TIMESTAMPTZ,
  relevance_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_profession TEXT;
BEGIN
  SELECT pr.profession INTO v_user_profession
  FROM profiles pr WHERE pr.user_id = p_user_id;

  RETURN QUERY
  SELECT
    c.id,
    c.title,
    c.description,
    c.price,
    c.course_category,
    c.instructor_name,
    c.thumbnail_url,
    COALESCE(c.average_rating, 0)::NUMERIC AS average_rating,
    COALESCE(c.review_count, 0)::INT AS review_count,
    COALESCE(c.enrollment_count, 0)::INT AS enrollment_count,
    c.duration_hours::INT,
    c.level,
    COALESCE(c.is_demo, false) AS is_demo,
    c.created_at,
    (
      -- Category match
      CASE WHEN c.course_category ILIKE '%' || v_user_profession || '%' THEN 30 
           WHEN v_user_profession ILIKE '%' || c.course_category || '%' THEN 30
           ELSE 0 END
      +
      -- Rating score
      COALESCE(c.average_rating, 0) * 10
      +
      -- Enrollment popularity
      LEAST(COALESCE(c.enrollment_count, 0) / 10, 20)
      +
      -- Review count trust
      LEAST(COALESCE(c.review_count, 0), 15)
      +
      -- Recency
      GREATEST(0, 20 - EXTRACT(DAY FROM (NOW() - c.created_at)))
    )::NUMERIC AS relevance_score
  FROM courses c
  WHERE c.status = 'active'
  ORDER BY relevance_score DESC, c.average_rating DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 4. Fix get_personalized_products
DROP FUNCTION IF EXISTS get_personalized_products(uuid, integer, integer);
CREATE OR REPLACE FUNCTION get_personalized_products(
  p_user_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  price NUMERIC,
  category TEXT,
  preview_url TEXT,
  average_rating NUMERIC,
  review_count INT,
  download_count INT,
  is_verified BOOLEAN,
  is_demo BOOLEAN,
  seller_name TEXT,
  seller_picture TEXT,
  relevance_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_profession TEXT;
BEGIN
  SELECT pr.profession INTO v_user_profession
  FROM profiles pr WHERE pr.user_id = p_user_id;

  RETURN QUERY
  SELECT
    dp.id,
    dp.title,
    dp.description,
    dp.price,
    dp.category::TEXT,
    dp.preview_url,
    COALESCE(dp.average_rating, 0)::NUMERIC AS average_rating,
    COALESCE(dp.review_count, 0)::INT AS review_count,
    COALESCE(dp.download_count, 0)::INT AS download_count,
    COALESCE(dp.is_verified, false) AS is_verified,
    COALESCE(dp.is_demo, false) AS is_demo,
    pr.full_name AS seller_name,
    pr.profile_picture_url AS seller_picture,
    (
      -- Category match
      CASE WHEN dp.category::TEXT ILIKE '%' || v_user_profession || '%' THEN 25 
           ELSE 0 END
      +
      -- Rating score
      COALESCE(dp.average_rating, 0) * 10
      +
      -- Download popularity
      LEAST(COALESCE(dp.download_count, 0) / 5, 25)
      +
      -- Verified seller boost
      CASE WHEN dp.is_verified = true THEN 15 ELSE 0 END
      +
      -- Seller trust score
      CASE WHEN pr.email_verified = true THEN 3 ELSE 0 END
      + CASE WHEN pr.phone_verified = true THEN 3 ELSE 0 END
      + CASE WHEN pr.face_verified = true THEN 6 ELSE 0 END
    )::NUMERIC AS relevance_score
  FROM digital_products dp
  JOIN profiles pr ON pr.user_id = dp.user_id
  WHERE dp.status = 'active'
  ORDER BY relevance_score DESC, dp.average_rating DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 5. Fix get_personalized_jobs (jobs table)
DROP FUNCTION IF EXISTS get_personalized_jobs(uuid, integer, integer);
CREATE OR REPLACE FUNCTION get_personalized_jobs(
  p_user_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  budget_min NUMERIC,
  budget_max NUMERIC,
  location TEXT,
  job_type TEXT,
  required_skills TEXT[],
  status TEXT,
  created_at TIMESTAMPTZ,
  poster_id UUID,
  poster_name TEXT,
  poster_picture TEXT,
  poster_profession TEXT,
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
  v_user_skills TEXT[];
BEGIN
  SELECT pr.state_name, pr.lga_name, pr.profession
  INTO v_user_state, v_user_lga, v_user_profession
  FROM profiles pr WHERE pr.user_id = p_user_id;

  RETURN QUERY
  SELECT
    j.id,
    j.title,
    j.description,
    j.budget_min::NUMERIC,
    j.budget_max::NUMERIC,
    j.location,
    j.job_type,
    j.required_skills,
    j.status,
    j.created_at,
    j.user_id AS poster_id,
    pr.full_name AS poster_name,
    pr.profile_picture_url AS poster_picture,
    pr.profession AS poster_profession,
    (
      -- Skill match - check if any required skill matches user profession
      CASE WHEN j.required_skills IS NOT NULL AND v_user_profession IS NOT NULL 
           AND EXISTS (
             SELECT 1 FROM unnest(j.required_skills) skill 
             WHERE skill ILIKE '%' || v_user_profession || '%' 
                OR v_user_profession ILIKE '%' || skill || '%'
           )
           THEN 35 ELSE 0 END
      +
      -- Location match
      CASE WHEN j.location ILIKE '%' || v_user_state || '%' THEN 15
           WHEN j.location ILIKE '%' || v_user_lga || '%' THEN 25
           ELSE 0 END
      +
      -- Budget attractiveness (higher budget = higher score)
      LEAST(COALESCE(j.budget_max, 0) / 5000, 20)
      +
      -- Recency (newer jobs preferred)
      GREATEST(0, 30 - EXTRACT(DAY FROM (NOW() - j.created_at)))
      +
      -- Poster trust score
      CASE WHEN pr.email_verified = true THEN 3 ELSE 0 END
      + CASE WHEN pr.phone_verified = true THEN 3 ELSE 0 END
      + CASE WHEN pr.face_verified = true THEN 6 ELSE 0 END
    )::NUMERIC AS relevance_score
  FROM jobs j
  JOIN profiles pr ON pr.user_id = j.user_id
  WHERE j.status = 'open'
    AND j.user_id != p_user_id
  ORDER BY relevance_score DESC, j.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 6. Fix get_personalized_job_posts
DROP FUNCTION IF EXISTS get_personalized_job_posts(uuid, integer, integer);
CREATE OR REPLACE FUNCTION get_personalized_job_posts(
  p_user_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  company_name TEXT,
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
    jp.id,
    jp.title,
    jp.description,
    jp.company_name,
    jp.location,
    jp.budget_min::NUMERIC,
    jp.budget_max::NUMERIC,
    jp.job_type,
    jp.experience_level,
    jp.required_skills,
    COALESCE(jp.is_remote, false) AS is_remote,
    jp.application_deadline,
    COALESCE(jp.applications_count, 0)::INT AS applications_count,
    COALESCE(jp.views_count, 0)::INT AS views_count,
    jp.created_at,
    jp.user_id,
    pr.full_name AS poster_name,
    pr.profile_picture_url AS poster_picture,
    pr.profession AS poster_profession,
    (
      -- Skill match
      CASE WHEN jp.required_skills IS NOT NULL AND v_user_profession IS NOT NULL 
           AND EXISTS (
             SELECT 1 FROM unnest(jp.required_skills) skill 
             WHERE skill ILIKE '%' || v_user_profession || '%' 
                OR v_user_profession ILIKE '%' || skill || '%'
           )
           THEN 35 ELSE 0 END
      +
      -- Location match
      CASE WHEN jp.location ILIKE '%' || v_user_state || '%' THEN 15
           WHEN jp.location ILIKE '%' || v_user_lga || '%' THEN 25
           ELSE 0 END
      +
      -- Remote work preference bonus
      CASE WHEN jp.is_remote = true THEN 10 ELSE 0 END
      +
      -- Budget
      LEAST(COALESCE(jp.budget_max, 0) / 5000, 20)
      +
      -- Recency
      GREATEST(0, 30 - EXTRACT(DAY FROM (NOW() - jp.created_at)))
      +
      -- Poster trust
      CASE WHEN pr.email_verified = true THEN 3 ELSE 0 END
      + CASE WHEN pr.phone_verified = true THEN 3 ELSE 0 END
      + CASE WHEN pr.face_verified = true THEN 6 ELSE 0 END
    )::NUMERIC AS relevance_score
  FROM job_posts jp
  JOIN profiles pr ON pr.user_id = jp.user_id
  WHERE jp.status = 'open'
    AND jp.user_id != p_user_id
  ORDER BY relevance_score DESC, jp.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 7. Fix get_personalized_fundraisings
DROP FUNCTION IF EXISTS get_personalized_fundraisings(uuid, integer, integer);
CREATE OR REPLACE FUNCTION get_personalized_fundraisings(
  p_user_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  goal_amount NUMERIC,
  raised_amount NUMERIC,
  category TEXT,
  location TEXT,
  featured_image_url TEXT,
  deadline TIMESTAMPTZ,
  backer_count INT,
  is_verified BOOLEAN,
  creator_id UUID,
  creator_name TEXT,
  creator_picture TEXT,
  progress_percent NUMERIC,
  relevance_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_state TEXT;
  v_user_lga TEXT;
BEGIN
  SELECT pr.state_name, pr.lga_name
  INTO v_user_state, v_user_lga
  FROM profiles pr WHERE pr.user_id = p_user_id;

  RETURN QUERY
  SELECT
    f.id,
    f.title,
    f.description,
    f.goal_amount,
    COALESCE(f.raised_amount, 0)::NUMERIC AS raised_amount,
    f.category,
    f.location,
    f.featured_image_url,
    f.deadline,
    COALESCE(f.backer_count, 0)::INT AS backer_count,
    COALESCE(f.is_verified, false) AS is_verified,
    f.user_id AS creator_id,
    pr.full_name AS creator_name,
    pr.profile_picture_url AS creator_picture,
    CASE WHEN f.goal_amount > 0 
         THEN (COALESCE(f.raised_amount, 0) / f.goal_amount * 100)::NUMERIC 
         ELSE 0 END AS progress_percent,
    (
      -- Location match
      CASE WHEN f.location ILIKE '%' || v_user_state || '%' THEN 20
           WHEN f.location ILIKE '%' || v_user_lga || '%' THEN 30
           ELSE 0 END
      +
      -- Urgency (deadline approaching)
      CASE WHEN f.deadline IS NOT NULL AND f.deadline > NOW() 
           AND f.deadline < NOW() + INTERVAL '7 days' THEN 25
           WHEN f.deadline IS NOT NULL AND f.deadline > NOW() 
           AND f.deadline < NOW() + INTERVAL '30 days' THEN 15
           ELSE 0 END
      +
      -- Progress momentum
      CASE WHEN f.goal_amount > 0 AND f.raised_amount > 0 THEN
           LEAST((f.raised_amount / f.goal_amount * 100), 25)
           ELSE 0 END
      +
      -- Verified boost
      CASE WHEN f.is_verified = true THEN 15 ELSE 0 END
      +
      -- Backer social proof
      LEAST(COALESCE(f.backer_count, 0) * 2, 20)
      +
      -- Creator trust
      CASE WHEN pr.email_verified = true THEN 3 ELSE 0 END
      + CASE WHEN pr.phone_verified = true THEN 3 ELSE 0 END
      + CASE WHEN pr.face_verified = true THEN 6 ELSE 0 END
    )::NUMERIC AS relevance_score
  FROM fundraisings f
  JOIN profiles pr ON pr.user_id = f.user_id
  WHERE f.status = 'approved'
  ORDER BY relevance_score DESC, f.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 8. Fix get_personalized_gigs
DROP FUNCTION IF EXISTS get_personalized_gigs(uuid, integer, integer);
CREATE OR REPLACE FUNCTION get_personalized_gigs(
  p_user_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  price NUMERIC,
  category TEXT,
  photo_urls TEXT[],
  status TEXT,
  created_at TIMESTAMPTZ,
  seller_id UUID,
  seller_name TEXT,
  seller_picture TEXT,
  seller_rating NUMERIC,
  seller_is_expert BOOLEAN,
  relevance_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_profession TEXT;
BEGIN
  SELECT pr.profession INTO v_user_profession
  FROM profiles pr WHERE pr.user_id = p_user_id;

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
    js.user_id AS seller_id,
    pr.full_name AS seller_name,
    pr.profile_picture_url AS seller_picture,
    COALESCE(pr.average_rating, 0)::NUMERIC AS seller_rating,
    COALESCE(pr.is_expert, false) AS seller_is_expert,
    (
      -- Category match
      CASE WHEN js.category ILIKE '%' || v_user_profession || '%' THEN 25 
           WHEN v_user_profession ILIKE '%' || js.category || '%' THEN 25
           ELSE 0 END
      +
      -- Seller rating
      COALESCE(pr.average_rating, 0) * 8
      +
      -- Expert seller boost
      CASE WHEN pr.is_expert = true THEN 15 ELSE 0 END
      +
      -- Price competitiveness (lower price = higher score for buyers)
      GREATEST(0, 20 - (js.price / 1000))
      +
      -- Recency
      GREATEST(0, 20 - EXTRACT(DAY FROM (NOW() - js.created_at)))
      +
      -- Seller trust
      CASE WHEN pr.email_verified = true THEN 3 ELSE 0 END
      + CASE WHEN pr.phone_verified = true THEN 3 ELSE 0 END
      + CASE WHEN pr.face_verified = true THEN 6 ELSE 0 END
    )::NUMERIC AS relevance_score
  FROM jobs_services js
  JOIN profiles pr ON pr.user_id = js.user_id
  WHERE js.status = 'active'
    AND js.user_id != p_user_id
  ORDER BY relevance_score DESC, js.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 9. Add get_personalized_connections function
DROP FUNCTION IF EXISTS get_personalized_connections(uuid, integer, integer);
CREATE OR REPLACE FUNCTION get_personalized_connections(
  p_user_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
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
      -- Profession match
      CASE WHEN pr.profession ILIKE '%' || v_user_profession || '%' THEN 25 
           WHEN v_user_profession ILIKE '%' || pr.profession || '%' THEN 25
           ELSE 0 END
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

-- 10. Add get_personalized_groups function
DROP FUNCTION IF EXISTS get_personalized_groups(uuid, integer, integer);
CREATE OR REPLACE FUNCTION get_personalized_groups(
  p_user_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  category TEXT,
  state_name TEXT,
  lga_name TEXT,
  area TEXT,
  member_count INT,
  group_lead_id UUID,
  group_lead_name TEXT,
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
    g.id,
    g.name,
    g.description,
    g.category::TEXT,
    g.state_name,
    g.lga_name,
    g.area,
    COALESCE(g.member_count, 0)::INT AS member_count,
    g.group_lead_id,
    pr.full_name AS group_lead_name,
    (
      -- Location match
      CASE WHEN g.state_name = v_user_state THEN 20
           WHEN g.lga_name = v_user_lga THEN 35
           ELSE 0 END
      +
      -- Category/profession match
      CASE WHEN g.category::TEXT ILIKE '%' || v_user_profession || '%' THEN 30 
           WHEN v_user_profession ILIKE '%' || g.category::TEXT || '%' THEN 30
           ELSE 0 END
      +
      -- Member popularity
      LEAST(COALESCE(g.member_count, 0) / 5, 25)
    )::NUMERIC AS relevance_score
  FROM groups g
  LEFT JOIN profiles pr ON pr.user_id = g.group_lead_id
  WHERE g.is_active = true
    -- Exclude groups user is already member of
    AND NOT EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = g.id AND gm.user_id = p_user_id AND gm.is_active = true
    )
  ORDER BY relevance_score DESC, g.member_count DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;