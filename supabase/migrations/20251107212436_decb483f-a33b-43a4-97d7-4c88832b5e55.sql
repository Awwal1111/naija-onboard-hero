-- Allow anonymous users to view basic public profile information
-- This is needed so the experts listing page works for non-logged-in users
DROP POLICY IF EXISTS "Anyone can view basic public profile info" ON profiles;

CREATE POLICY "Anyone can view basic public profile info" 
ON profiles 
FOR SELECT 
TO public
USING (true);