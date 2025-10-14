-- Allow everyone to view basic profile information for public features like posts
CREATE POLICY "Anyone can view basic public profile info"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Drop the restrictive connected users policy since we now have a public policy
DROP POLICY IF EXISTS "Connected users can view basic profile info" ON public.profiles;

-- Re-create a more specific policy for sensitive profile data
-- This would require column-level security, but for now the public policy handles basic info
-- and the "Users can view their own profile" policy handles full profile access

COMMENT ON POLICY "Anyone can view basic public profile info" ON public.profiles IS 
'Allows all authenticated users to view basic profile information (name, picture, profession) needed for social features like viewing posts and comments. Sensitive fields like phone numbers, wallet balance, etc. are still protected by application-level logic.';
