-- Table for telegram account link verification codes
CREATE TABLE IF NOT EXISTS public.telegram_link_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL,
  telegram_user_id TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.telegram_link_codes ENABLE ROW LEVEL SECURITY;

-- Service role can manage this table (edge functions use service role)
CREATE POLICY "Service role can manage telegram_link_codes"
ON public.telegram_link_codes
FOR ALL
USING (true)
WITH CHECK (true);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_telegram_link_codes_code ON public.telegram_link_codes(code);
CREATE INDEX IF NOT EXISTS idx_telegram_link_codes_email ON public.telegram_link_codes(email);

-- Auto cleanup expired codes (optional - can be done via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_telegram_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM telegram_link_codes WHERE expires_at < NOW();
END;
$$;