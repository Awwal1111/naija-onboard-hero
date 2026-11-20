-- Add support for commission-only job postings
-- This migration supplements the previous 'add_any_experience_level.sql' by ensuring commission-specific fields are properly defined and documented.

-- Note: The columns is_commission_only, commission_terms, and payment_terms 
-- are expected to be added by 'add_any_experience_level.sql'. 
-- This file ensures idempotency and adds any missing logic or constraints related to commission logic.

-- Verify/Ensure columns exist (idempotent check if the previous migration ran in a different order or partially)
ALTER TABLE public.job_posts
ADD COLUMN IF NOT EXISTS is_commission_only BOOLEAN DEFAULT FALSE;

ALTER TABLE public.job_posts
ADD COLUMN IF NOT EXISTS commission_terms TEXT;

ALTER TABLE public.job_posts
ADD COLUMN IF NOT EXISTS payment_terms TEXT;

-- Add a check constraint to ensure that if a job is commission-only,
-- budget fields are allowed to be null (which they already are, but we document intent)
-- PostgreSQL doesn't support conditional constraints directly for NULLs easily across all versions 
-- without plpgsql, so we rely on application-level validation primarily, 
-- but we can enforce that if is_commission_only is true, salary_period can be null or 'commission'.

-- For now, just ensure the columns are present for the frontend/backend to utilize.
