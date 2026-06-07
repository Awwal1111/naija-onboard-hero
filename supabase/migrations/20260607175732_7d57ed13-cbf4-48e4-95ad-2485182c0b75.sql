
CREATE OR REPLACE FUNCTION public.get_landing_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM public.profiles),
    'completed_jobs', COALESCE((SELECT sum(completed_jobs_count) FROM public.profiles WHERE completed_jobs_count > 0), 0),
    'total_paid_out', COALESCE((SELECT sum(total_earnings) FROM public.profiles WHERE total_earnings > 0), 0),
    'avg_user_rating', COALESCE((SELECT round(avg(average_rating)::numeric, 1) FROM public.profiles WHERE average_rating > 0), 4.8),
    'platform_rating_avg', COALESCE((SELECT round(avg(rating)::numeric, 1) FROM public.platform_ratings), 0),
    'platform_rating_count', (SELECT count(*) FROM public.platform_ratings)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_landing_stats() TO anon, authenticated, service_role;
