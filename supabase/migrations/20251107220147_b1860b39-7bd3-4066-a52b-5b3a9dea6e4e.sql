-- Create referral-tasks storage bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('referral-tasks', 'referral-tasks', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can upload their own referral proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own referral proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all referral proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own referral proofs" ON storage.objects;

-- Allow authenticated users to upload their proofs
CREATE POLICY "Users can upload their own referral proofs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'referral-tasks' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own proofs
CREATE POLICY "Users can view their own referral proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'referral-tasks' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow admins to view all referral proofs
CREATE POLICY "Admins can view all referral proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'referral-tasks' AND
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Allow users to delete their own proofs
CREATE POLICY "Users can delete their own referral proofs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'referral-tasks' AND
  auth.uid()::text = (storage.foldername(name))[1]
);