
-- Fix storage RLS policies for all buckets (revised)

-- 1. Feed bucket policies (MISSING - this is the main issue!)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload to Feed'
  ) THEN
    CREATE POLICY "Authenticated users can upload to Feed"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'Feed' 
      AND auth.role() = 'authenticated'
    );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Anyone can view Feed files'
  ) THEN
    CREATE POLICY "Anyone can view Feed files"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'Feed');
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update their own Feed files'
  ) THEN
    CREATE POLICY "Users can update their own Feed files"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'Feed' 
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete their own Feed files'
  ) THEN
    CREATE POLICY "Users can delete their own Feed files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'Feed' 
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;

-- 2. Profiles bucket - enhance policies
DROP POLICY IF EXISTS "Users can upload their own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile pictures" ON storage.objects;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can upload to profiles bucket'
  ) THEN
    CREATE POLICY "Users can upload to profiles bucket"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'profiles' 
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can view profile pictures'
  ) THEN
    CREATE POLICY "Users can view profile pictures"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'profiles');
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update their profile pictures v2'
  ) THEN
    CREATE POLICY "Users can update their profile pictures v2"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'profiles' 
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete their profile pictures'
  ) THEN
    CREATE POLICY "Users can delete their profile pictures"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'profiles' 
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;

-- 3. Chat-uploads bucket - enhance existing policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can update their chat uploads'
  ) THEN
    CREATE POLICY "Users can update their chat uploads"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'chat-uploads' 
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can delete their chat uploads'
  ) THEN
    CREATE POLICY "Users can delete their chat uploads"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'chat-uploads' 
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;
