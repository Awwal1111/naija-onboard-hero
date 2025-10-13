-- Fix foreign key to reference profiles instead of auth.users

-- Drop the existing foreign key that references auth.users
ALTER TABLE public.social_tasks_progress
DROP CONSTRAINT IF EXISTS social_tasks_progress_earner_id_fkey;

-- Add new foreign key referencing public.profiles(user_id)
ALTER TABLE public.social_tasks_progress
ADD CONSTRAINT social_tasks_progress_earner_id_fkey
FOREIGN KEY (earner_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Create index for better query performance if not exists
CREATE INDEX IF NOT EXISTS idx_social_tasks_progress_earner_id ON public.social_tasks_progress(earner_id);
CREATE INDEX IF NOT EXISTS idx_social_tasks_progress_task_id ON public.social_tasks_progress(task_id);
CREATE INDEX IF NOT EXISTS idx_social_tasks_progress_status ON public.social_tasks_progress(status);