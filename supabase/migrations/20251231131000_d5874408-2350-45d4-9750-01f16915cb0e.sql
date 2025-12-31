-- Add boost fields to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS boost_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS boosted_at timestamp with time zone;

-- Create index for boosted posts ranking
CREATE INDEX IF NOT EXISTS idx_posts_boost_amount ON public.posts(boost_amount DESC NULLS LAST);

-- Drop and recreate get_personalized_feed function with boost support
DROP FUNCTION IF EXISTS public.get_personalized_feed(uuid, integer, integer);

CREATE FUNCTION public.get_personalized_feed(p_user_id uuid, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
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
      COALESCE(p.boost_amount, 0) * 2 +
      CASE WHEN EXISTS (
        SELECT 1 FROM connections c 
        WHERE (c.user1_id = p_user_id AND c.user2_id = p.user_id)
           OR (c.user2_id = p_user_id AND c.user1_id = p.user_id)
      ) THEN 50 ELSE 0 END +
      (COALESCE(p.likes_count, 0) + COALESCE(p.comments_count, 0) * 2 + COALESCE(p.shares_count, 0) * 3) * 0.5 +
      GREATEST(0, 100 - EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600)
    )::numeric as relevance_score
  FROM posts p
  WHERE p.status = 'active'
    AND (p.visibility = 'public' OR p.user_id = p_user_id)
  ORDER BY 
    COALESCE(p.boost_amount, 0) DESC,
    relevance_score DESC,
    p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;