-- Fix social_tasks table structure and add RLS policies
-- Add missing columns to social_tasks
ALTER TABLE public.social_tasks 
  ADD COLUMN IF NOT EXISTS reward_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_paid numeric DEFAULT 0;

-- Update existing rows to use reward as reward_amount if reward_amount is 0
UPDATE public.social_tasks 
SET reward_amount = reward 
WHERE reward_amount = 0 OR reward_amount IS NULL;

-- Create RLS policies for social_tasks
CREATE POLICY "Users can view active social tasks"
  ON public.social_tasks
  FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE POLICY "Users can create their own social tasks"
  ON public.social_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = task_giver_id);

CREATE POLICY "Task creators can update their own tasks"
  ON public.social_tasks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = task_giver_id);

CREATE POLICY "Admins can view all social tasks"
  ON public.social_tasks
  FOR SELECT
  TO authenticated
  USING (is_admin_user());

-- Create RLS policies for social_tasks_progress
CREATE POLICY "Users can view their own progress"
  ON public.social_tasks_progress
  FOR SELECT
  TO authenticated
  USING (auth.uid() = earner_id);

CREATE POLICY "Users can create their own progress entries"
  ON public.social_tasks_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = earner_id);

CREATE POLICY "Users can update their own progress"
  ON public.social_tasks_progress
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = earner_id);

CREATE POLICY "Admins can view all progress entries"
  ON public.social_tasks_progress
  FOR SELECT
  TO authenticated
  USING (is_admin_user());

CREATE POLICY "Admins can update all progress entries"
  ON public.social_tasks_progress
  FOR UPDATE
  TO authenticated
  USING (is_admin_user());

-- Grant necessary permissions
GRANT ALL ON public.social_tasks TO authenticated;
GRANT ALL ON public.social_tasks_progress TO authenticated;