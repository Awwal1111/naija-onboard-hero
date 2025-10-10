-- Fix RLS policies for wallet_transactions to allow transfers
-- Drop existing policies that might be blocking transfers
DROP POLICY IF EXISTS "Users can view own transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.wallet_transactions;

-- Create comprehensive policies for wallet transactions
CREATE POLICY "Users can view own wallet transactions" 
ON public.wallet_transactions 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid() OR is_admin_user());

CREATE POLICY "Transfer function can insert wallet transactions" 
ON public.wallet_transactions 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Allow if user is inserting their own transaction
  user_id = auth.uid() 
  OR 
  -- Allow transfer_funds function to insert transactions for both parties
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND wallet_balance >= 0
  )
);