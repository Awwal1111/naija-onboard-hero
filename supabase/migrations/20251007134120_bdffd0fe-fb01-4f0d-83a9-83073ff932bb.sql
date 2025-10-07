-- Fix referral_submissions task_id data type mismatch
-- The task_id column was incorrectly set to integer, but it should be uuid

-- First, check if there's data and handle accordingly
DO $$ 
BEGIN
  -- Drop the incorrect integer column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'referral_submissions' 
    AND column_name = 'task_id' 
    AND data_type = 'integer'
  ) THEN
    -- Drop existing foreign key constraint if any
    ALTER TABLE public.referral_submissions 
    DROP CONSTRAINT IF EXISTS referral_submissions_task_id_fkey;
    
    -- Change task_id to uuid type
    ALTER TABLE public.referral_submissions 
    ALTER COLUMN task_id TYPE uuid USING task_id::text::uuid;
    
    -- Re-add the foreign key constraint
    ALTER TABLE public.referral_submissions 
    ADD CONSTRAINT referral_submissions_task_id_fkey 
    FOREIGN KEY (task_id) REFERENCES public.referral_tasks(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure proof_url column exists (it might be screenshot_url in some migrations)
DO $$
BEGIN
  -- If screenshot_url exists but not proof_url, rename it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'referral_submissions' 
    AND column_name = 'screenshot_url'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'referral_submissions' 
    AND column_name = 'proof_url'
  ) THEN
    ALTER TABLE public.referral_submissions 
    RENAME COLUMN screenshot_url TO proof_url;
  END IF;
  
  -- If proof_url doesn't exist at all, add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'referral_submissions' 
    AND column_name = 'proof_url'
  ) THEN
    ALTER TABLE public.referral_submissions 
    ADD COLUMN proof_url text;
  END IF;
END $$;