-- Add RLS policies for admins to manage referral tasks

-- Admins can view all referral tasks (including inactive)
CREATE POLICY "Admins can view all referral tasks"
ON public.referral_tasks
FOR SELECT
TO authenticated
USING (is_admin_user());

-- Admins can insert referral tasks
CREATE POLICY "Admins can create referral tasks"
ON public.referral_tasks
FOR INSERT
TO authenticated
WITH CHECK (is_admin_user());

-- Admins can update referral tasks
CREATE POLICY "Admins can update referral tasks"
ON public.referral_tasks
FOR UPDATE
TO authenticated
USING (is_admin_user())
WITH CHECK (is_admin_user());

-- Admins can delete referral tasks
CREATE POLICY "Admins can delete referral tasks"
ON public.referral_tasks
FOR DELETE
TO authenticated
USING (is_admin_user());