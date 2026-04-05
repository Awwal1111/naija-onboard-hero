
-- Fix ads admin policy: profiles.id should be profiles.user_id
DROP POLICY IF EXISTS "Admins can manage ads" ON public.ads;

CREATE POLICY "Admins can manage ads" ON public.ads
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Add admin delete policy for posts
CREATE POLICY "Admins can delete any post" ON public.posts
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Remove duplicate internal mini apps from database (these are handled as built-in platform features)
DELETE FROM public.mini_apps WHERE app_url LIKE 'internal://%';
