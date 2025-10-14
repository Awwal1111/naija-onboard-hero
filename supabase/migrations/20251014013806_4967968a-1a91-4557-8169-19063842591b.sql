-- Fix RLS policy to allow anyone to view approved expert applications
DROP POLICY IF EXISTS "Limited view of approved expert applications" ON public.expert_applications;

CREATE POLICY "Anyone can view approved expert applications"
ON public.expert_applications
FOR SELECT
USING (status = 'approved');