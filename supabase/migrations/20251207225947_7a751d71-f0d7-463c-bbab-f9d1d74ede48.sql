-- Drop and recreate the personalized feed function with Phase 2 enhancements
CREATE OR REPLACE FUNCTION get_personalized_feed(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  content TEXT,
  content_type TEXT,
  title TEXT,
  media_urls TEXT[],
  metadata JSONB,
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
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_connections AS (
    -- Get all connected users
    SELECT 
      CASE 
        WHEN c.user1_id = p_user_id THEN c.user2_id 
        ELSE c.user1_id 
      END AS connected_user_id
    FROM connections c
    WHERE (c.user1_id = p_user_id OR c.user2_id = p_user_id)
      AND c.status = 'connected'
  ),
  user_profile AS (
    -- Get current user's profile for matching
    SELECT pr.state_name, pr.lga_name, pr.profession, pr.skills
    FROM profiles pr
    WHERE pr.user_id = p_user_id
  ),
  user_interactions AS (
    -- Get users the current user has interacted with (liked their posts)
    SELECT DISTINCT p.user_id AS interacted_user_id
    FROM post_likes pl
    JOIN posts p ON pl.post_id = p.id
    WHERE pl.user_id = p_user_id
    AND pl.created_at > NOW() - INTERVAL '30 days'
  ),
  user_viewed_posts AS (
    -- Get recently viewed posts to avoid showing again immediately
    SELECT post_id
    FROM post_views
    WHERE user_id = p_user_id
    AND viewed_at > NOW() - INTERVAL '2 hours'
  ),
  scored_posts AS (
    SELECT 
      p.id AS post_id,
      p.user_id AS post_user_id,
      p.content AS post_content,
      p.content_type AS post_content_type,
      p.title AS post_title,
      p.media_urls AS post_media_urls,
      p.metadata AS post_metadata,
      p.likes_count AS post_likes_count,
      p.comments_count AS post_comments_count,
      p.shares_count AS post_shares_count,
      p.views_count AS post_views_count,
      p.status AS post_status,
      p.created_at AS post_created_at,
      p.updated_at AS post_updated_at,
      (
        -- CONNECTION BOOST (50 points max)
        CASE WHEN uc.connected_user_id IS NOT NULL THEN 50 ELSE 0 END
        
        -- INTERACTION AFFINITY (30 points) - boost posts from users we've interacted with
        + CASE WHEN ui.interacted_user_id IS NOT NULL THEN 30 ELSE 0 END
        
        -- ENGAGEMENT SCORE (40 points max) - viral content boost
        + LEAST(40, (
            COALESCE(p.likes_count, 0) * 1 
            + COALESCE(p.comments_count, 0) * 3  -- Comments worth more
            + COALESCE(p.shares_count, 0) * 5    -- Shares worth most
          ))
        
        -- ENGAGEMENT RATE BONUS (20 points) - high engagement relative to views
        + CASE 
            WHEN COALESCE(p.views_count, 0) > 10 THEN
              LEAST(20, (
                (COALESCE(p.likes_count, 0) + COALESCE(p.comments_count, 0)::NUMERIC) 
                / GREATEST(1, p.views_count) * 100
              ))
            ELSE 0
          END
        
        -- RECENCY DECAY (30 points max) - newer posts score higher
        + GREATEST(0, 30 - (EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600 / 4)::NUMERIC)
        
        -- LOCATION MATCH (15 points) - same state
        + CASE WHEN author_pr.state_name IS NOT NULL AND author_pr.state_name = up.state_name THEN 15 ELSE 0 END
        
        -- LOCAL AREA BONUS (10 points) - same LGA
        + CASE WHEN author_pr.lga_name IS NOT NULL AND author_pr.lga_name = up.lga_name THEN 10 ELSE 0 END
        
        -- PROFESSION MATCH (10 points) - same profession
        + CASE WHEN author_pr.profession IS NOT NULL AND author_pr.profession = up.profession THEN 10 ELSE 0 END
        
        -- EXPERT AUTHOR BOOST (15 points) - prioritize expert content
        + CASE WHEN author_pr.is_expert = true THEN 15 ELSE 0 END
        
        -- VERIFIED AUTHOR BOOST (10 points)
        + CASE WHEN author_pr.face_verified = true THEN 10 ELSE 0 END
        
        -- MEDIA CONTENT BOOST (10 points) - posts with images/videos
        + CASE WHEN p.media_urls IS NOT NULL AND array_length(p.media_urls, 1) > 0 THEN 10 ELSE 0 END
        
        -- CONTENT TYPE VARIETY (5-15 points)
        + CASE 
            WHEN p.content_type = 'job' THEN 15
            WHEN p.content_type = 'achievement' THEN 10
            WHEN p.content_type = 'event' THEN 10
            ELSE 5
          END
        
        -- RECENTLY VIEWED PENALTY (-50 points) - don't show same posts immediately
        - CASE WHEN uvp.post_id IS NOT NULL THEN 50 ELSE 0 END
        
      )::NUMERIC AS calc_relevance_score
    FROM posts p
    LEFT JOIN user_connections uc ON p.user_id = uc.connected_user_id
    LEFT JOIN user_interactions ui ON p.user_id = ui.interacted_user_id
    LEFT JOIN user_viewed_posts uvp ON p.id = uvp.post_id
    LEFT JOIN profiles author_pr ON p.user_id = author_pr.user_id
    CROSS JOIN user_profile up
    WHERE p.status = 'active'
      AND p.user_id != p_user_id
  )
  SELECT 
    sp.post_id,
    sp.post_user_id,
    sp.post_content,
    sp.post_content_type,
    sp.post_title,
    sp.post_media_urls,
    sp.post_metadata,
    sp.post_likes_count,
    sp.post_comments_count,
    sp.post_shares_count,
    sp.post_views_count,
    sp.post_status,
    sp.post_created_at,
    sp.post_updated_at,
    sp.calc_relevance_score
  FROM scored_posts sp
  ORDER BY sp.calc_relevance_score DESC, sp.post_created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;