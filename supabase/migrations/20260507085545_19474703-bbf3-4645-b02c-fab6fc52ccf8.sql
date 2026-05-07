
-- Add webhook + signing config to mini_apps
ALTER TABLE public.mini_apps
  ADD COLUMN IF NOT EXISTS webhook_url TEXT,
  ADD COLUMN IF NOT EXISTS webhook_secret TEXT;

-- Backfill webhook_secret for existing apps
UPDATE public.mini_apps
SET webhook_secret = encode(gen_random_bytes(32), 'hex')
WHERE webhook_secret IS NULL;

-- Charge ledger / idempotency store
CREATE TABLE IF NOT EXISTS public.miniapp_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL UNIQUE,
  mini_app_id UUID NOT NULL REFERENCES public.mini_apps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  to_address TEXT NOT NULL,
  usdt_amount NUMERIC NOT NULL,
  ngn_amount NUMERIC NOT NULL,
  nc_amount NUMERIC NOT NULL,
  exchange_rate NUMERIC NOT NULL,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  webhook_delivered BOOLEAN NOT NULL DEFAULT false,
  webhook_attempts INT NOT NULL DEFAULT 0,
  webhook_last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_miniapp_charges_user ON public.miniapp_charges(user_id);
CREATE INDEX IF NOT EXISTS idx_miniapp_charges_app ON public.miniapp_charges(mini_app_id);

ALTER TABLE public.miniapp_charges ENABLE ROW LEVEL SECURITY;

-- Users can see their own charges
CREATE POLICY "Users view own charges" ON public.miniapp_charges
  FOR SELECT USING (auth.uid() = user_id);

-- Developers can see charges for their apps
CREATE POLICY "Developers view their app charges" ON public.miniapp_charges
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.mini_apps a WHERE a.id = mini_app_id AND a.developer_id = auth.uid())
  );

CREATE TRIGGER update_miniapp_charges_updated_at
  BEFORE UPDATE ON public.miniapp_charges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
