-- Add columns to referral_tasks for user-created tasks
ALTER TABLE public.referral_tasks 
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS total_slots INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS done_slots INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_admin_created BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS fee_paid NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS auto_approve_at TIMESTAMP WITH TIME ZONE;

-- Add column to referral_submissions for tracking approver (task creator or admin)
ALTER TABLE public.referral_submissions 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Update RLS policies for referral_tasks to allow users to create tasks
DROP POLICY IF EXISTS "Users can view active referral tasks" ON public.referral_tasks;
DROP POLICY IF EXISTS "Users can create their own tasks" ON public.referral_tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.referral_tasks;

-- Anyone authenticated can view active tasks
CREATE POLICY "Users can view active referral tasks"
ON public.referral_tasks
FOR SELECT
TO authenticated
USING (status = 'active' OR creator_id = auth.uid() OR is_admin_user());

-- Users can create tasks (will deduct balance in code)
CREATE POLICY "Users can create their own tasks"
ON public.referral_tasks
FOR INSERT
TO authenticated
WITH CHECK (creator_id = auth.uid() OR is_admin_user());

-- Users can update their own tasks, admins can update all
CREATE POLICY "Users can update their own tasks"
ON public.referral_tasks
FOR UPDATE
TO authenticated
USING (creator_id = auth.uid() OR is_admin_user())
WITH CHECK (creator_id = auth.uid() OR is_admin_user());

-- Update RLS policies for referral_submissions
DROP POLICY IF EXISTS "Users can view their own submissions" ON public.referral_submissions;
DROP POLICY IF EXISTS "Task creators can view submissions for their tasks" ON public.referral_submissions;
DROP POLICY IF EXISTS "Task creators can update submissions for their tasks" ON public.referral_submissions;

-- Users can view their own submissions
CREATE POLICY "Users can view their own submissions"
ON public.referral_submissions
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR 
  is_admin_user() OR
  EXISTS (
    SELECT 1 FROM public.referral_tasks 
    WHERE id = referral_submissions.task_id 
    AND creator_id = auth.uid()
  )
);

-- Task creators can update submissions for their tasks (approve/reject)
CREATE POLICY "Task creators can update submissions for their tasks"
ON public.referral_submissions
FOR UPDATE
TO authenticated
USING (
  is_admin_user() OR
  EXISTS (
    SELECT 1 FROM public.referral_tasks 
    WHERE id = referral_submissions.task_id 
    AND creator_id = auth.uid()
  )
)
WITH CHECK (
  is_admin_user() OR
  EXISTS (
    SELECT 1 FROM public.referral_tasks 
    WHERE id = referral_submissions.task_id 
    AND creator_id = auth.uid()
  )
);

-- Create function for auto-approving tasks after 24 hours
CREATE OR REPLACE FUNCTION public.auto_approve_user_task_submissions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  submission RECORD;
  task_reward NUMERIC;
BEGIN
  -- Find pending submissions older than 24 hours for user-created tasks
  FOR submission IN
    SELECT rs.*, rt.reward, rt.creator_id, rt.id as task_id
    FROM referral_submissions rs
    JOIN referral_tasks rt ON rs.task_id = rt.id
    WHERE rs.status = 'pending'
    AND rt.is_admin_created = false
    AND rs.created_at < NOW() - INTERVAL '24 hours'
  LOOP
    -- Update submission status
    UPDATE referral_submissions
    SET status = 'approved',
        admin_comment = 'Auto-approved after 24 hours',
        approved_at = NOW()
    WHERE id = submission.id;

    -- Credit user wallet (withdrawable balance)
    UPDATE profiles
    SET wallet_balance = wallet_balance + submission.reward,
        balance_withdrawable = balance_withdrawable + submission.reward
    WHERE user_id = submission.user_id;

    -- Log transaction
    INSERT INTO wallet_transactions (user_id, amount, kind, status, reference)
    VALUES (
      submission.user_id,
      submission.reward,
      'task_reward',
      'completed',
      'Task reward (auto-approved)'
    );

    -- Update task done_slots
    UPDATE referral_tasks
    SET done_slots = done_slots + 1
    WHERE id = submission.task_id;
  END LOOP;
END;
$$;