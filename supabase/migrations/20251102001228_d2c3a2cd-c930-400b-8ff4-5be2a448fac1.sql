-- Create quidax_transactions table
CREATE TABLE IF NOT EXISTS public.quidax_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('on_ramp', 'off_ramp')),
  reference TEXT UNIQUE NOT NULL,
  fiat_amount NUMERIC NOT NULL,
  fiat_currency TEXT NOT NULL DEFAULT 'NGN',
  token TEXT NOT NULL DEFAULT 'USDT',
  token_amount NUMERIC,
  wallet_address TEXT,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'success')),
  quidax_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quidax_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own transactions
CREATE POLICY "Users can view their own quidax transactions"
  ON public.quidax_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own transactions
CREATE POLICY "Users can create their own quidax transactions"
  ON public.quidax_transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can manage all transactions
CREATE POLICY "Service role can manage all quidax transactions"
  ON public.quidax_transactions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Admins can view all transactions
CREATE POLICY "Admins can view all quidax transactions"
  ON public.quidax_transactions
  FOR SELECT
  USING (is_admin_user());

-- Create index for faster lookups
CREATE INDEX idx_quidax_transactions_user_id ON public.quidax_transactions(user_id);
CREATE INDEX idx_quidax_transactions_reference ON public.quidax_transactions(reference);
CREATE INDEX idx_quidax_transactions_status ON public.quidax_transactions(status);