-- Migrate existing data from jobs table to jobs_services (gigs)
-- This preserves user data that was incorrectly stored in the jobs table

INSERT INTO public.jobs_services (id, user_id, title, description, price, category, status, created_at, updated_at)
SELECT 
  id,
  user_id,
  title,
  description,
  COALESCE(budget_min, 5000), -- Use budget_min as price, default to 5000 if null
  COALESCE(job_type, 'Other'), -- Use job_type as category, default to 'Other'
  CASE WHEN status = 'open' THEN 'active' ELSE status END, -- Convert 'open' to 'active'
  created_at,
  COALESCE(updated_at, created_at)
FROM public.jobs
WHERE NOT EXISTS (
  SELECT 1 FROM public.jobs_services js WHERE js.id = jobs.id
)
ON CONFLICT (id) DO NOTHING;