-- Make stories bucket public so stories can be viewed by all users
UPDATE storage.buckets 
SET public = true 
WHERE id = 'stories';

-- Update storage policies for better social media-like behavior
-- Drop old policies
DROP POLICY IF EXISTS "Authenticated users can view stories" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload stories" ON storage.objects;

-- All authenticated users can view stories (like Instagram/Facebook)
CREATE POLICY "All users can view stories"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'stories');

-- Authenticated users can upload their own stories
CREATE POLICY "Users can upload their own stories"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'stories' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);