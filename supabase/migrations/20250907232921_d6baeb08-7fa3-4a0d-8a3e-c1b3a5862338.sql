-- Allow all authenticated users to view approved expert applications for the experts directory
CREATE POLICY "Anyone can view approved expert applications" 
ON public.expert_applications 
FOR SELECT 
USING (status = 'approved');