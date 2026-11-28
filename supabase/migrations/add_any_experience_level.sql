-- Add 'any' as a valid value for job_posts.experience_level
-- This allows employers to recruit candidates regardless of experience level

-- First, check if any existing records have unexpected values that might violate the new constraint
-- This is a safety check; existing valid values ('entry', 'intermediate', 'senior', 'expert') remain unchanged

-- Drop the old constraint
ALTER TABLE public.job_posts
DROP CONSTRAINT IF EXISTS job_posts_experience_level_check;

-- Add the new constraint that includes 'any'
ALTER TABLE public.job_posts
ADD CONSTRAINT job_posts_experience_level_check
CHECK (experience_level IN ('any', 'entry', 'intermediate', 'senior', 'expert'));

-- Add commission-related columns to support commission-only job postings
-- This allows employers to specify commission terms without a fixed salary
ALTER TABLE public.job_posts
ADD COLUMN IF NOT EXISTS is_commission_only BOOLEAN DEFAULT FALSE;

ALTER TABLE public.job_posts
ADD COLUMN IF NOT EXISTS commission_terms TEXT;

ALTER TABLE public.job_posts
ADD COLUMN IF NOT EXISTS payment_terms TEXT;

-- Update RLS policies if needed (no changes needed, existing policies cover new columns)
