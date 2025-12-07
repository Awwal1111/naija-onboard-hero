-- Enhanced Personalized Feed Algorithm with Trust Score Integration
-- Phase 1 + Phase 2 + Trust Score Complete Implementation

CREATE OR REPLACE FUNCTION public.get_personalized_feed(
  p_user_id uuid, 
  p_limit integer DEFAULT 10, 
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid, 
  user_id uuid, 
  content text, 
  content_type text, 
  title text, 
  media_urls text[], 
  metadata jsonb, 
  likes_count integer, 
  comments_count integer, 
  shares_count integer, 
  views_count integer, 
  status text, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone, 
  relevance_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH user_connections AS (
    -- Phase 1: Get all connected users
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
    -- Phase 1: Get current user's profile for matching
    SELECT 
      pr.state_name, 
      pr.lga_name, 
      pr.area,
      pr.profession, 
      pr.skills
    FROM profiles pr
    WHERE pr.user_id = p_user_id
  ),
  user_interactions AS (
    -- Phase 2: Get users the current user has interacted with (liked their posts)
    SELECT DISTINCT p.user_id AS interacted_user_id
    FROM post_likes pl
    JOIN posts p ON pl.post_id = p.id
    WHERE pl.user_id = p_user_id
    AND pl.created_at > NOW() - INTERVAL '30 days'
  ),
  user_commented_on AS (
    -- Phase 2: Get users whose posts the current user has commented on
    SELECT DISTINCT p.user_id AS commented_user_id
    FROM post_comments pc
    JOIN posts p ON pc.post_id = p.id
    WHERE pc.user_id = p_user_id
    AND pc.created_at > NOW() - INTERVAL '30 days'
  ),
  user_viewed_posts AS (
    -- Phase 2: Get recently viewed posts to avoid showing again immediately
    SELECT post_id
    FROM post_views
    WHERE user_id = p_user_id
    AND viewed_at > NOW() - INTERVAL '2 hours'
  ),
  author_trust_scores AS (
    -- Trust Score: Calculate trust score for each author
    SELECT 
      pr.user_id,
      -- Verification Score (0-40 points)
      (
        CASE WHEN COALESCE(pr.email_verified, false) THEN 10 ELSE 0 END +
        CASE WHEN COALESCE(pr.phone_verified, false) THEN 10 ELSE 0 END +
        CASE WHEN COALESCE(pr.face_verified, false) THEN 20 ELSE 0 END
      ) AS verification_score,
      -- Reputation Score (0-30 points)
      (
        CASE 
          WHEN COALESCE(pr.rating_count, 0) > 0 THEN
            LEAST(20, (COALESCE(pr.average_rating, 0) / 5.0) * 20) +
            LEAST(10, LOG(COALESCE(pr.rating_count, 0) + 1) * 5)
          ELSE 0
        END +
        CASE WHEN COALESCE(pr.is_expert, false) THEN 5 ELSE 0 END
      ) AS reputation_score,
      -- Activity Score (0-20 points)
      (
        -- Account age component (0-10 points)
        CASE 
          WHEN pr.created_at <= NOW() - INTERVAL '365 days' THEN 10
          WHEN pr.created_at <= NOW() - INTERVAL '180 days' THEN 7
          WHEN pr.created_at <= NOW() - INTERVAL '90 days' THEN 5
          WHEN pr.created_at <= NOW() - INTERVAL '30 days' THEN 3
          WHEN pr.created_at <= NOW() - INTERVAL '7 days' THEN 1
          ELSE 0
        END +
        -- Response time component (0-10 points)
        CASE 
          WHEN COALESCE(pr.avg_response_time_seconds, 999999) < 60 THEN 10
          WHEN COALESCE(pr.avg_response_time_seconds, 999999) < 180 THEN 8
          WHEN COALESCE(pr.avg_response_time_seconds, 999999) < 600 THEN 5
          WHEN COALESCE(pr.avg_response_time_seconds, 999999) < 3600 THEN 2
          ELSE 0
        END
      ) AS activity_score,
      -- Community Score (0-10 points)
      CASE 
        WHEN COALESCE(pr.connections_count, 0) >= 100 THEN 10
        WHEN COALESCE(pr.connections_count, 0) >= 50 THEN 8
        WHEN COALESCE(pr.connections_count, 0) >= 20 THEN 6
        WHEN COALESCE(pr.connections_count, 0) >= 10 THEN 4
        WHEN COALESCE(pr.connections_count, 0) >= 5 THEN 2
        ELSE 0
      END AS community_score
    FROM profiles pr
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
        -- ============ PHASE 1: CORE SIGNALS ============
        
        -- CONNECTION BOOST (50 points max) - Posts from connections
        CASE WHEN uc.connected_user_id IS NOT NULL THEN 50 ELSE 0 END
        
        -- RECENCY DECAY (30 points max) - Newer posts score higher
        -- Loses ~7.5 points per day
        + GREATEST(0, 30 - (EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600 / 4)::NUMERIC)
        
        -- ENGAGEMENT SCORE (40 points max) - Viral content boost
        + LEAST(40, (
            COALESCE(p.likes_count, 0) * 1 
            + COALESCE(p.comments_count, 0) * 3  -- Comments worth more
            + COALESCE(p.shares_count, 0) * 5    -- Shares worth most
          ))
        
        -- LOCATION MATCH - State (15 points)
        + CASE WHEN author_pr.state_name IS NOT NULL AND author_pr.state_name = up.state_name THEN 15 ELSE 0 END
        
        -- PROFESSION MATCH (10 points)
        + CASE WHEN author_pr.profession IS NOT NULL AND author_pr.profession = up.profession THEN 10 ELSE 0 END
        
        -- ============ PHASE 2: ADVANCED SIGNALS ============
        
        -- INTERACTION AFFINITY (30 points) - Boost posts from users we've liked
        + CASE WHEN ui.interacted_user_id IS NOT NULL THEN 30 ELSE 0 END
        
        -- COMMENT AFFINITY (25 points) - Boost posts from users we've commented on
        + CASE WHEN uco.commented_user_id IS NOT NULL THEN 25 ELSE 0 END
        
        -- ENGAGEMENT RATE BONUS (20 points) - High engagement relative to views
        + CASE 
            WHEN COALESCE(p.views_count, 0) > 10 THEN
              LEAST(20, (
                (COALESCE(p.likes_count, 0) + COALESCE(p.comments_count, 0)::NUMERIC) 
                / GREATEST(1, p.views_count) * 100
              ))
            ELSE 0
          END
        
        -- LOCAL AREA BONUS (10 points) - Same LGA
        + CASE WHEN author_pr.lga_name IS NOT NULL AND author_pr.lga_name = up.lga_name THEN 10 ELSE 0 END
        
        -- HYPER-LOCAL BONUS (5 points) - Same Area
        + CASE WHEN author_pr.area IS NOT NULL AND author_pr.area = up.area THEN 5 ELSE 0 END
        
        -- EXPERT AUTHOR BOOST (15 points) - Prioritize expert content
        + CASE WHEN author_pr.is_expert = true THEN 15 ELSE 0 END
        
        -- MEDIA CONTENT BOOST (10 points) - Posts with images/videos
        + CASE WHEN p.media_urls IS NOT NULL AND array_length(p.media_urls, 1) > 0 THEN 10 ELSE 0 END
        
        -- CONTENT TYPE VARIETY (5-15 points)
        + CASE 
            WHEN p.content_type = 'job' THEN 15
            WHEN p.content_type = 'achievement' THEN 12
            WHEN p.content_type = 'event' THEN 10
            WHEN p.content_type = 'article' THEN 8
            ELSE 5
          END
        
        -- RECENTLY VIEWED PENALTY (-50 points) - Don't show same posts
        - CASE WHEN uvp.post_id IS NOT NULL THEN 50 ELSE 0 END
        
        -- ============ TRUST SCORE INTEGRATION ============
        
        -- AUTHOR TRUST SCORE BOOST (0-25 points based on trust score 0-100)
        -- Trust score = verification + reputation + activity + community (max 100)
        + LEAST(25, (
            COALESCE(ats.verification_score, 0) + 
            COALESCE(ats.reputation_score, 0) + 
            COALESCE(ats.activity_score, 0) + 
            COALESCE(ats.community_score, 0)
          ) * 0.25)
        
        -- VERIFIED AUTHOR BONUS (10 points) - All 3 verifications complete
        + CASE 
            WHEN COALESCE(author_pr.email_verified, false) 
             AND COALESCE(author_pr.phone_verified, false) 
             AND COALESCE(author_pr.face_verified, false) 
            THEN 10 
            ELSE 0 
          END
        
        -- TOP RATED AUTHOR BOOST (10 points) - 4.5+ rating with 5+ reviews
        + CASE 
            WHEN COALESCE(author_pr.average_rating, 0) >= 4.5 
             AND COALESCE(author_pr.rating_count, 0) >= 5 
            THEN 10 
            ELSE 0 
          END
        
        -- FAST RESPONDER BOOST (5 points) - Response time < 3 minutes
        + CASE 
            WHEN COALESCE(author_pr.avg_response_time_seconds, 999999) < 180 
            THEN 5 
            ELSE 0 
          END
        
      )::NUMERIC AS calc_relevance_score
    FROM posts p
    LEFT JOIN user_connections uc ON p.user_id = uc.connected_user_id
    LEFT JOIN user_interactions ui ON p.user_id = ui.interacted_user_id
    LEFT JOIN user_commented_on uco ON p.user_id = uco.commented_user_id
    LEFT JOIN user_viewed_posts uvp ON p.id = uvp.post_id
    LEFT JOIN profiles author_pr ON p.user_id = author_pr.user_id
    LEFT JOIN author_trust_scores ats ON p.user_id = ats.user_id
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
$function$;