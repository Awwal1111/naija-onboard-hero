-- Enable pgcrypto extension for gen_random_bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Now recreate the generate_api_key function to work properly
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_key text;
BEGIN
  -- Use gen_random_uuid for a simpler approach that works without pgcrypto
  new_key := 'nljl_' || replace(gen_random_uuid()::text, '-', '');
  RETURN new_key;
END;
$$;