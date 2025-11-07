-- Create social-media-tasks storage bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('social-media-tasks', 'social-media-tasks', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload their own task screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own task screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all task screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own task screenshots" ON storage.objects;

-- Allow authenticated users to upload screenshots
CREATE POLICY "Users can upload their own task screenshots"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'social-media-tasks' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own screenshots
CREATE POLICY "Users can view their own task screenshots"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'social-media-tasks' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow admins to view all task screenshots
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

-- Allow users to delete their own screenshots
CREATE POLICY "Users can delete their own task screenshots"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'social-media-tasks' AND
  auth.uid()::text = (storage.foldername(name))[1]
);