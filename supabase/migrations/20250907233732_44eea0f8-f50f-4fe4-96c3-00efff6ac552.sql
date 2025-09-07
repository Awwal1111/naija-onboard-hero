-- Fix RLS policies for expert directory access

-- Update the policy to specifically allow authenticated users to view approved expert applications
DROP POLICY IF EXISTS "Anyone can view approved expert applications" ON public.expert_applications;

CREATE POLICY "Authenticated users can view approved expert applications" 
ON public.expert_applications 
FOR SELECT 
TO authenticated
USING (status = 'approved');

-- Drop the overly restrictive profiles policies and create a simple one for expert directory
DROP POLICY IF EXISTS "Limited public discovery" ON public.profiles;
DROP POLICY IF EXISTS "Users can view connected users basic info" ON public.profiles;

CREATE POLICY "Profiles viewable for expert directory" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);