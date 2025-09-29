-- Fix admin policies to ensure admin can see all expert applications
DROP POLICY IF EXISTS "Admin can approve any expert app" ON public.expert_applications;
DROP POLICY IF EXISTS "Admins can approve any expert app" ON public.expert_applications;
DROP POLICY IF EXISTS "Admins can approve expert apps" ON public.expert_applications;
DROP POLICY IF EXISTS "Admins can update any expert app" ON public.expert_applications;

-- Create proper admin policy for expert applications
CREATE POLICY "Admin can manage all expert applications" 
ON public.expert_applications 
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Ensure expert applications are properly accessible for viewing by status
CREATE POLICY "Users can view approved applications" 
ON public.expert_applications 
FOR SELECT
TO authenticated
USING (status = 'approved');

-- Fix group messages visibility issue by adding admin policy
CREATE POLICY "Admin can view all groups" 
ON public.groups 
FOR SELECT
TO authenticated
USING (public.is_admin_user() OR is_active = true);

CREATE POLICY "Admin can view all group messages" 
ON public.group_messages 
FOR SELECT
TO authenticated
USING (
  public.is_admin_user() OR 
  (group_id IN ( 
    SELECT group_members.group_id
    FROM group_members
    WHERE group_members.user_id = auth.uid() AND group_members.is_active = true
  ) AND deleted_at IS NULL)
);