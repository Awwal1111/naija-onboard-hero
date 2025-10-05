-- 1. GRANT ADMIN ACCESS to gulajusurajo@gmail.com
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'gulajusurajo@gmail.com' 
  LIMIT 1;
  
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin role granted to user: %', admin_user_id;
  END IF;
END $$;

-- 2. FIX STORAGE POLICIES for referral-tasks and social-media-tasks buckets
DROP POLICY IF EXISTS "Users can upload their own referral task files" ON storage.objects;
CREATE POLICY "Users can upload their own referral task files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'referral-tasks' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can upload their own social media task files" ON storage.objects;
CREATE POLICY "Users can upload their own social media task files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'social-media-tasks' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can view their own referral task files" ON storage.objects;
CREATE POLICY "Users can view their own referral task files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'referral-tasks' 
  AND (auth.uid()::text = (storage.foldername(name))[1] OR is_admin_user())
);

DROP POLICY IF EXISTS "Users can view their own social media task files" ON storage.objects;
CREATE POLICY "Users can view their own social media task files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'social-media-tasks' 
  AND (auth.uid()::text = (storage.foldername(name))[1] OR is_admin_user())
);

-- 3. FIX RLS for connection_requests table
DROP POLICY IF EXISTS "Users can view their own connection requests" ON public.connection_requests;
CREATE POLICY "Users can view their connection requests"
ON public.connection_requests FOR SELECT
TO authenticated
USING (
  auth.uid() = requester_id 
  OR auth.uid() = requested_id
);

-- 4. FIX RLS for groups table
DROP POLICY IF EXISTS "Groups are viewable by authenticated users" ON public.groups;
CREATE POLICY "Authenticated users can view active groups"
ON public.groups FOR SELECT
TO authenticated
USING (is_active = true);

-- 5. FIX RLS for group_members
DROP POLICY IF EXISTS "Group members can view their memberships" ON public.group_members;
CREATE POLICY "Users can view group memberships"
ON public.group_members FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR group_id IN (
    SELECT group_id FROM public.group_members WHERE user_id = auth.uid() AND is_active = true
  )
);