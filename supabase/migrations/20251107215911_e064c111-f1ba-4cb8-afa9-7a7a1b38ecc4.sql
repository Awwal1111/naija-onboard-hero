-- Fix admin access to view all social media task screenshots
-- Drop the restrictive admin policy
DROP POLICY IF EXISTS "Admins can view all task screenshots" ON storage.objects;

-- Create a proper admin policy that allows viewing ALL files in the bucket
CREATE POLICY "Admins can view all task screenshots"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'social-media-tasks' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);