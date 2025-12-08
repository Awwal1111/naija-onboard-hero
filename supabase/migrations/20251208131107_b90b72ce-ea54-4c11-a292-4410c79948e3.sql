-- Create table for phone verification codes
CREATE TABLE IF NOT EXISTS public.phone_verification_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  phone_number TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.phone_verification_codes ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (via edge functions)
CREATE POLICY "Service role only access" 
ON public.phone_verification_codes 
FOR ALL 
USING (false)
WITH CHECK (false);

-- Create index for faster lookups
CREATE INDEX idx_phone_verification_user_id ON public.phone_verification_codes(user_id);
CREATE INDEX idx_phone_verification_expires ON public.phone_verification_codes(expires_at);