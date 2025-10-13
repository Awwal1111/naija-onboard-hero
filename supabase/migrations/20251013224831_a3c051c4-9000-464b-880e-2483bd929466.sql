-- ============================================
-- Fix transactions table access control
-- ============================================

-- Drop existing overly permissive policy
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'transactions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.transactions', pol.policyname);
  END LOOP;
END $$;

-- Create strict policy: users can only view their own transactions
CREATE POLICY "Users can view own transactions only"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR public.is_admin_user()
);

CREATE POLICY "System can insert transactions"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Secure admin_wallet table
-- ============================================

-- Enable RLS on admin_wallet
ALTER TABLE public.admin_wallet ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Only admins can view admin wallet" ON public.admin_wallet;
DROP POLICY IF EXISTS "Only admins can manage admin wallet" ON public.admin_wallet;

-- Create admin-only policies
CREATE POLICY "Only admins can view admin wallet"
ON public.admin_wallet
FOR SELECT
TO authenticated
USING (public.is_admin_user());

CREATE POLICY "Only admins can manage admin wallet"
ON public.admin_wallet
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- ============================================
-- Fix remaining tables with RLS but no policies
-- ============================================

-- Ensure safepay_actions has proper RLS
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'safepay_actions'
  ) THEN
    ALTER TABLE public.safepay_actions ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view safepay actions" ON public.safepay_actions;
    
    CREATE POLICY "Participants can view safepay actions"
    ON public.safepay_actions
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.safepay_transactions st
        WHERE st.id = safepay_actions.escrow_id
        AND (st.buyer_id = auth.uid() OR st.seller_id = auth.uid())
      )
      OR public.is_admin_user()
    );
  END IF;
END $$;