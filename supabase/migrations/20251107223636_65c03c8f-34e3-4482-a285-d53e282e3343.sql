-- Add screenshot field to article submissions
ALTER TABLE public.article_submissions
ADD COLUMN IF NOT EXISTS screenshot_url text;

-- Create storage bucket for article submissions if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('article-submissions', 'article-submissions', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- RLS policies for article-submissions bucket
CREATE POLICY "Users can upload their article submission proof"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'article-submissions' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own article submission proof"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'article-submissions' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all article submission proof"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'article-submissions' AND
  is_admin_user()
);

CREATE POLICY "Admins can delete article submission proof"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'article-submissions' AND
  is_admin_user()
);