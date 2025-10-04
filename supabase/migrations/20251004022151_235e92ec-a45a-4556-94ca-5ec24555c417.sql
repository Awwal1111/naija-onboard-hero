-- ============================================
-- COMPREHENSIVE FIX FOR ALL CRITICAL ISSUES
-- ============================================

-- 1. FIX ADMIN ACCESS
-- Ensure user_roles table exists and has correct structure
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'moderator', 'user')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;

-- Create RLS policies for user_roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

-- Ensure admin user exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'gulajusurajo@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Fix is_admin_user function
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- 2. FIX SOCIAL MEDIA TASKS PROOF SUBMISSION
-- Add text_explanation column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'social_tasks_progress' 
    AND column_name = 'text_explanation'
  ) THEN
    ALTER TABLE public.social_tasks_progress 
    ADD COLUMN text_explanation text;
  END IF;
END $$;

-- 3. FIX REFERRAL TASKS PROOF SUBMISSION
-- Ensure referral_submissions table exists
CREATE TABLE IF NOT EXISTS public.referral_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id integer NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  screenshot_url text,
  text_explanation text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on referral_submissions
ALTER TABLE public.referral_submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own submissions" ON public.referral_submissions;
DROP POLICY IF EXISTS "Users can create submissions" ON public.referral_submissions;
DROP POLICY IF EXISTS "Admins can view all submissions" ON public.referral_submissions;
DROP POLICY IF EXISTS "Admins can update submissions" ON public.referral_submissions;

-- Create RLS policies for referral_submissions
CREATE POLICY "Users can view their own submissions"
  ON public.referral_submissions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create submissions"
  ON public.referral_submissions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all submissions"
  ON public.referral_submissions FOR SELECT
  USING (public.is_admin_user());

CREATE POLICY "Admins can update submissions"
  ON public.referral_submissions FOR UPDATE
  USING (public.is_admin_user());

-- 4. FIX STORAGE RLS POLICIES (Remove infinite recursion)
-- Create security definer function to check group membership
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id 
    AND user_id = p_user_id 
    AND is_active = true
  );
$$;

-- Fix storage.objects policies to avoid infinite recursion
DROP POLICY IF EXISTS "Users can upload to their folder in profiles" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their folder in social-media-tasks" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their folder in referral-tasks" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their folder in group-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Group members can upload to group folders" ON storage.objects;

-- Create non-recursive storage policies
CREATE POLICY "Users can upload to profiles"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profiles' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload to social-media-tasks"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'social-media-tasks'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload to referral-tasks"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'referral-tasks'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload to group-uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'group-uploads'
    AND auth.uid() IS NOT NULL
  );

-- 5. ENSURE ALL REQUIRED STORAGE BUCKETS EXIST
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('profiles', 'profiles', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('social-media-tasks', 'social-media-tasks', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('referral-tasks', 'referral-tasks', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('group-uploads', 'group-uploads', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime'])
ON CONFLICT (id) DO NOTHING;

-- Grant authenticated users access to storage
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;