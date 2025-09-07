-- Add proper admin SELECT policy for expert applications
CREATE POLICY "Admin can view all expert applications" 
ON public.expert_applications 
FOR SELECT 
USING (is_admin_user());

-- Drop the old admin policy that uses JWT role check
DROP POLICY IF EXISTS "Admins can view any expert app" ON public.expert_applications;