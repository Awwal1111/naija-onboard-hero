-- Add Telegram fields to profiles table for bot integration
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS telegram_user_id TEXT,
ADD COLUMN IF NOT EXISTS telegram_username TEXT;

-- Create index for faster Telegram user lookups
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_user_id ON public.profiles(telegram_user_id);