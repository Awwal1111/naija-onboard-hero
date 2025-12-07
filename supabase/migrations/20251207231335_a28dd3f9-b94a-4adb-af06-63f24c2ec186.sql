-- ============================================
-- PERSONALIZED DISCOVERY ALGORITHMS
-- ============================================

-- 1. PERSONALIZED EXPERTS DISCOVERY
-- ============================================
CREATE OR REPLACE FUNCTION public.get_personalized_experts(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id TEXT,
  user_id UUID,
  full_name TEXT,
  skill_category TEXT,
  years_experience INTEGER,
  location_state TEXT,
  location_lga TEXT,
  location_area TEXT,
  status TEXT,
  profile_picture_url TEXT,
  bio TEXT,
  profession TEXT,
  average_rating NUMERIC,
  rating_count INTEGER,
  is_expert BOOLEAN,
  email_verified BOOLEAN,
  phone_verified BOOLEAN,
  face_verified BOOLEAN,
  relevance_score NUMERIC
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_state TEXT;
  v_user_lga TEXT;
  v_user_profession TEXT;
BEGIN
  -- Get user's profile data for personalization
  SELECT state_name, lga_name, profession
  INTO v_user_state, v_user_lga, v_user_profession
  FROM profiles WHERE profiles.user_id = p_user_id;

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
        -- Base score
        10 +
        -- Experience boost (up to 20 pts)
        LEAST(ea.years_experience * 2, 20) +
        -- Rating boost (up to 25 pts)
        (COALESCE(p.average_rating, 0) * 5) +
        -- Rating count boost (up to 15 pts)
        LEAST(COALESCE(p.rating_count, 0), 15) +
        -- Skill match boost (30 pts)
        CASE WHEN v_user_profession IS NOT NULL AND 
             (ea.skill_category ILIKE '%' || v_user_profession || '%' OR
              v_user_profession ILIKE '%' || ea.skill_category || '%')
        THEN 30 ELSE 0 END +
        -- Same state boost (15 pts)
        CASE WHEN v_user_state IS NOT NULL AND ea.location_state = v_user_state THEN 15 ELSE 0 END +
        -- Same LGA boost (additional 10 pts)
        CASE WHEN v_user_lga IS NOT NULL AND ea.location_lga = v_user_lga THEN 10 ELSE 0 END +
        -- Trust Score boost (verification)
        CASE WHEN COALESCE(p.email_verified, false) THEN 5 ELSE 0 END +
        CASE WHEN COALESCE(p.phone_verified, false) THEN 5 ELSE 0 END +
        CASE WHEN COALESCE(p.face_verified, false) THEN 10 ELSE 0 END +
        -- Top rated boost (rating >= 4.5 with 5+ reviews)
        CASE WHEN COALESCE(p.average_rating, 0) >= 4.5 AND COALESCE(p.rating_count, 0) >= 5 THEN 15 ELSE 0 END
      )::NUMERIC AS relevance_score
    FROM expert_applications ea
    LEFT JOIN profiles p ON p.user_id = ea.user_id
    WHERE ea.status = 'approved'
    AND p.user_id IS NOT NULL
  )
  SELECT * FROM expert_scores
  ORDER BY relevance_score DESC, average_rating DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 2. PERSONALIZED COURSES DISCOVERY
-- ============================================
CREATE OR REPLACE FUNCTION public.get_personalized_courses(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
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
  review_count INTEGER,
  enrollment_count INTEGER,
  duration_hours INTEGER,
  level TEXT,
  is_demo BOOLEAN,
  created_at TIMESTAMPTZ,
  relevance_score NUMERIC
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_profession TEXT;
  v_user_enrolled_categories TEXT[];
BEGIN
  -- Get user's profession
  SELECT profession INTO v_user_profession
  FROM profiles WHERE profiles.user_id = p_user_id;

  -- Get categories user has enrolled in
  SELECT ARRAY_AGG(DISTINCT c.course_category)
  INTO v_user_enrolled_categories
  FROM course_enrollments ce
  JOIN courses c ON c.id = ce.course_id
  WHERE ce.student_id = p_user_id;

  RETURN QUERY
  WITH course_scores AS (
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
        -- Base score
        10 +
        -- Rating boost (up to 25 pts)
        (COALESCE(c.average_rating, 0) * 5) +
        -- Review count boost (up to 15 pts)
        LEAST(COALESCE(c.review_count, 0) * 1.5, 15) +
        -- Enrollment popularity boost (up to 20 pts)
        LEAST(COALESCE(c.enrollment_count, 0) * 0.2, 20) +
        -- Category match with profession (25 pts)
        CASE WHEN v_user_profession IS NOT NULL AND 
             c.course_category ILIKE '%' || v_user_profession || '%'
        THEN 25 ELSE 0 END +
        -- Related to user's previous enrollments (20 pts)
        CASE WHEN v_user_enrolled_categories IS NOT NULL AND 
             c.course_category = ANY(v_user_enrolled_categories)
        THEN 20 ELSE 0 END +
        -- Recency boost (up to 15 pts for courses in last 30 days)
        GREATEST(0, 15 - EXTRACT(DAY FROM (NOW() - c.created_at)))::NUMERIC +
        -- Non-demo boost (10 pts)
        CASE WHEN NOT COALESCE(c.is_demo, false) THEN 10 ELSE 0 END +
        -- Has content boost (5 pts)
        CASE WHEN c.course_urls IS NOT NULL AND jsonb_array_length(c.course_urls) > 0 THEN 5 ELSE 0 END
      )::NUMERIC AS relevance_score
    FROM courses c
    WHERE c.status = 'active'
    -- Exclude courses user is already enrolled in
    AND NOT EXISTS (
      SELECT 1 FROM course_enrollments ce 
      WHERE ce.course_id = c.id AND ce.student_id = p_user_id
    )
  )
  SELECT * FROM course_scores
  ORDER BY relevance_score DESC, average_rating DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 3. PERSONALIZED DIGITAL PRODUCTS DISCOVERY
-- ============================================
CREATE OR REPLACE FUNCTION public.get_personalized_products(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  price NUMERIC,
  category TEXT,
  preview_url TEXT,
  average_rating NUMERIC,
  review_count INTEGER,
  download_count INTEGER,
  is_verified BOOLEAN,
  is_demo BOOLEAN,
  seller_name TEXT,
  seller_picture TEXT,
  relevance_score NUMERIC
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_profession TEXT;
  v_purchased_categories TEXT[];
BEGIN
  -- Get user's profession
  SELECT profession INTO v_user_profession
  FROM profiles WHERE profiles.user_id = p_user_id;

  -- Get categories user has purchased from
  SELECT ARRAY_AGG(DISTINCT dp.category::TEXT)
  INTO v_purchased_categories
  FROM digital_product_purchases dpp
  JOIN digital_products dp ON dp.id = dpp.product_id
  WHERE dpp.buyer_id = p_user_id;

  RETURN QUERY
  WITH product_scores AS (
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
      p.full_name AS seller_name,
      p.profile_picture_url AS seller_picture,
      (
        -- Base score
        10 +
        -- Rating boost (up to 25 pts)
        (COALESCE(dp.average_rating, 0) * 5) +
        -- Review count boost (up to 15 pts)
        LEAST(COALESCE(dp.review_count, 0) * 1.5, 15) +
        -- Download popularity boost (up to 20 pts)
        LEAST(COALESCE(dp.download_count, 0) * 0.1, 20) +
        -- Verified seller boost (15 pts)
        CASE WHEN COALESCE(dp.is_verified, false) THEN 15 ELSE 0 END +
        -- Category match with previous purchases (25 pts)
        CASE WHEN v_purchased_categories IS NOT NULL AND 
             dp.category::TEXT = ANY(v_purchased_categories)
        THEN 25 ELSE 0 END +
        -- Category match with profession (20 pts)
        CASE WHEN v_user_profession IS NOT NULL AND 
             dp.category::TEXT ILIKE '%' || v_user_profession || '%'
        THEN 20 ELSE 0 END +
        -- Non-demo boost (10 pts)
        CASE WHEN NOT COALESCE(dp.is_demo, false) THEN 10 ELSE 0 END +
        -- Recency boost (up to 10 pts)
        GREATEST(0, 10 - EXTRACT(DAY FROM (NOW() - dp.created_at)) / 3)::NUMERIC +
        -- Seller trust score boost
        CASE WHEN COALESCE(p.face_verified, false) THEN 10 ELSE 0 END +
        CASE WHEN COALESCE(p.is_expert, false) THEN 5 ELSE 0 END
      )::NUMERIC AS relevance_score
    FROM digital_products dp
    LEFT JOIN profiles p ON p.user_id = dp.user_id
    WHERE dp.status = 'active'
    -- Exclude products user already owns
    AND NOT EXISTS (
      SELECT 1 FROM digital_product_purchases dpp 
      WHERE dpp.product_id = dp.id AND dpp.buyer_id = p_user_id
    )
  )
  SELECT * FROM product_scores
  ORDER BY relevance_score DESC, average_rating DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 4. PERSONALIZED JOBS/GIGS DISCOVERY
-- ============================================
CREATE OR REPLACE FUNCTION public.get_personalized_jobs(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
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
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_state TEXT;
  v_user_lga TEXT;
  v_user_profession TEXT;
  v_user_skills TEXT[];
BEGIN
  -- Get user's profile data
  SELECT state_name, lga_name, profession
  INTO v_user_state, v_user_lga, v_user_profession
  FROM profiles WHERE profiles.user_id = p_user_id;

  -- Get user's skills from their expert application if exists
  SELECT string_to_array(skill_category, ',')
  INTO v_user_skills
  FROM expert_applications
  WHERE expert_applications.user_id = p_user_id AND status = 'approved'
  LIMIT 1;

  RETURN QUERY
  WITH job_scores AS (
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
      p.full_name AS poster_name,
      p.profile_picture_url AS poster_picture,
      p.profession AS poster_profession,
      (
        -- Base score
        10 +
        -- Skill match boost (up to 40 pts)
        CASE 
          WHEN j.required_skills IS NOT NULL AND v_user_profession IS NOT NULL THEN
            CASE WHEN EXISTS (
              SELECT 1 FROM unnest(j.required_skills) skill 
              WHERE skill ILIKE '%' || v_user_profession || '%'
                 OR v_user_profession ILIKE '%' || skill || '%'
            ) THEN 40 ELSE 0 END
          ELSE 0
        END +
        -- Location match boost (state)
        CASE WHEN v_user_state IS NOT NULL AND j.location ILIKE '%' || v_user_state || '%' THEN 20 ELSE 0 END +
        -- Location match boost (LGA)  
        CASE WHEN v_user_lga IS NOT NULL AND j.location ILIKE '%' || v_user_lga || '%' THEN 10 ELSE 0 END +
        -- Budget attractiveness (higher pay = higher score, up to 25 pts)
        LEAST(COALESCE(j.budget_min, 0) / 5000, 25)::NUMERIC +
        -- Recency boost (up to 30 pts for jobs in last 7 days)
        GREATEST(0, 30 - EXTRACT(DAY FROM (NOW() - j.created_at)) * 4)::NUMERIC +
        -- Poster trust score boost
        CASE WHEN COALESCE(p.face_verified, false) THEN 10 ELSE 0 END +
        CASE WHEN COALESCE(p.is_expert, false) THEN 5 ELSE 0 END +
        CASE WHEN COALESCE(p.average_rating, 0) >= 4.0 THEN 10 ELSE 0 END
      )::NUMERIC AS relevance_score
    FROM jobs j
    LEFT JOIN profiles p ON p.user_id = j.user_id
    WHERE j.status = 'open'
    AND j.user_id != p_user_id -- Don't show own jobs
    -- Don't show jobs user already applied to
    AND NOT EXISTS (
      SELECT 1 FROM job_applications ja 
      WHERE ja.job_id = j.id AND ja.applicant_id = p_user_id
    )
  )
  SELECT * FROM job_scores
  ORDER BY relevance_score DESC, created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 5. PERSONALIZED FUNDRAISING DISCOVERY
-- ============================================
CREATE OR REPLACE FUNCTION public.get_personalized_fundraisings(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
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
  backer_count INTEGER,
  is_verified BOOLEAN,
  creator_id UUID,
  creator_name TEXT,
  creator_picture TEXT,
  progress_percent NUMERIC,
  relevance_score NUMERIC
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_state TEXT;
  v_contributed_categories TEXT[];
BEGIN
  -- Get user's state
  SELECT state_name INTO v_user_state
  FROM profiles WHERE profiles.user_id = p_user_id;

  -- Get categories user has contributed to
  SELECT ARRAY_AGG(DISTINCT f.category)
  INTO v_contributed_categories
  FROM fundraising_contributions fc
  JOIN fundraisings f ON f.id = fc.fundraising_id
  WHERE fc.contributor_id = p_user_id;

  RETURN QUERY
  WITH fundraising_scores AS (
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
      p.full_name AS creator_name,
      p.profile_picture_url AS creator_picture,
      CASE WHEN f.goal_amount > 0 
           THEN ROUND((COALESCE(f.raised_amount, 0) / f.goal_amount) * 100, 2)
           ELSE 0 
      END AS progress_percent,
      (
        -- Base score
        10 +
        -- Verification boost (25 pts)
        CASE WHEN COALESCE(f.is_verified, false) THEN 25 ELSE 0 END +
        -- Category match with previous contributions (20 pts)
        CASE WHEN v_contributed_categories IS NOT NULL AND 
             f.category = ANY(v_contributed_categories)
        THEN 20 ELSE 0 END +
        -- Location match boost (15 pts)
        CASE WHEN v_user_state IS NOT NULL AND f.location ILIKE '%' || v_user_state || '%' THEN 15 ELSE 0 END +
        -- Urgency boost (near deadline, up to 25 pts)
        CASE 
          WHEN f.deadline IS NOT NULL AND f.deadline > NOW() THEN
            GREATEST(0, 25 - EXTRACT(DAY FROM (f.deadline - NOW())))::NUMERIC
          ELSE 0
        END +
        -- Progress momentum boost (near goal gets priority, up to 20 pts)
        CASE 
          WHEN f.goal_amount > 0 THEN
            CASE 
              WHEN (COALESCE(f.raised_amount, 0) / f.goal_amount) BETWEEN 0.5 AND 0.95 THEN 20
              WHEN (COALESCE(f.raised_amount, 0) / f.goal_amount) BETWEEN 0.25 AND 0.5 THEN 10
              ELSE 5
            END
          ELSE 0
        END +
        -- Backer count boost (social proof, up to 15 pts)
        LEAST(COALESCE(f.backer_count, 0), 15)::NUMERIC +
        -- Medical/Emergency category boost (10 pts - higher priority)
        CASE WHEN f.category IN ('medical', 'emergency') THEN 10 ELSE 0 END +
        -- Creator trust score boost
        CASE WHEN COALESCE(p.face_verified, false) THEN 10 ELSE 0 END +
        CASE WHEN COALESCE(p.email_verified, false) AND COALESCE(p.phone_verified, false) THEN 5 ELSE 0 END
      )::NUMERIC AS relevance_score
    FROM fundraisings f
    LEFT JOIN profiles p ON p.user_id = f.user_id
    WHERE f.status = 'approved'
    AND f.user_id != p_user_id -- Don't show own campaigns
    AND (f.deadline IS NULL OR f.deadline > NOW()) -- Not expired
  )
  SELECT * FROM fundraising_scores
  ORDER BY relevance_score DESC, raised_amount DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 6. PERSONALIZED GIGS (jobs_services) DISCOVERY
-- ============================================
CREATE OR REPLACE FUNCTION public.get_personalized_gigs(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
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
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_profession TEXT;
  v_user_state TEXT;
BEGIN
  -- Get user's profile data
  SELECT profession, state_name
  INTO v_user_profession, v_user_state
  FROM profiles WHERE profiles.user_id = p_user_id;

  RETURN QUERY
  WITH gig_scores AS (
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
      p.full_name AS seller_name,
      p.profile_picture_url AS seller_picture,
      COALESCE(p.average_rating, 0) AS seller_rating,
      COALESCE(p.is_expert, false) AS seller_is_expert,
      (
        -- Base score
        10 +
        -- Category match with user's profession (30 pts)
        CASE WHEN v_user_profession IS NOT NULL AND 
             (js.category ILIKE '%' || v_user_profession || '%' OR
              v_user_profession ILIKE '%' || js.category || '%')
        THEN 30 ELSE 0 END +
        -- Seller rating boost (up to 25 pts)
        (COALESCE(p.average_rating, 0) * 5) +
        -- Expert seller boost (15 pts)
        CASE WHEN COALESCE(p.is_expert, false) THEN 15 ELSE 0 END +
        -- Has images boost (10 pts)
        CASE WHEN js.photo_urls IS NOT NULL AND array_length(js.photo_urls, 1) > 0 THEN 10 ELSE 0 END +
        -- Recency boost (up to 20 pts)
        GREATEST(0, 20 - EXTRACT(DAY FROM (NOW() - js.created_at)))::NUMERIC +
        -- Trust score boost
        CASE WHEN COALESCE(p.face_verified, false) THEN 10 ELSE 0 END +
        CASE WHEN COALESCE(p.email_verified, false) AND COALESCE(p.phone_verified, false) THEN 5 ELSE 0 END +
        -- Top rated seller boost
        CASE WHEN COALESCE(p.average_rating, 0) >= 4.5 AND COALESCE(p.rating_count, 0) >= 5 THEN 15 ELSE 0 END
      )::NUMERIC AS relevance_score
    FROM jobs_services js
    LEFT JOIN profiles p ON p.user_id = js.user_id
    WHERE js.status = 'active'
    AND js.user_id != p_user_id -- Don't show own gigs
  )
  SELECT * FROM gig_scores
  ORDER BY relevance_score DESC, seller_rating DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;