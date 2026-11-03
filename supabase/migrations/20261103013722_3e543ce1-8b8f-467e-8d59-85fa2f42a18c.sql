CREATE OR REPLACE FUNCTION public.get_personalized_feed(p_user_id uuid, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, user_id uuid, content_type text, title text, content text, media_urls text[], metadata jsonb, likes_count integer, comments_count integer, shares_count integer, views_count integer, status text, created_at timestamp with time zone, updated_at timestamp with time zone, visibility text, boost_amount numeric, boosted_at timestamp with time zone, relevance_score numeric)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH scored AS (
    SELECT p.id, p.user_id, p.content_type, p.title, p.content, p.media_urls, p.metadata,
      p.likes_count, p.comments_count, p.shares_count, p.views_count, p.status,
      p.created_at, p.updated_at, p.visibility, COALESCE(p.boost_amount,0)::numeric AS boost_amount, p.boosted_at,
      (
        CASE WHEN pr.is_premium = true AND pr.premium_expires_at > NOW() THEN 80 ELSE 0 END +
        COALESCE(p.boost_amount,0) * 2 +
        CASE WHEN EXISTS (SELECT 1 FROM connections c
          WHERE (c.user1_id = p_user_id AND c.user2_id = p.user_id)
             OR (c.user2_id = p_user_id AND c.user1_id = p.user_id)) THEN 50 ELSE 0 END +
        (COALESCE(p.likes_count,0) + COALESCE(p.comments_count,0)*2 + COALESCE(p.shares_count,0)*3) * 0.5 +
        GREATEST(0, 100 - EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600)
      )::numeric AS score
    FROM (SELECT * FROM posts WHERE status = 'active'
            AND (visibility = 'public' OR user_id = p_user_id)
          ORDER BY created_at DESC LIMIT 500) p
    LEFT JOIN profiles pr ON pr.user_id = p.user_id
  ), ranked AS (
    SELECT s.*, ROW_NUMBER() OVER (PARTITION BY s.user_id ORDER BY s.score DESC, s.created_at DESC) AS author_rank
    FROM scored s
  )
  SELECT r.id, r.user_id, r.content_type, r.title, r.content, r.media_urls, r.metadata,
    r.likes_count, r.comments_count, r.shares_count, r.views_count, r.status,
    r.created_at, r.updated_at, r.visibility, r.boost_amount, r.boosted_at,
    (r.score * POWER(0.4, r.author_rank - 1))::numeric AS relevance_score
  FROM ranked r
  ORDER BY (r.author_rank > 2), (r.score * POWER(0.4, r.author_rank - 1)) DESC, r.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$function$;