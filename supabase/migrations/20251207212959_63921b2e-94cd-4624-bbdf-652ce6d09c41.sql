-- Drop and recreate with correct columns
DROP FUNCTION IF EXISTS public.get_personalized_feed(uuid, integer, integer);

CREATE OR REPLACE FUNCTION public.get_personalized_feed(
  p_user_id uuid, 
  p_limit integer DEFAULT 20, 
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid, 
  user_id uuid, 
  content text, 
  content_type text, 
  title text, 
  media_urls jsonb, 
  metadata jsonb, 
  visibility text, 
  status text, 
  likes_count integer, 
  comments_count integer, 
  shares_count integer, 
  views_count integer, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone, 
  relevance_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    SELECT pr.state_name, pr.lga_name, pr.profession
    FROM profiles pr
    WHERE pr.user_id = p_user_id
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
      p.visibility AS post_visibility,
      p.status AS post_status,
      p.likes_count AS post_likes_count,
      p.comments_count AS post_comments_count,
      p.shares_count AS post_shares_count,
      p.views_count AS post_views_count,
      p.created_at AS post_created_at,
      p.updated_at AS post_updated_at,
      (
        CASE WHEN uc.connected_user_id IS NOT NULL THEN 50 ELSE 0 END
        + LEAST(30, (COALESCE(p.likes_count, 0) + COALESCE(p.comments_count, 0) * 2 + COALESCE(p.shares_count, 0) * 3))
        + GREATEST(0, 20 - (EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600 / 8.4)::NUMERIC)
        + CASE WHEN author_pr.state_name IS NOT NULL AND author_pr.state_name = up.state_name THEN 10 ELSE 0 END
        + CASE WHEN author_pr.profession IS NOT NULL AND author_pr.profession = up.profession THEN 5 ELSE 0 END
      )::NUMERIC AS calc_relevance_score
    FROM posts p
    LEFT JOIN user_connections uc ON p.user_id = uc.connected_user_id
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
    sp.post_visibility,
    sp.post_status,
    sp.post_likes_count,
    sp.post_comments_count,
    sp.post_shares_count,
    sp.post_views_count,
    sp.post_created_at,
    sp.post_updated_at,
    sp.calc_relevance_score
  FROM scored_posts sp
  ORDER BY sp.calc_relevance_score DESC, sp.post_created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;