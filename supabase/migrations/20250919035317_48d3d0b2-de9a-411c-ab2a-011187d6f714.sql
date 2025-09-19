-- Fix RLS violation for groups table by checking expert status properly
DROP POLICY IF EXISTS "Verified experts can create groups" ON public.groups;

CREATE POLICY "Verified experts can create groups"
ON public.groups
FOR INSERT 
WITH CHECK (
  auth.uid() = group_lead_id AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND is_expert = true 
    AND expert_verified_at IS NOT NULL
  )
);

-- Also ensure the profiles table has the needed columns for suggestions
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS state_name text,
ADD COLUMN IF NOT EXISTS lga_name text,
ADD COLUMN IF NOT EXISTS area text;

-- Create suggestions tables for the recommendation system
CREATE TABLE IF NOT EXISTS public.connection_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suggested_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suggestion_type text NOT NULL, -- 'location', 'profession', 'mutual'
  score integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, suggested_user_id)
);

CREATE TABLE IF NOT EXISTS public.job_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL,
  score integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(expert_id, job_id)
);

CREATE TABLE IF NOT EXISTS public.group_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id uuid NOT NULL,
  suggestion_type text NOT NULL, -- 'category', 'location'
  score integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, group_id)
);

CREATE TABLE IF NOT EXISTS public.expert_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expert_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suggestion_type text NOT NULL, -- 'skill_match', 'rating', 'activity'
  score integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, expert_id)
);

-- Enable RLS on suggestion tables
ALTER TABLE public.connection_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS policies for suggestions
CREATE POLICY "Users can view their own connection suggestions" 
ON public.connection_suggestions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own job suggestions" 
ON public.job_suggestions FOR SELECT USING (auth.uid() = expert_id);

CREATE POLICY "Users can view their own group suggestions" 
ON public.group_suggestions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own expert suggestions" 
ON public.expert_suggestions FOR SELECT USING (auth.uid() = user_id);

-- Fix stories table to properly link with profiles
ALTER TABLE public.stories 
ADD CONSTRAINT fk_stories_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Ensure portfolio items can store images in Supabase storage
ALTER TABLE public.portfolio_items 
ALTER COLUMN media_url TYPE text;

-- Make sure job posts appear in feed by ensuring proper RLS
ALTER TABLE public.job_posts 
DROP CONSTRAINT IF EXISTS job_posts_user_id_fkey;

ALTER TABLE public.job_posts 
ADD CONSTRAINT job_posts_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;