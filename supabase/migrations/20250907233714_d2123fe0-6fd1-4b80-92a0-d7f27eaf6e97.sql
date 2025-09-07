-- Fix RLS policies for expert directory access

-- Update the policy to specifically allow authenticated users to view approved expert applications
DROP POLICY IF EXISTS "Anyone can view approved expert applications" ON public.expert_applications;

CREATE POLICY "Authenticated users can view approved expert applications" 
ON public.expert_applications 
FOR SELECT 
TO authenticated
USING (status = 'approved');

-- Ensure profiles are accessible for the expert directory
CREATE POLICY IF NOT EXISTS "Profiles viewable for expert directory" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);