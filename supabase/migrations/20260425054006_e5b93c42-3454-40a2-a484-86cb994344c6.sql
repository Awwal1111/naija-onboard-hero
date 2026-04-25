
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY user_id, lower(trim(title)) ORDER BY created_at ASC) AS rn
  FROM public.jobs_services
  WHERE status IN ('active','under_review')
)
DELETE FROM public.jobs_services WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_services_unique_active_title
  ON public.jobs_services (user_id, lower(trim(title)))
  WHERE status IN ('active', 'under_review');
