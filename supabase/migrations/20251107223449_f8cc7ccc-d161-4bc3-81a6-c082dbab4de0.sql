-- Update referral-tasks bucket to be private (not public)
UPDATE storage.buckets 
SET public = false 
WHERE id = 'referral-tasks';

-- Verify the bucket is now private
-- This ensures that only signed URLs will work, not public URLs