-- Add user_presence table for real-time status
CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on user_presence
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- Create policies for user_presence
CREATE POLICY "Users can view all presence status" ON public.user_presence
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own presence" ON public.user_presence
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presence status" ON public.user_presence
  FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_presence_is_online ON public.user_presence(is_online);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON public.user_presence(last_seen);

-- Create trigger to update updated_at
CREATE TRIGGER update_user_presence_updated_at
  BEFORE UPDATE ON public.user_presence
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();