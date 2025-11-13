-- Create saved_searches table for storing user search preferences
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  query TEXT NOT NULL,
  filters JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

-- Users can view their own saved searches
CREATE POLICY "Users can view their own saved searches"
ON public.saved_searches
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own saved searches
CREATE POLICY "Users can create their own saved searches"
ON public.saved_searches
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own saved searches
CREATE POLICY "Users can delete their own saved searches"
ON public.saved_searches
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_saved_searches_user_id ON public.saved_searches(user_id);
CREATE INDEX idx_saved_searches_created_at ON public.saved_searches(created_at DESC);