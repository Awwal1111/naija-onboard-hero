-- Add boosted_at column to jobs_services
ALTER TABLE public.jobs_services 
ADD COLUMN IF NOT EXISTS boosted_at TIMESTAMP WITH TIME ZONE;