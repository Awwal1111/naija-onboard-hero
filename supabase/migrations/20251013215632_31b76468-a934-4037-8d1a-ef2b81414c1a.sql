-- Drop the old foreign key that points to auth.users
ALTER TABLE public.donations
DROP CONSTRAINT donations_user_id_fkey;

-- Add new foreign key that points to profiles
ALTER TABLE public.donations
ADD CONSTRAINT donations_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;