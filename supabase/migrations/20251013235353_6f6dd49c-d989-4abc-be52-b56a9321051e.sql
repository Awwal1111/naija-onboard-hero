-- Fix foreign key relationships to point to profiles instead of auth.users

-- Drop existing foreign keys pointing to auth.users
ALTER TABLE public.digital_products 
DROP CONSTRAINT IF EXISTS digital_products_user_id_fkey;

ALTER TABLE public.courses 
DROP CONSTRAINT IF EXISTS courses_user_id_fkey;

ALTER TABLE public.fundraisings 
DROP CONSTRAINT IF EXISTS fundraisings_user_id_fkey;

ALTER TABLE public.emergency_requests 
DROP CONSTRAINT IF EXISTS emergency_requests_user_id_fkey;

-- Add new foreign keys pointing to profiles.user_id
ALTER TABLE public.digital_products
ADD CONSTRAINT digital_products_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.courses
ADD CONSTRAINT courses_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.fundraisings
ADD CONSTRAINT fundraisings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.emergency_requests
ADD CONSTRAINT emergency_requests_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;