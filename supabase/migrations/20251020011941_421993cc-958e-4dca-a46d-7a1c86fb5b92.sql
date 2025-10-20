-- Create table for crypto transactions
CREATE TABLE IF NOT EXISTS public.crypto_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal')),
  crypto_amount NUMERIC NOT NULL,
  crypto_currency TEXT NOT NULL CHECK (crypto_currency IN ('cUSD', 'CELO')),
  naira_amount NUMERIC NOT NULL,
  nc_amount NUMERIC NOT NULL,
  exchange_rate NUMERIC NOT NULL,
  wallet_address TEXT NOT NULL,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.crypto_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own crypto transactions
CREATE POLICY "Users can view their own crypto transactions"
ON public.crypto_transactions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create withdrawal requests
CREATE POLICY "Users can create withdrawal requests"
ON public.crypto_transactions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND transaction_type = 'withdrawal'
);

-- System can create deposits and update transactions
CREATE POLICY "Service role can manage all crypto transactions"
ON public.crypto_transactions
FOR ALL
USING (auth.role() = 'service_role');

-- Add index for faster queries
CREATE INDEX idx_crypto_transactions_user_id ON public.crypto_transactions(user_id);
CREATE INDEX idx_crypto_transactions_tx_hash ON public.crypto_transactions(tx_hash);
CREATE INDEX idx_crypto_transactions_status ON public.crypto_transactions(status);

-- Add celo_wallet_address to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS celo_wallet_address TEXT;