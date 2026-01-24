-- Developer API tables for managing external integrations

-- Table for developer-created wallets (for their users)
CREATE TABLE IF NOT EXISTS public.developer_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  developer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_user_id TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  encrypted_private_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(developer_id, external_user_id)
);

-- Enable RLS
ALTER TABLE public.developer_wallets ENABLE ROW LEVEL SECURITY;

-- Developers can only access their own wallets
DROP POLICY IF EXISTS "Developers can view own wallets" ON public.developer_wallets;
CREATE POLICY "Developers can view own wallets" ON public.developer_wallets
  FOR SELECT USING (auth.uid() = developer_id);

DROP POLICY IF EXISTS "Developers can create wallets" ON public.developer_wallets;
CREATE POLICY "Developers can create wallets" ON public.developer_wallets
  FOR INSERT WITH CHECK (auth.uid() = developer_id);

-- Table for developer video rooms
CREATE TABLE IF NOT EXISTS public.developer_video_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  developer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL UNIQUE,
  room_name TEXT NOT NULL,
  max_participants INTEGER DEFAULT 10,
  features JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.developer_video_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Developers can manage own rooms" ON public.developer_video_rooms;
CREATE POLICY "Developers can manage own rooms" ON public.developer_video_rooms
  FOR ALL USING (auth.uid() = developer_id);

-- Table for developer escrows
CREATE TABLE IF NOT EXISTS public.developer_escrows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  developer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  escrow_id TEXT NOT NULL UNIQUE,
  payer_external_id TEXT NOT NULL,
  payee_external_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'NGN',
  description TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  funded_at TIMESTAMP WITH TIME ZONE,
  released_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.developer_escrows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Developers can manage own escrows" ON public.developer_escrows;
CREATE POLICY "Developers can manage own escrows" ON public.developer_escrows
  FOR ALL USING (auth.uid() = developer_id);

-- Add columns to api_usage if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_usage' AND column_name = 'cost_nc') THEN
    ALTER TABLE public.api_usage ADD COLUMN cost_nc NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_usage' AND column_name = 'response_time_ms') THEN
    ALTER TABLE public.api_usage ADD COLUMN response_time_ms INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_usage' AND column_name = 'status_code') THEN
    ALTER TABLE public.api_usage ADD COLUMN status_code INTEGER;
  END IF;
END $$;

-- Index for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_api_usage_rate_limit 
  ON public.api_usage (user_id, endpoint, created_at DESC);

-- Function to deduct NC balance
CREATE OR REPLACE FUNCTION public.deduct_nc_balance(p_user_id UUID, p_amount NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance NUMERIC;
BEGIN
  SELECT nc_balance INTO current_balance 
  FROM profiles 
  WHERE user_id = p_user_id;
  
  IF current_balance >= p_amount THEN
    UPDATE profiles 
    SET nc_balance = nc_balance - p_amount,
        updated_at = now()
    WHERE user_id = p_user_id;
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.deduct_nc_balance TO authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_nc_balance TO service_role;