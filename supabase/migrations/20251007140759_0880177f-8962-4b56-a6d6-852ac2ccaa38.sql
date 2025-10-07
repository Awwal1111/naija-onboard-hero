-- Fix storage policies for referral-tasks bucket

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload referral task proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own referral task proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all referral task proofs" ON storage.objects;

-- Allow authenticated users to upload to their own folder in referral-tasks bucket
CREATE POLICY "Authenticated users can upload referral task proofs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'referral-tasks' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own uploaded proofs
CREATE POLICY "Users can view their own referral task proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'referral-tasks' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow admins to view all referral task proofs
CREATE POLICY "Admins can view all referral task proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'referral-tasks' 
  AND is_admin_user()
);