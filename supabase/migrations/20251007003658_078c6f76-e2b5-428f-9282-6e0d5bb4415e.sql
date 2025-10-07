-- Add missing text_explanation column to referral_submissions table
ALTER TABLE public.referral_submissions 
ADD COLUMN text_explanation TEXT;