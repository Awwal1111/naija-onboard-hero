
-- admin_wallet: restrict to authenticated
DROP POLICY IF EXISTS "Only admins can view admin wallet" ON public.admin_wallet;
DROP POLICY IF EXISTS "Only admins can manage admin wallet" ON public.admin_wallet;

CREATE POLICY "Only admins can view admin wallet"
ON public.admin_wallet FOR SELECT
TO authenticated
USING (public.has_admin_access());

CREATE POLICY "Only admins can manage admin wallet"
ON public.admin_wallet FOR ALL
TO authenticated
USING (public.has_admin_access())
WITH CHECK (public.has_admin_access());

-- admin_stats: restrict to authenticated
DROP POLICY IF EXISTS "Admins can view stats" ON public.admin_stats;

CREATE POLICY "Admins can view stats"
ON public.admin_stats FOR SELECT
TO authenticated
USING (public.has_admin_access());

-- admin_invitations: restrict to authenticated
DROP POLICY IF EXISTS "Admins can view all invitations" ON public.admin_invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON public.admin_invitations;

CREATE POLICY "Admins can view all invitations"
ON public.admin_invitations FOR SELECT
TO authenticated
USING (public.has_admin_access());

CREATE POLICY "Admins can update invitations"
ON public.admin_invitations FOR UPDATE
TO authenticated
USING (public.has_admin_access());

-- Fix mutable search_path on functions
DO $$ BEGIN
  ALTER FUNCTION public.handle_new_user() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
