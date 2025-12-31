-- Drop existing functions to update return types
DROP FUNCTION IF EXISTS public.get_personalized_experts(uuid, integer, integer);
DROP FUNCTION IF EXISTS public.get_personalized_gigs(uuid, integer, integer);

-- Recreate get_personalized_experts with premium boost
CREATE OR REPLACE FUNCTION public.get_personalized_experts(p_user_id uuid, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  profession text,
  bio text,
  profile_picture_url text,
  state_name text,
  lga_name text,
  area text,
  average_rating numeric,
  rating_count integer,
  connections_count integer,
  is_expert boolean,
  expert_verified_at timestamp with time zone,
  is_boosted boolean,
  boost_expires_at timestamp with time zone,
  is_premium boolean,
  premium_expires_at timestamp with time zone,
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
  -- Get user's state for personalization
  SELECT p.state_name INTO v_user_state
  FROM profiles p
  WHERE p.user_id = get_personalized_experts.p_user_id;

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
    COALESCE(p.rating_count, 0) as rating_count,
    COALESCE(p.connections_count, 0) as connections_count,
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

-- Recreate get_personalized_gigs with premium seller boost
CREATE OR REPLACE FUNCTION public.get_personalized_gigs(p_user_id uuid, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS TABLE(
  id uuid, 
  title text, 
  description text, 
  price numeric, 
  category text, 
  photo_urls text[], 
  status text, 
  created_at timestamp with time zone, 
  boost_amount numeric, 
  seller_id uuid, 
  seller_name text, 
  seller_picture text, 
  seller_rating numeric, 
  seller_is_expert boolean,
  seller_is_premium boolean,
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
  SELECT p.state_name INTO v_user_state
  FROM profiles p
  WHERE p.user_id = get_personalized_gigs.p_user_id;

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
    COALESCE(p.is_premium, false) as seller_is_premium,
    p.state_name as seller_state,
    COALESCE(js.average_rating, 0::numeric) as average_rating,
    COALESCE(js.review_count, 0) as review_count,
    (
      CASE WHEN p.is_premium = true AND p.premium_expires_at > NOW() THEN 100 ELSE 0 END +
      COALESCE(js.boost_amount, 0) * 2 +
      CASE WHEN p.is_expert THEN 20 ELSE 0 END +
      CASE WHEN p.state_name = v_user_state THEN 10 ELSE 0 END +
      COALESCE(p.average_rating, 0) * 4 +
      COALESCE(js.average_rating, 0) * 4
    )::numeric as relevance_score
  FROM jobs_services js
  LEFT JOIN profiles p ON p.user_id = js.user_id
  WHERE js.status = 'active'
    AND js.user_id != get_personalized_gigs.p_user_id
  ORDER BY 
    (CASE WHEN p.is_premium = true AND p.premium_expires_at > NOW() THEN 1 ELSE 0 END) DESC,
    COALESCE(js.boost_amount, 0) DESC,
    relevance_score DESC,
    js.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Update get_personalized_feed to boost premium users' posts
CREATE OR REPLACE FUNCTION public.get_personalized_feed(p_user_id uuid, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
RETURNS TABLE(
  id uuid, 
  user_id uuid, 
  content_type text, 
  title text, 
  content text, 
  media_urls text[], 
  metadata jsonb, 
  likes_count integer, 
  comments_count integer, 
  shares_count integer, 
  views_count integer, 
  status text, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone, 
  visibility text, 
  boost_amount numeric, 
  boosted_at timestamp with time zone, 
  relevance_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.content_type,
    p.title,
    p.content,
    p.media_urls,
    p.metadata,
    p.likes_count,
    p.comments_count,
    p.shares_count,
    p.views_count,
    p.status,
    p.created_at,
    p.updated_at,
    p.visibility,
    COALESCE(p.boost_amount, 0) as boost_amount,
    p.boosted_at,
    (
      CASE WHEN pr.is_premium = true AND pr.premium_expires_at > NOW() THEN 80 ELSE 0 END +
      COALESCE(p.boost_amount, 0) * 2 +
      CASE WHEN EXISTS (
        SELECT 1 FROM connections c 
        WHERE (c.user1_id = get_personalized_feed.p_user_id AND c.user2_id = p.user_id)
           OR (c.user2_id = get_personalized_feed.p_user_id AND c.user1_id = p.user_id)
      ) THEN 50 ELSE 0 END +
      (COALESCE(p.likes_count, 0) + COALESCE(p.comments_count, 0) * 2 + COALESCE(p.shares_count, 0) * 3) * 0.5 +
      GREATEST(0, 100 - EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600)
    )::numeric as relevance_score
  FROM posts p
  LEFT JOIN profiles pr ON pr.user_id = p.user_id
  WHERE p.status = 'active'
    AND (p.visibility = 'public' OR p.user_id = get_personalized_feed.p_user_id)
  ORDER BY 
    (CASE WHEN pr.is_premium = true AND pr.premium_expires_at > NOW() THEN 1 ELSE 0 END) DESC,
    COALESCE(p.boost_amount, 0) DESC,
    relevance_score DESC,
    p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;