-- Add account_type column to profiles for business/developer access
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'personal' CHECK (account_type IN ('personal', 'business', 'developer'));

-- Add API key column for developer accounts
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS api_key text UNIQUE;

-- Add business-specific fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS business_name text;
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS business_registration_number text;
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS business_verified boolean DEFAULT false;

-- Create API usage tracking table
CREATE TABLE IF NOT EXISTS public.api_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key text NOT NULL,
  endpoint text NOT NULL,
  method text NOT NULL,
  status_code integer,
  response_time_ms integer,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on api_usage
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own API usage
CREATE POLICY "Users can view own API usage" ON public.api_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Create API rate limits table
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_name text NOT NULL UNIQUE,
  requests_per_minute integer NOT NULL DEFAULT 60,
  requests_per_day integer NOT NULL DEFAULT 10000,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default rate limit plans
INSERT INTO public.api_rate_limits (plan_name, requests_per_minute, requests_per_day)
VALUES 
  ('free', 10, 100),
  ('basic', 60, 1000),
  ('pro', 300, 10000),
  ('enterprise', 1000, 100000)
ON CONFLICT (plan_name) DO NOTHING;

-- Function to generate API key
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_key text;
BEGIN
  new_key := 'nljl_' || encode(gen_random_bytes(24), 'hex');
  RETURN new_key;
END;
$$;

-- Add index for API usage queries
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON public.api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_api_key ON public.api_usage(api_key);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON public.api_usage(created_at);
