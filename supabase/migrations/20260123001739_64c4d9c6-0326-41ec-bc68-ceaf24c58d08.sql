-- Allow admin users to delete any gig from jobs_services
-- Uses the user_roles table which is the source of truth for admin status
CREATE POLICY "Admins can delete any gig"
ON public.jobs_services
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Also add update policy for admins to manage gig status
CREATE POLICY "Admins can update any gig" 
ON public.jobs_services 
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);