-- Add streak tracking columns to daily_signins
ALTER TABLE public.daily_signins 
ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS streak_bonus NUMERIC(10,2) DEFAULT 0;

-- Add last_signin_date and current_streak to profiles for quick access
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_signin_date DATE;

-- Create index for faster streak lookups
CREATE INDEX IF NOT EXISTS idx_daily_signins_user_date ON public.daily_signins(user_id, signin_date DESC);