-- Make media_url nullable to allow text-only stories
ALTER TABLE public.stories 
ALTER COLUMN media_url DROP NOT NULL;

-- Add background_color column for text stories (like Facebook/Instagram)
ALTER TABLE public.stories 
ADD COLUMN IF NOT EXISTS background_color text DEFAULT 'gradient-primary';

-- Add simple index for better performance
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON public.stories(expires_at);