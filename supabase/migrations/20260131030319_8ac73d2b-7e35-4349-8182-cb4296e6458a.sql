-- Add international user preference columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferred_currency TEXT DEFAULT 'NC',
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Africa/Lagos',
ADD COLUMN IF NOT EXISTS country_code TEXT,
ADD COLUMN IF NOT EXISTS phone_country_code TEXT DEFAULT '+234';

-- Add index for country-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_country_code ON public.profiles(country_code);
CREATE INDEX IF NOT EXISTS idx_profiles_preferred_currency ON public.profiles(preferred_currency);

-- Comment for documentation
COMMENT ON COLUMN public.profiles.preferred_currency IS 'User preferred display currency (NC, USD, EUR, GBP, etc.)';
COMMENT ON COLUMN public.profiles.timezone IS 'User timezone for displaying times (e.g., Africa/Lagos, America/New_York)';
COMMENT ON COLUMN public.profiles.country_code IS 'ISO 3166-1 alpha-2 country code (e.g., NG, US, GB)';
COMMENT ON COLUMN public.profiles.phone_country_code IS 'Phone country code with + prefix (e.g., +234, +1, +44)';