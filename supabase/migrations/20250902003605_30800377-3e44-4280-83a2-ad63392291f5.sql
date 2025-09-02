-- Enable pgcrypto extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('profiles', 'profiles', false, 52428800, ARRAY['image/*']), -- 50MB limit
  ('stories', 'stories', false, 104857600, ARRAY['image/*', 'video/*']), -- 100MB limit  
  ('business-uploads', 'business-uploads', false, 52428800, ARRAY['image/*', 'video/*', 'application/pdf']),
  ('training-files', 'training-files', true, 104857600, ARRAY['image/*', 'video/*', 'application/pdf', 'audio/*']),
  ('chat-uploads', 'chat-uploads', false, 52428800, ARRAY['image/*', 'video/*', 'application/pdf', 'audio/*'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for Profiles bucket (private - only owner can upload/view)
CREATE POLICY "Users can upload their own profile images"
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'profiles' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own profile images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'profiles' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own profile images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profiles' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profiles' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for Stories bucket (shared - all authenticated users can upload/view)
CREATE POLICY "Authenticated users can upload stories"
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'stories' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can view stories"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'stories' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own stories"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'stories' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own stories"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'stories' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for Business uploads bucket (shared)
CREATE POLICY "Authenticated users can upload business files"
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'business-uploads' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can view business files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'business-uploads' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own business files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'business-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own business files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'business-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for Training files bucket (public view, authenticated upload)
CREATE POLICY "Anyone can view training files"
ON storage.objects FOR SELECT
USING (bucket_id = 'training-files');

CREATE POLICY "Authenticated users can upload training files"
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'training-files' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own training files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'training-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own training files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'training-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for Chat uploads bucket (private - only sender + receiver can view)
CREATE POLICY "Users can upload chat files"
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'chat-uploads' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Chat participants can view files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-uploads' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM messages m
      JOIN chats c ON m.chat_id = c.id
      WHERE (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
      AND name LIKE '%' || m.id::text || '%'
    )
  )
);

CREATE POLICY "Users can update their own chat files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'chat-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own chat files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Fix any issues with the generate_referral_code function
DROP FUNCTION IF EXISTS public.generate_referral_code();

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 8-character code using pgcrypto
    code := upper(substring(encode(gen_random_bytes(6), 'base64') from 1 for 8));
    -- Remove any problematic characters
    code := replace(replace(replace(code, '/', ''), '+', ''), '=', '');
    -- Ensure we have at least 6 characters
    IF length(code) >= 6 THEN
      code := substring(code from 1 for 8);
      -- Check if it already exists
      SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = code) INTO exists;
      EXIT WHEN NOT exists;
    END IF;
  END LOOP;
  RETURN code;
END;
$$;