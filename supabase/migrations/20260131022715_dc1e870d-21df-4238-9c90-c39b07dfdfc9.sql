-- Create skill_verifications table for tracking verified skills
CREATE TABLE public.skill_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  skill_name TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  attempts INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_skill UNIQUE (user_id, skill_name)
);

-- Enable RLS
ALTER TABLE public.skill_verifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own verifications
CREATE POLICY "Users can view own skill verifications"
ON public.skill_verifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own verifications
CREATE POLICY "Users can insert own skill verifications"
ON public.skill_verifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own verifications
CREATE POLICY "Users can update own skill verifications"
ON public.skill_verifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Public can view verified skills (for profile display)
CREATE POLICY "Anyone can view verified skills"
ON public.skill_verifications
FOR SELECT
USING (is_verified = true);

-- Create index for fast lookups
CREATE INDEX idx_skill_verifications_user ON public.skill_verifications(user_id);
CREATE INDEX idx_skill_verifications_verified ON public.skill_verifications(is_verified) WHERE is_verified = true;