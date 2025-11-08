-- Create user_presence table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_online BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view their own presence" ON public.user_presence;
DROP POLICY IF EXISTS "Users can view others presence" ON public.user_presence;
DROP POLICY IF EXISTS "Users can update their own presence" ON public.user_presence;
DROP POLICY IF EXISTS "Users can insert their own presence" ON public.user_presence;

-- Create policies
CREATE POLICY "Users can view their own presence"
  ON public.user_presence
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view others presence"
  ON public.user_presence
  FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own presence"
  ON public.user_presence
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own presence"
  ON public.user_presence
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create or replace trigger function
CREATE OR REPLACE FUNCTION public.update_user_presence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_user_presence_updated_at ON public.user_presence;

CREATE TRIGGER update_user_presence_updated_at
  BEFORE UPDATE ON public.user_presence
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_presence_timestamp();

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen 
  ON public.user_presence(last_seen);

CREATE INDEX IF NOT EXISTS idx_user_presence_is_online 
  ON public.user_presence(is_online) WHERE is_online = true;