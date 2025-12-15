-- Create platform_ratings table for social proof
CREATE TABLE IF NOT EXISTS public.platform_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all ratings" ON public.platform_ratings
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own rating" ON public.platform_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rating" ON public.platform_ratings
  FOR UPDATE USING (auth.uid() = user_id);

-- Add has_rated_platform column to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_rated_platform BOOLEAN DEFAULT false;

-- Add leaderboard columns to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_earnings NUMERIC DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS completed_jobs_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_transactions INTEGER DEFAULT 0;

-- Add onboarding_completed column for quick onboarding
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Create index for featured ratings
CREATE INDEX IF NOT EXISTS idx_platform_ratings_featured ON public.platform_ratings(is_featured) WHERE is_featured = true;