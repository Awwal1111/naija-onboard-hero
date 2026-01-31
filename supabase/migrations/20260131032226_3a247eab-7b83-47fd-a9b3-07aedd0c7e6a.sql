-- Fix Status bucket policies for photo uploads
CREATE POLICY "Anyone can view Status files"
ON storage.objects FOR SELECT
USING (bucket_id = 'Status');

CREATE POLICY "Authenticated users can upload Status files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'Status' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own Status files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'Status' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own Status files"
ON storage.objects FOR DELETE
USING (bucket_id = 'Status' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Fix Admin social tasks - allow admins to update and delete any task
CREATE POLICY "Admins can update any social task"
ON public.social_tasks
FOR UPDATE
USING (is_admin_user());

CREATE POLICY "Admins can delete any social task"
ON public.social_tasks
FOR DELETE
USING (is_admin_user());