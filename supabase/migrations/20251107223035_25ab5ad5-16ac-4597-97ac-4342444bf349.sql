-- Update chat-media bucket to be private (not public)
UPDATE storage.buckets 
SET public = false 
WHERE id = 'chat-media';

-- Verify the bucket is now private
-- This ensures that only signed URLs will work, not public URLs