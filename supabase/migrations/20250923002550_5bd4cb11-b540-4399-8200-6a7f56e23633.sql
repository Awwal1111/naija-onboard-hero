-- Add INSERT policy for user_wallets table
CREATE POLICY "Users can create their own wallet" ON public.user_wallets
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);