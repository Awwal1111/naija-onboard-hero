-- Fix user_roles RLS policies to prevent infinite recursion
-- The issue is that policies are querying the same table they're protecting

-- Drop all existing policies on user_roles
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Recreate simple, non-recursive policies
-- Users can always view their own roles (no recursion)
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all roles (using security definer function to avoid recursion)
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.is_admin_user());

-- Admins can manage all roles (using security definer function)
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.is_admin_user());