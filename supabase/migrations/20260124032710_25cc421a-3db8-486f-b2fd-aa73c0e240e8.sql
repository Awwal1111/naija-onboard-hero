-- Developer Webhooks table for storing webhook configurations
CREATE TABLE IF NOT EXISTS public.developer_webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  developer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  webhook_secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  failure_count INTEGER DEFAULT 0,
  UNIQUE(developer_id, webhook_url)
);

-- Enable RLS
ALTER TABLE public.developer_webhooks ENABLE ROW LEVEL SECURITY;

-- Developers can only manage their own webhooks
CREATE POLICY "Developers can manage own webhooks" ON public.developer_webhooks
  FOR ALL USING (auth.uid() = developer_id);

-- Webhook delivery logs for debugging
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id UUID NOT NULL REFERENCES public.developer_webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  delivered_at TIMESTAMP WITH TIME ZONE,
  delivery_duration_ms INTEGER,
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  retry_count INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Developers can view their webhook logs
CREATE POLICY "Developers can view own webhook logs" ON public.webhook_logs
  FOR SELECT USING (
    webhook_id IN (SELECT id FROM public.developer_webhooks WHERE developer_id = auth.uid())
  );

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON public.webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON public.webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_developer_webhooks_developer_id ON public.developer_webhooks(developer_id);
CREATE INDEX IF NOT EXISTS idx_developer_webhooks_events ON public.developer_webhooks USING GIN(events);

-- Function to generate webhook secret
CREATE OR REPLACE FUNCTION public.generate_webhook_secret()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result TEXT := '';
  characters TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  i INTEGER;
BEGIN
  FOR i IN 1..64 LOOP
    result := result || substr(characters, floor(random() * length(characters) + 1)::integer, 1);
  END LOOP;
  RETURN 'whsec_' || result;
END;
$$;