
-- IvoryPay webhook events table for idempotent processing
CREATE TABLE IF NOT EXISTS public.ivorypay_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL,
  event TEXT NOT NULL,
  status TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ivorypay_webhook_events_unique UNIQUE (reference, event)
);

CREATE INDEX IF NOT EXISTS idx_ivorypay_webhook_reference ON public.ivorypay_webhook_events(reference);

ALTER TABLE public.ivorypay_webhook_events ENABLE ROW LEVEL SECURITY;

-- Only service role writes; nobody reads via client.
CREATE POLICY "no_client_access" ON public.ivorypay_webhook_events
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
