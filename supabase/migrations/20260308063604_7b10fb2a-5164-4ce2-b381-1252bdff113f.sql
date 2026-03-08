
-- Drop the problematic INSERT policies and recreate properly
DROP POLICY IF EXISTS "Authenticated users can upload stories" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own stories" ON storage.objects;

-- Create a single correct INSERT policy
CREATE POLICY "Users can upload to stories bucket"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'stories' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Clean up expired stories
DELETE FROM stories WHERE expires_at < NOW();
