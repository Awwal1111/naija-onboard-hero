-- ============================================
-- CRITICAL SECURITY FIX: Restrict access to profiles table
-- ============================================

-- Drop ALL existing policies on profiles
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

-- Create strict RLS policies for profiles table
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Connected users can view basic profile info"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.users_are_connected(auth.uid(), user_id)
  OR public.is_admin_user()
);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Fix expert_applications access control
-- ============================================

DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'expert_applications'
    AND policyname IN (
      'Authenticated users can view approved expert applications',
      'Users can view approved applications'
    )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.expert_applications', pol.policyname);
  END LOOP;
END $$;

-- Restrict approved applications viewing to owners and admins only
CREATE POLICY "Limited view of approved expert applications"
ON public.expert_applications
FOR SELECT
TO authenticated
USING (
  (status = 'approved' AND user_id = auth.uid()) 
  OR public.is_admin_user()
);

-- ============================================
-- Fix wallets table anonymous access
-- ============================================

DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'wallets'
  ) THEN
    DROP POLICY IF EXISTS "wallet_self" ON public.wallets;
    
    CREATE POLICY "Users can manage their own wallet"
    ON public.wallets
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ============================================
-- Fix user_wallets table access
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'user_wallets'
  ) THEN
    ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view their own wallet" ON public.user_wallets;
    DROP POLICY IF EXISTS "Users can view their own user wallet" ON public.user_wallets;
    
    CREATE POLICY "Users can view their own user wallet"
    ON public.user_wallets
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
    
    CREATE POLICY "System can update user wallets"
    ON public.user_wallets
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;