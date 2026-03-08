
-- Add super_admin to the user_role enum (must be committed alone)
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'super_admin';
