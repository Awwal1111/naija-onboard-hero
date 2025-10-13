-- Clean up duplicate submissions - keep only the most recent one for each user-task pair

-- Delete older duplicate submissions, keeping only the newest
DELETE FROM public.social_tasks_progress
WHERE id NOT IN (
  SELECT DISTINCT ON (task_id, earner_id) id
  FROM public.social_tasks_progress
  ORDER BY task_id, earner_id, created_at DESC
);

-- Now add the unique constraint
ALTER TABLE public.social_tasks_progress
ADD CONSTRAINT social_tasks_progress_unique_submission 
UNIQUE (task_id, earner_id);

-- Add index for checking submission status
CREATE INDEX IF NOT EXISTS idx_social_tasks_progress_user_task 
ON public.social_tasks_progress(earner_id, task_id, status);