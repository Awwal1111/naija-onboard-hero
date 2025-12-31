-- Add expert boost fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_boosted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS boost_expires_at timestamp with time zone;

-- Create index for boosted experts
CREATE INDEX IF NOT EXISTS idx_profiles_boosted ON public.profiles(is_boosted, boost_expires_at) 
WHERE is_boosted = true;

-- Create function to expire boosts
CREATE OR REPLACE FUNCTION public.expire_expert_boosts()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles 
  SET is_boosted = false, boost_expires_at = NULL
  WHERE is_boosted = true AND boost_expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;