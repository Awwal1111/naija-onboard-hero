-- Drop existing functions first, then recreate with fixes
DROP FUNCTION IF EXISTS public.get_personalized_experts(UUID, INT, INT);
DROP FUNCTION IF EXISTS public.get_personalized_feed(UUID, INT, INT);
DROP FUNCTION IF EXISTS public.get_personalized_courses(UUID, INT, INT);
DROP FUNCTION IF EXISTS public.get_personalized_products(UUID, INT, INT);
DROP FUNCTION IF EXISTS public.get_personalized_jobs(UUID, INT, INT);
DROP FUNCTION IF EXISTS public.get_personalized_fundraisings(UUID, INT, INT);
DROP FUNCTION IF EXISTS public.get_personalized_gigs(UUID, INT, INT);

-- Fix get_personalized_experts
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
  rating_count INT,
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
  WITH expert_scores AS (
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
        LEAST(COALESCE(p.rating_count, 0), 15) +
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
  )
  SELECT * FROM expert_scores
  ORDER BY relevance_score DESC, expert_scores.average_rating DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Fix get_personalized_feed
CREATE FUNCTION public.get_personalized_feed(
  p_user_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  post_id UUID,
  user_id UUID,
  content TEXT,
  media_urls TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  likes_count INT,
  comments_count INT,
  shares_count INT,
  views_count INT,
  hashtags TEXT[],
  mentions TEXT[],
  post_type TEXT,
  visibility TEXT,
  is_pinned BOOLEAN,
  full_name TEXT,
  profession TEXT,
  profile_picture_url TEXT,
  user_reaction TEXT,
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
  WITH user_connections AS (
    SELECT 
      CASE WHEN c.user1_id = p_user_id THEN c.user2_id ELSE c.user1_id END AS connected_user_id
    FROM connections c
    WHERE (c.user1_id = p_user_id OR c.user2_id = p_user_id)
    AND c.status = 'active'
  ),
  post_scores AS (
    SELECT 
      sp.id AS post_id,
      sp.user_id,
      sp.content,
      sp.media_urls,
      sp.created_at,
      sp.updated_at,
      COALESCE(sp.likes_count, 0) AS likes_count,
      COALESCE(sp.comments_count, 0) AS comments_count,
      COALESCE(sp.shares_count, 0) AS shares_count,
      COALESCE(sp.views_count, 0) AS views_count,
      sp.hashtags,
      sp.mentions,
      sp.post_type,
      sp.visibility,
      COALESCE(sp.is_pinned, false) AS is_pinned,
      pr.full_name,
      pr.profession,
      pr.profile_picture_url,
      pl.reaction_type AS user_reaction,
      (
        CASE WHEN EXISTS (SELECT 1 FROM user_connections uc WHERE uc.connected_user_id = sp.user_id) THEN 50 ELSE 0 END +
        LEAST((COALESCE(sp.likes_count, 0) * 2) + (COALESCE(sp.comments_count, 0) * 3) + COALESCE(sp.shares_count, 0), 30) +
        GREATEST(20 - EXTRACT(DAY FROM (NOW() - sp.created_at))::INT, 0) +
        CASE WHEN v_user_state IS NOT NULL AND pr.state_name = v_user_state THEN 15 ELSE 0 END +
        CASE WHEN v_user_profession IS NOT NULL AND 
             (pr.profession ILIKE '%' || v_user_profession || '%' OR
              v_user_profession ILIKE '%' || pr.profession || '%')
        THEN 10 ELSE 0 END +
        CASE WHEN pr.email_verified = true THEN 2 ELSE 0 END +
        CASE WHEN pr.phone_verified = true THEN 3 ELSE 0 END +
        CASE WHEN pr.face_verified = true THEN 5 ELSE 0 END +
        CASE WHEN pr.is_expert = true THEN 5 ELSE 0 END +
        CASE WHEN NOT EXISTS (SELECT 1 FROM post_views pv WHERE pv.post_id = sp.id AND pv.user_id = p_user_id) THEN 10 ELSE 0 END +
        CASE WHEN sp.is_pinned = true THEN 20 ELSE 0 END
      )::NUMERIC AS relevance_score
    FROM social_posts sp
    LEFT JOIN profiles pr ON pr.user_id = sp.user_id
    LEFT JOIN post_likes pl ON pl.post_id = sp.id AND pl.user_id = p_user_id
    WHERE sp.visibility IN ('public', 'connections')
    AND sp.user_id != p_user_id
  )
  SELECT * FROM post_scores
  ORDER BY relevance_score DESC, post_scores.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Fix get_personalized_courses
CREATE FUNCTION public.get_personalized_courses(
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
  SELECT pr.profession INTO v_user_profession FROM profiles pr WHERE pr.user_id = p_user_id;

  RETURN QUERY
  SELECT 
    c.id,
    c.title,
    c.description,
    c.price,
    c.course_category,
    c.instructor_name,
    c.thumbnail_url,
    COALESCE(c.average_rating, 0) AS average_rating,
    COALESCE(c.review_count, 0) AS review_count,
    COALESCE(c.enrollment_count, 0) AS enrollment_count,
    c.duration_hours,
    c.level,
    COALESCE(c.is_demo, false) AS is_demo,
    c.created_at,
    (
      10 +
      CASE WHEN v_user_profession IS NOT NULL AND 
           (c.course_category ILIKE '%' || v_user_profession || '%' OR
            c.title ILIKE '%' || v_user_profession || '%')
      THEN 30 ELSE 0 END +
      (COALESCE(c.average_rating, 0) * 5) +
      LEAST(COALESCE(c.enrollment_count, 0) / 10, 20) +
      GREATEST(15 - EXTRACT(DAY FROM (NOW() - c.created_at))::INT / 7, 0)
    )::NUMERIC AS relevance_score
  FROM courses c
  WHERE c.status = 'active'
  ORDER BY relevance_score DESC, c.average_rating DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Fix get_personalized_products
CREATE FUNCTION public.get_personalized_products(
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
  SELECT pr.profession INTO v_user_profession FROM profiles pr WHERE pr.user_id = p_user_id;

  RETURN QUERY
  SELECT 
    dp.id,
    dp.title,
    dp.description,
    dp.price,
    dp.category::TEXT,
    dp.preview_url,
    COALESCE(dp.average_rating, 0) AS average_rating,
    COALESCE(dp.review_count, 0) AS review_count,
    COALESCE(dp.download_count, 0) AS download_count,
    COALESCE(dp.is_verified, false) AS is_verified,
    COALESCE(dp.is_demo, false) AS is_demo,
    pr.full_name AS seller_name,
    pr.profile_picture_url AS seller_picture,
    (
      10 +
      CASE WHEN v_user_profession IS NOT NULL AND dp.category::TEXT ILIKE '%' || v_user_profession || '%' THEN 25 ELSE 0 END +
      (COALESCE(dp.average_rating, 0) * 5) +
      LEAST(COALESCE(dp.download_count, 0) / 5, 20) +
      CASE WHEN COALESCE(dp.is_verified, false) THEN 10 ELSE 0 END +
      CASE WHEN pr.is_expert = true THEN 10 ELSE 0 END
    )::NUMERIC AS relevance_score
  FROM digital_products dp
  LEFT JOIN profiles pr ON pr.user_id = dp.user_id
  WHERE dp.status = 'active'
  ORDER BY relevance_score DESC, dp.average_rating DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Fix get_personalized_jobs
CREATE FUNCTION public.get_personalized_jobs(
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
  v_user_profession TEXT;
BEGIN
  SELECT pr.state_name, pr.profession INTO v_user_state, v_user_profession FROM profiles pr WHERE pr.user_id = p_user_id;

  RETURN QUERY
  SELECT 
    j.id,
    j.title,
    j.description,
    j.budget_min,
    j.budget_max,
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
      10 +
      CASE WHEN v_user_profession IS NOT NULL AND 
           (j.title ILIKE '%' || v_user_profession || '%' OR
            j.description ILIKE '%' || v_user_profession || '%')
      THEN 30 ELSE 0 END +
      CASE WHEN v_user_state IS NOT NULL AND j.location ILIKE '%' || v_user_state || '%' THEN 15 ELSE 0 END +
      CASE WHEN j.budget_max IS NOT NULL THEN LEAST(j.budget_max / 10000, 15) ELSE 5 END +
      GREATEST(20 - EXTRACT(DAY FROM (NOW() - j.created_at))::INT, 0) +
      CASE WHEN pr.is_expert = true THEN 10 ELSE 0 END
    )::NUMERIC AS relevance_score
  FROM jobs j
  LEFT JOIN profiles pr ON pr.user_id = j.user_id
  WHERE j.status = 'open'
  ORDER BY relevance_score DESC, j.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Fix get_personalized_fundraisings
CREATE FUNCTION public.get_personalized_fundraisings(
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
BEGIN
  SELECT pr.state_name INTO v_user_state FROM profiles pr WHERE pr.user_id = p_user_id;

  RETURN QUERY
  SELECT 
    f.id,
    f.title,
    f.description,
    f.goal_amount,
    COALESCE(f.raised_amount, 0) AS raised_amount,
    f.category,
    f.location,
    f.featured_image_url,
    f.deadline,
    COALESCE(f.backer_count, 0) AS backer_count,
    COALESCE(f.is_verified, false) AS is_verified,
    f.user_id AS creator_id,
    pr.full_name AS creator_name,
    pr.profile_picture_url AS creator_picture,
    CASE WHEN f.goal_amount > 0 THEN (COALESCE(f.raised_amount, 0) / f.goal_amount) * 100 ELSE 0 END AS progress_percent,
    (
      10 +
      CASE WHEN v_user_state IS NOT NULL AND f.location ILIKE '%' || v_user_state || '%' THEN 20 ELSE 0 END +
      CASE WHEN f.deadline IS NOT NULL AND f.deadline < NOW() + INTERVAL '7 days' THEN 15 ELSE 0 END +
      CASE WHEN COALESCE(f.is_verified, false) THEN 15 ELSE 0 END +
      LEAST(COALESCE(f.backer_count, 0), 20) +
      CASE WHEN f.goal_amount > 0 THEN LEAST((COALESCE(f.raised_amount, 0) / f.goal_amount) * 20, 20) ELSE 0 END +
      CASE WHEN pr.is_expert = true THEN 10 ELSE 0 END
    )::NUMERIC AS relevance_score
  FROM fundraisings f
  LEFT JOIN profiles pr ON pr.user_id = f.user_id
  WHERE f.status = 'approved'
  ORDER BY relevance_score DESC, f.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Fix get_personalized_gigs
CREATE FUNCTION public.get_personalized_gigs(
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
  SELECT pr.profession INTO v_user_profession FROM profiles pr WHERE pr.user_id = p_user_id;

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
    COALESCE(pr.average_rating, 0) AS seller_rating,
    COALESCE(pr.is_expert, false) AS seller_is_expert,
    (
      10 +
      CASE WHEN v_user_profession IS NOT NULL AND 
           (js.category ILIKE '%' || v_user_profession || '%' OR
            js.title ILIKE '%' || v_user_profession || '%')
      THEN 25 ELSE 0 END +
      (COALESCE(pr.average_rating, 0) * 4) +
      CASE WHEN COALESCE(pr.is_expert, false) THEN 15 ELSE 0 END +
      GREATEST(15 - EXTRACT(DAY FROM (NOW() - js.created_at))::INT / 2, 0) +
      CASE WHEN pr.face_verified = true THEN 10 ELSE 0 END
    )::NUMERIC AS relevance_score
  FROM jobs_services js
  LEFT JOIN profiles pr ON pr.user_id = js.user_id
  WHERE js.status = 'active'
  ORDER BY relevance_score DESC, js.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;