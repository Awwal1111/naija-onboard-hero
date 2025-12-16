-- Add rating_skipped_at column to track when user last skipped rating dialog
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS rating_skipped_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;