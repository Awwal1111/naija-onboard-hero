-- Create table for tracking user USDT staking positions in Moola Market
CREATE TABLE public.usdt_staking_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_staked NUMERIC NOT NULL DEFAULT 0,
  amount_earned NUMERIC NOT NULL DEFAULT 0,
  total_deposited NUMERIC NOT NULL DEFAULT 0,
  total_withdrawn NUMERIC NOT NULL DEFAULT 0,
  last_apy NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.usdt_staking_positions ENABLE ROW LEVEL SECURITY;

-- Users can view their own staking positions
CREATE POLICY "Users can view their own staking positions"
ON public.usdt_staking_positions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own staking positions
CREATE POLICY "Users can insert their own staking positions"
ON public.usdt_staking_positions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own staking positions
CREATE POLICY "Users can update their own staking positions"
ON public.usdt_staking_positions
FOR UPDATE
USING (auth.uid() = user_id);

-- Create table for staking transaction history
CREATE TABLE public.staking_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position_id UUID REFERENCES public.usdt_staking_positions(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL, -- 'deposit', 'withdraw', 'interest'
  amount NUMERIC NOT NULL,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.staking_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own staking transactions
CREATE POLICY "Users can view their own staking transactions"
ON public.staking_transactions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own staking transactions
CREATE POLICY "Users can insert their own staking transactions"
ON public.staking_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Service role can update all staking transactions
CREATE POLICY "Service role can manage staking transactions"
ON public.staking_transactions
FOR ALL
USING (auth.role() = 'service_role');

-- Create index for faster lookups
CREATE INDEX idx_staking_positions_user_id ON public.usdt_staking_positions(user_id);
CREATE INDEX idx_staking_transactions_user_id ON public.staking_transactions(user_id);
CREATE INDEX idx_staking_transactions_position_id ON public.staking_transactions(position_id);

-- Create trigger to update updated_at
CREATE TRIGGER update_usdt_staking_positions_updated_at
BEFORE UPDATE ON public.usdt_staking_positions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();