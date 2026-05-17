CREATE TABLE IF NOT EXISTS public.reloadly_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('airtime','giftcard','utility')),
  provider TEXT,
  recipient TEXT,
  country_code TEXT,
  nc_amount NUMERIC NOT NULL DEFAULT 0,
  usd_amount NUMERIC,
  local_amount NUMERIC,
  local_currency TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed','refunded')),
  reloadly_transaction_id TEXT,
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reloadly_tx_user ON public.reloadly_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reloadly_tx_status ON public.reloadly_transactions(status);
CREATE INDEX IF NOT EXISTS idx_reloadly_tx_reloadly_id ON public.reloadly_transactions(reloadly_transaction_id);

ALTER TABLE public.reloadly_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own reloadly tx"
ON public.reloadly_transactions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins view all reloadly tx"
ON public.reloadly_transactions
FOR SELECT
USING (public.has_admin_access());

CREATE TRIGGER trg_reloadly_tx_updated
BEFORE UPDATE ON public.reloadly_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();