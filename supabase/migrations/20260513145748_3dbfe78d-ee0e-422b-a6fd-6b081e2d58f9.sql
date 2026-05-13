CREATE TABLE public.pretium_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  transaction_code TEXT,
  reference TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('onramp','offramp')),
  currency TEXT NOT NULL,
  fiat_amount NUMERIC,
  asset TEXT,
  asset_amount NUMERIC,
  chain TEXT DEFAULT 'CELO',
  status TEXT NOT NULL DEFAULT 'pending',
  bank_code TEXT,
  account_number TEXT,
  account_name TEXT,
  recipient_address TEXT,
  transaction_hash TEXT,
  receipt_number TEXT,
  is_released BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pretium_tx_user ON public.pretium_transactions(user_id);
CREATE INDEX idx_pretium_tx_code ON public.pretium_transactions(transaction_code);

ALTER TABLE public.pretium_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own pretium tx"
  ON public.pretium_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE TRIGGER update_pretium_transactions_updated_at
  BEFORE UPDATE ON public.pretium_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();