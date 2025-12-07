-- Fix: viewed_at column doesn't exist in post_views, use created_at instead

CREATE OR REPLACE FUNCTION public.get_personalized_feed(
  p_user_id uuid, 
  p_limit integer DEFAULT 10, 
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid, user_id uuid, content text, content_type text, title text, 
  media_urls text[], metadata jsonb, likes_count integer, comments_count integer, 
  shares_count integer, views_count integer, status text, 
  created_at timestamp with time zone, updated_at timestamp with time zone, relevance_score numeric
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH user_connections AS (
    SELECT CASE WHEN c.user1_id = p_user_id THEN c.user2_id ELSE c.user1_id END AS connected_user_id
    FROM connections c WHERE (c.user1_id = p_user_id OR c.user2_id = p_user_id) AND c.status = 'connected'
  ),
  user_profile AS (
    SELECT upr.state_name, upr.lga_name, upr.area, upr.profession FROM profiles upr WHERE upr.user_id = p_user_id
  ),
  user_interactions AS (
    SELECT DISTINCT pst.user_id AS interacted_user_id FROM post_likes pl
    JOIN posts pst ON pl.post_id = pst.id WHERE pl.user_id = p_user_id AND pl.created_at > NOW() - INTERVAL '30 days'
  ),
  user_viewed_posts AS (
    SELECT pv.post_id FROM post_views pv WHERE pv.user_id = p_user_id AND pv.created_at > NOW() - INTERVAL '2 hours'
  ),
  scored_posts AS (
    SELECT pst.id AS post_id, pst.user_id AS post_user_id, pst.content AS post_content,
      pst.content_type AS post_content_type, pst.title AS post_title, pst.media_urls AS post_media_urls,
      pst.metadata AS post_metadata, pst.likes_count AS post_likes_count, pst.comments_count AS post_comments_count,
      pst.shares_count AS post_shares_count, pst.views_count AS post_views_count, pst.status AS post_status,
      pst.created_at AS post_created_at, pst.updated_at AS post_updated_at,
      (
        CASE WHEN uc.connected_user_id IS NOT NULL THEN 50 ELSE 0 END
        + GREATEST(0, 30 - (EXTRACT(EPOCH FROM (NOW() - pst.created_at)) / 3600 / 4)::NUMERIC)
        + LEAST(40, COALESCE(pst.likes_count,0) + COALESCE(pst.comments_count,0)*3 + COALESCE(pst.shares_count,0)*5)
        + CASE WHEN author_pr.state_name = up.state_name THEN 15 ELSE 0 END
        + CASE WHEN author_pr.profession = up.profession THEN 10 ELSE 0 END
        + CASE WHEN ui.interacted_user_id IS NOT NULL THEN 30 ELSE 0 END
        + CASE WHEN author_pr.lga_name = up.lga_name THEN 10 ELSE 0 END
        + CASE WHEN author_pr.is_expert THEN 15 ELSE 0 END
        + CASE WHEN pst.media_urls IS NOT NULL AND array_length(pst.media_urls,1) > 0 THEN 10 ELSE 0 END
        + CASE WHEN pst.content_type = 'job' THEN 15 WHEN pst.content_type = 'achievement' THEN 12 ELSE 5 END
        - CASE WHEN uvp.post_id IS NOT NULL THEN 50 ELSE 0 END
        + CASE WHEN COALESCE(author_pr.face_verified,false) THEN 20 ELSE 0 END
        + CASE WHEN COALESCE(author_pr.average_rating,0) >= 4.5 AND COALESCE(author_pr.rating_count,0) >= 5 THEN 10 ELSE 0 END
      )::NUMERIC AS calc_relevance_score
    FROM posts pst
    LEFT JOIN user_connections uc ON pst.user_id = uc.connected_user_id
    LEFT JOIN user_interactions ui ON pst.user_id = ui.interacted_user_id
    LEFT JOIN user_viewed_posts uvp ON pst.id = uvp.post_id
    LEFT JOIN profiles author_pr ON pst.user_id = author_pr.user_id
    CROSS JOIN user_profile up
    WHERE pst.status = 'active' AND pst.user_id != p_user_id
  )
  SELECT sp.post_id, sp.post_user_id, sp.post_content, sp.post_content_type, sp.post_title,
    sp.post_media_urls, sp.post_metadata, sp.post_likes_count, sp.post_comments_count,
    sp.post_shares_count, sp.post_views_count, sp.post_status, sp.post_created_at, sp.post_updated_at,
    sp.calc_relevance_score
  FROM scored_posts sp ORDER BY sp.calc_relevance_score DESC, sp.post_created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$function$;