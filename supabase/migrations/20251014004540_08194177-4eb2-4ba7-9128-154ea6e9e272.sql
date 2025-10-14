-- Ensure portfolio storage bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('portfolio', 'portfolio', true, 52428800, ARRAY['image/*', 'video/*', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view portfolio files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload portfolio" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own portfolio" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own portfolio" ON storage.objects;

-- Create RLS policies for portfolio bucket
CREATE POLICY "Anyone can view portfolio files"
ON storage.objects FOR SELECT
USING (bucket_id = 'portfolio');

CREATE POLICY "Authenticated users can upload portfolio"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'portfolio' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own portfolio"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'portfolio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own portfolio"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'portfolio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);