-- Phase 1 & 2: Add verification columns and email sync trigger

-- Add verification columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS face_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS face_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS avg_response_time_seconds INTEGER;

-- Create function to sync email verification from auth.users
CREATE OR REPLACE FUNCTION public.sync_email_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET email_verified = (NEW.email_confirmed_at IS NOT NULL)
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users to sync email verification
DROP TRIGGER IF EXISTS on_auth_user_email_verified ON auth.users;
CREATE TRIGGER on_auth_user_email_verified
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_email_verified();

-- Also sync on insert (new user signups)
DROP TRIGGER IF EXISTS on_auth_user_created_email_sync ON auth.users;
CREATE TRIGGER on_auth_user_created_email_sync
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_email_verified();

-- Backfill existing users' email verification status
UPDATE public.profiles p
SET email_verified = (
  SELECT email_confirmed_at IS NOT NULL 
  FROM auth.users u 
  WHERE u.id = p.user_id
)
WHERE EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.user_id);