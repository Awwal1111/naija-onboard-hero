-- Drop and recreate get_personalized_feed function - remove non-existent is_pinned column
DROP FUNCTION IF EXISTS public.get_personalized_feed(UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.get_personalized_feed(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  post_id UUID,
  user_id UUID,
  content_type TEXT,
  title TEXT,
  content TEXT,
  media_urls JSONB,
  metadata JSONB,
  visibility TEXT,
  likes_count INTEGER,
  comments_count INTEGER,
  shares_count INTEGER,
  views_count INTEGER,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
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
      -- Profession match (exact only)
      CASE 
        WHEN v_user_profession IS NULL OR v_user_profession = '' THEN 0
        WHEN pr.profession IS NULL OR pr.profession = '' THEN 0
        WHEN LOWER(TRIM(pr.profession)) = LOWER(TRIM(v_user_profession)) THEN 25
        ELSE 0 
      END
      +
      -- Expert content boost
      CASE WHEN pr.is_expert = true THEN 15 ELSE 0 END
      +
      -- Trust score boost
      CASE WHEN pr.email_verified = true THEN 5 ELSE 0 END
      + CASE WHEN pr.phone_verified = true THEN 5 ELSE 0 END
      + CASE WHEN pr.face_verified = true THEN 10 ELSE 0 END
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