CREATE OR REPLACE FUNCTION public.get_personalized_feed(p_user_id uuid, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, user_id uuid, content_type text, title text, content text, media_urls text[], metadata jsonb, likes_count integer, comments_count integer, shares_count integer, views_count integer, status text, created_at timestamp with time zone, updated_at timestamp with time zone, visibility text, boost_amount numeric, boosted_at timestamp with time zone, relevance_score numeric)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH recent AS (
    SELECT p0.* FROM posts p0 WHERE p0.status = 'active'
      AND (p0.visibility = 'public' OR p0.user_id = p_user_id)
    ORDER BY p0.created_at DESC LIMIT 500
  ), scored AS (
    SELECT p.id AS s_id, p.user_id AS s_user, p.created_at AS s_created,
      (
        CASE WHEN pr.is_premium = true AND pr.premium_expires_at > NOW() THEN 80 ELSE 0 END +
        COALESCE(p.boost_amount,0) * 2 +
        CASE WHEN EXISTS (SELECT 1 FROM connections c
          WHERE (c.user1_id = p_user_id AND c.user2_id = p.user_id)
             OR (c.user2_id = p_user_id AND c.user1_id = p.user_id)) THEN 50 ELSE 0 END +
        (COALESCE(p.likes_count,0) + COALESCE(p.comments_count,0)*2 + COALESCE(p.shares_count,0)*3) * 0.5 +
        GREATEST(0, 100 - EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600)
      )::numeric AS score
    FROM recent p LEFT JOIN profiles pr ON pr.user_id = p.user_id
  ), ranked AS (
    SELECT s.s_id, s.score, ROW_NUMBER() OVER (PARTITION BY s.s_user ORDER BY s.score DESC, s.s_created DESC) AS author_rank
    FROM scored s
  )
  SELECT p.id, p.user_id, p.content_type, p.title, p.content, p.media_urls, p.metadata,
    p.likes_count, p.comments_count, p.shares_count, p.views_count, p.status,
    p.created_at, p.updated_at, p.visibility, COALESCE(p.boost_amount,0)::numeric, p.boosted_at,
    (r.score * POWER(0.4, r.author_rank - 1))::numeric
  FROM ranked r JOIN recent p ON p.id = r.s_id
  ORDER BY (r.author_rank > 2), (r.score * POWER(0.4, r.author_rank - 1)) DESC, p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$function$;