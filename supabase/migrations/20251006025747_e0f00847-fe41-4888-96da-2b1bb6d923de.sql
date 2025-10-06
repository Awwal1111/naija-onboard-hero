
-- Fix infinite recursion and visibility issues for expert_applications, connection_requests, and groups

-- 1. Drop problematic policies that cause recursion
DROP POLICY IF EXISTS "Users can view group memberships" ON group_members;
DROP POLICY IF EXISTS "Users can leave groups or leads can remove members" ON group_members;

-- 2. Create security definer function to check group membership (avoids recursion)
CREATE OR REPLACE FUNCTION public.is_group_member_check(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = p_group_id 
    AND user_id = p_user_id 
    AND is_active = true
  );
$$;

-- 3. Create security definer function to check if user is group lead
CREATE OR REPLACE FUNCTION public.is_group_lead_check(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = p_group_id 
    AND group_lead_id = p_user_id
  );
$$;

-- 4. Fix group_members policies with security definer functions
CREATE POLICY "Users can view group memberships v2"
ON group_members FOR SELECT
USING (
  auth.uid() = user_id  -- Can see own membership
  OR public.is_admin_user()  -- Admins can see all
);

CREATE POLICY "Users can leave groups or leads can remove members v2"
ON group_members FOR UPDATE
USING (
  auth.uid() = user_id  -- Can update own membership
  OR public.is_group_lead_check(group_id, auth.uid())  -- Group leads can update
  OR public.is_admin_user()  -- Admins can update
);

-- 5. Fix connection_requests policies - make them consistent with authenticated role
DROP POLICY IF EXISTS "Users can create connection requests" ON connection_requests;
DROP POLICY IF EXISTS "Users can update their connection requests" ON connection_requests;
DROP POLICY IF EXISTS "Users can view their connection requests" ON connection_requests;

CREATE POLICY "Users can create connection requests v2"
ON connection_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update their connection requests v2"
ON connection_requests FOR UPDATE
TO authenticated
USING (auth.uid() = requested_id OR auth.uid() = requester_id);

CREATE POLICY "Users can view their connection requests v2"
ON connection_requests FOR SELECT
TO authenticated
USING (
  auth.uid() = requester_id 
  OR auth.uid() = requested_id
  OR public.is_admin_user()
);

-- 6. Fix expert_applications visibility for admin
DROP POLICY IF EXISTS "Admin can manage all expert applications" ON expert_applications;

CREATE POLICY "Admin can view and manage all expert applications"
ON expert_applications FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- 7. Ensure groups are visible to all authenticated users
DROP POLICY IF EXISTS "Admin can view all groups" ON groups;
DROP POLICY IF EXISTS "Authenticated users can view active groups" ON groups;

CREATE POLICY "All authenticated users can view active groups v2"
ON groups FOR SELECT
TO authenticated
USING (is_active = true OR public.is_admin_user());

-- 8. Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION public.is_group_member_check(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_lead_check(uuid, uuid) TO authenticated;
