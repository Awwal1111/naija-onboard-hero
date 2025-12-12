-- Add balance tracking columns for deposit detection
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_celo_balance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_cusd_balance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_usdt_balance numeric DEFAULT 0;