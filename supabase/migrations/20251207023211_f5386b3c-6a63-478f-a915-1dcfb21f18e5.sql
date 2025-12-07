
-- Create a function to get personalized feed for a user
CREATE OR REPLACE FUNCTION get_personalized_feed(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  content TEXT,
  content_type TEXT,
  title TEXT,
  media_urls JSONB,
  hashtags TEXT[],
  metadata JSONB,
  visibility TEXT,
  status TEXT,
  likes_count INTEGER,
  comments_count INTEGER,
  shares_count INTEGER,
  views_count INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  relevance_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_connections AS (
    -- Get all user's connections
    SELECT 
      CASE 
        WHEN user1_id = p_user_id THEN user2_id 
        ELSE user1_id 
      END AS connected_user_id
    FROM connections 
    WHERE (user1_id = p_user_id OR user2_id = p_user_id)
      AND status = 'connected'
  ),
  user_profile AS (
    -- Get user's location and profession for similarity matching
    SELECT state, lga, profession
    FROM profiles
    WHERE profiles.user_id = p_user_id
  ),
  scored_posts AS (
    SELECT 
      p.id,
      p.user_id,
      p.content,
      p.content_type,
      p.title,
      p.media_urls,
      p.hashtags,
      p.metadata,
      p.visibility,
      p.status,
      p.likes_count,
      p.comments_count,
      p.shares_count,
      p.views_count,
      p.created_at,
      p.updated_at,
      -- Calculate relevance score
      (
        -- Connection boost (50 points if from a connection)
        CASE WHEN uc.connected_user_id IS NOT NULL THEN 50 ELSE 0 END
        +
        -- Engagement score (likes + comments*2 + shares*3), capped at 30 points
        LEAST(30, (COALESCE(p.likes_count, 0) + COALESCE(p.comments_count, 0) * 2 + COALESCE(p.shares_count, 0) * 3))
        +
        -- Recency score: 20 points for posts in last hour, decaying over 7 days
        GREATEST(0, 20 - (EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600 / 8.4)::NUMERIC)
        +
        -- Same state boost (10 points)
        CASE WHEN pr.state IS NOT NULL AND pr.state = up.state THEN 10 ELSE 0 END
        +
        -- Same profession boost (5 points)
        CASE WHEN pr.profession IS NOT NULL AND pr.profession = up.profession THEN 5 ELSE 0 END
      )::NUMERIC AS relevance_score
    FROM posts p
    LEFT JOIN user_connections uc ON p.user_id = uc.connected_user_id
    LEFT JOIN profiles pr ON p.user_id = pr.user_id
    CROSS JOIN user_profile up
    WHERE p.status = 'active'
      AND p.visibility IN ('public', 'connections')
      -- Exclude own posts from personalization (they can see them in profile)
      AND p.user_id != p_user_id
  )
  SELECT 
    sp.id,
    sp.user_id,
    sp.content,
    sp.content_type,
    sp.title,
    sp.media_urls,
    sp.hashtags,
    sp.metadata,
    sp.visibility,
    sp.status,
    sp.likes_count,
    sp.comments_count,
    sp.shares_count,
    sp.views_count,
    sp.created_at,
    sp.updated_at,
    sp.relevance_score
  FROM scored_posts sp
  ORDER BY sp.relevance_score DESC, sp.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_personalized_feed TO authenticated;
