-- Fix: Ambiguous user_id column reference in get_personalized_feed function
-- Using explicit table aliases for all user_id references

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
    SELECT 
      upr.state_name, 
      upr.lga_name, 
      upr.area,
      upr.profession
    FROM profiles upr
    WHERE upr.user_id = p_user_id
  ),
  user_interactions AS (
    SELECT DISTINCT pst.user_id AS interacted_user_id
    FROM post_likes pl
    JOIN posts pst ON pl.post_id = pst.id
    WHERE pl.user_id = p_user_id
    AND pl.created_at > NOW() - INTERVAL '30 days'
  ),
  user_commented_on AS (
    SELECT DISTINCT pst.user_id AS commented_user_id
    FROM post_comments pc
    JOIN posts pst ON pc.post_id = pst.id
    WHERE pc.user_id = p_user_id
    AND pc.created_at > NOW() - INTERVAL '30 days'
  ),
  user_viewed_posts AS (
    SELECT pv.post_id
    FROM post_views pv
    WHERE pv.user_id = p_user_id
    AND pv.viewed_at > NOW() - INTERVAL '2 hours'
  ),
  author_trust_scores AS (
    SELECT 
      atr.user_id AS author_id,
      (
        CASE WHEN COALESCE(atr.email_verified, false) THEN 10 ELSE 0 END +
        CASE WHEN COALESCE(atr.phone_verified, false) THEN 10 ELSE 0 END +
        CASE WHEN COALESCE(atr.face_verified, false) THEN 20 ELSE 0 END
      ) AS verification_score,
      (
        CASE 
          WHEN COALESCE(atr.rating_count, 0) > 0 THEN
            LEAST(20, (COALESCE(atr.average_rating, 0) / 5.0) * 20) +
            LEAST(10, LOG(COALESCE(atr.rating_count, 0) + 1) * 5)
          ELSE 0
        END +
        CASE WHEN COALESCE(atr.is_expert, false) THEN 5 ELSE 0 END
      ) AS reputation_score,
      (
        CASE 
          WHEN atr.created_at <= NOW() - INTERVAL '365 days' THEN 10
          WHEN atr.created_at <= NOW() - INTERVAL '180 days' THEN 7
          WHEN atr.created_at <= NOW() - INTERVAL '90 days' THEN 5
          WHEN atr.created_at <= NOW() - INTERVAL '30 days' THEN 3
          WHEN atr.created_at <= NOW() - INTERVAL '7 days' THEN 1
          ELSE 0
        END +
        CASE 
          WHEN COALESCE(atr.avg_response_time_seconds, 999999) < 60 THEN 10
          WHEN COALESCE(atr.avg_response_time_seconds, 999999) < 180 THEN 8
          WHEN COALESCE(atr.avg_response_time_seconds, 999999) < 600 THEN 5
          WHEN COALESCE(atr.avg_response_time_seconds, 999999) < 3600 THEN 2
          ELSE 0
        END
      ) AS activity_score,
      CASE 
        WHEN COALESCE(atr.connections_count, 0) >= 100 THEN 10
        WHEN COALESCE(atr.connections_count, 0) >= 50 THEN 8
        WHEN COALESCE(atr.connections_count, 0) >= 20 THEN 6
        WHEN COALESCE(atr.connections_count, 0) >= 10 THEN 4
        WHEN COALESCE(atr.connections_count, 0) >= 5 THEN 2
        ELSE 0
      END AS community_score
    FROM profiles atr
  ),
  scored_posts AS (
    SELECT 
      pst.id AS post_id,
      pst.user_id AS post_user_id,
      pst.content AS post_content,
      pst.content_type AS post_content_type,
      pst.title AS post_title,
      pst.media_urls AS post_media_urls,
      pst.metadata AS post_metadata,
      pst.likes_count AS post_likes_count,
      pst.comments_count AS post_comments_count,
      pst.shares_count AS post_shares_count,
      pst.views_count AS post_views_count,
      pst.status AS post_status,
      pst.created_at AS post_created_at,
      pst.updated_at AS post_updated_at,
      (
        -- CONNECTION BOOST (50 points)
        CASE WHEN uc.connected_user_id IS NOT NULL THEN 50 ELSE 0 END
        
        -- RECENCY DECAY (30 points max)
        + GREATEST(0, 30 - (EXTRACT(EPOCH FROM (NOW() - pst.created_at)) / 3600 / 4)::NUMERIC)
        
        -- ENGAGEMENT SCORE (40 points max)
        + LEAST(40, (
            COALESCE(pst.likes_count, 0) * 1 
            + COALESCE(pst.comments_count, 0) * 3
            + COALESCE(pst.shares_count, 0) * 5
          ))
        
        -- LOCATION MATCH (15 points)
        + CASE WHEN author_pr.state_name IS NOT NULL AND author_pr.state_name = up.state_name THEN 15 ELSE 0 END
        
        -- PROFESSION MATCH (10 points)
        + CASE WHEN author_pr.profession IS NOT NULL AND author_pr.profession = up.profession THEN 10 ELSE 0 END
        
        -- INTERACTION AFFINITY (30 points)
        + CASE WHEN ui.interacted_user_id IS NOT NULL THEN 30 ELSE 0 END
        
        -- COMMENT AFFINITY (25 points)
        + CASE WHEN uco.commented_user_id IS NOT NULL THEN 25 ELSE 0 END
        
        -- ENGAGEMENT RATE BONUS (20 points)
        + CASE 
            WHEN COALESCE(pst.views_count, 0) > 10 THEN
              LEAST(20, (
                (COALESCE(pst.likes_count, 0) + COALESCE(pst.comments_count, 0)::NUMERIC) 
                / GREATEST(1, pst.views_count) * 100
              ))
            ELSE 0
          END
        
        -- LOCAL AREA BONUS (10 points)
        + CASE WHEN author_pr.lga_name IS NOT NULL AND author_pr.lga_name = up.lga_name THEN 10 ELSE 0 END
        
        -- HYPER-LOCAL BONUS (5 points)
        + CASE WHEN author_pr.area IS NOT NULL AND author_pr.area = up.area THEN 5 ELSE 0 END
        
        -- EXPERT AUTHOR BOOST (15 points)
        + CASE WHEN author_pr.is_expert = true THEN 15 ELSE 0 END
        
        -- MEDIA CONTENT BOOST (10 points)
        + CASE WHEN pst.media_urls IS NOT NULL AND array_length(pst.media_urls, 1) > 0 THEN 10 ELSE 0 END
        
        -- CONTENT TYPE (5-15 points)
        + CASE 
            WHEN pst.content_type = 'job' THEN 15
            WHEN pst.content_type = 'achievement' THEN 12
            WHEN pst.content_type = 'event' THEN 10
            WHEN pst.content_type = 'article' THEN 8
            ELSE 5
          END
        
        -- RECENTLY VIEWED PENALTY (-50 points)
        - CASE WHEN uvp.post_id IS NOT NULL THEN 50 ELSE 0 END
        
        -- TRUST SCORE BOOST (0-25 points)
        + LEAST(25, (
            COALESCE(ats.verification_score, 0) + 
            COALESCE(ats.reputation_score, 0) + 
            COALESCE(ats.activity_score, 0) + 
            COALESCE(ats.community_score, 0)
          ) * 0.25)
        
        -- VERIFIED AUTHOR BONUS (10 points)
        + CASE 
            WHEN COALESCE(author_pr.email_verified, false) 
             AND COALESCE(author_pr.phone_verified, false) 
             AND COALESCE(author_pr.face_verified, false) 
            THEN 10 
            ELSE 0 
          END
        
        -- TOP RATED AUTHOR BOOST (10 points)
        + CASE 
            WHEN COALESCE(author_pr.average_rating, 0) >= 4.5 
             AND COALESCE(author_pr.rating_count, 0) >= 5 
            THEN 10 
            ELSE 0 
          END
        
        -- FAST RESPONDER BOOST (5 points)
        + CASE 
            WHEN COALESCE(author_pr.avg_response_time_seconds, 999999) < 180 
            THEN 5 
            ELSE 0 
          END
        
      )::NUMERIC AS calc_relevance_score
    FROM posts pst
    LEFT JOIN user_connections uc ON pst.user_id = uc.connected_user_id
    LEFT JOIN user_interactions ui ON pst.user_id = ui.interacted_user_id
    LEFT JOIN user_commented_on uco ON pst.user_id = uco.commented_user_id
    LEFT JOIN user_viewed_posts uvp ON pst.id = uvp.post_id
    LEFT JOIN profiles author_pr ON pst.user_id = author_pr.user_id
    LEFT JOIN author_trust_scores ats ON pst.user_id = ats.author_id
    CROSS JOIN user_profile up
    WHERE pst.status = 'active'
      AND pst.user_id != p_user_id
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