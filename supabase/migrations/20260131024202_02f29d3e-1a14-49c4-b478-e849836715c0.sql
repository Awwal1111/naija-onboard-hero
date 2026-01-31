-- Add email notification preferences to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;

-- Add last_login tracking if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Add email_digest_frequency for user preferences
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_digest_frequency TEXT DEFAULT 'weekly' 
CHECK (email_digest_frequency IN ('daily', 'weekly', 'monthly', 'never'));

-- Create index for efficient queries on email notifications
CREATE INDEX IF NOT EXISTS idx_profiles_email_notifications 
ON public.profiles(email_notifications) 
WHERE email_notifications = true;

-- Create index for last_login queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_login 
ON public.profiles(last_login);

-- Update existing users to have email notifications enabled by default
UPDATE public.profiles 
SET email_notifications = true 
WHERE email_notifications IS NULL;