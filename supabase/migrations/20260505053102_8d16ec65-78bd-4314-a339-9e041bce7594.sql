
ALTER TABLE public.user_secrets
  ADD COLUMN IF NOT EXISTS api_key_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.api_usage
  ADD COLUMN IF NOT EXISTS external_service text,
  ADD COLUMN IF NOT EXISTS markup_nc numeric DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_api_usage_user_service
  ON public.api_usage(user_id, external_service, created_at DESC);
