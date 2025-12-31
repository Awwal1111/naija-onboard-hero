-- Add professional video fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS intro_video_url TEXT,
ADD COLUMN IF NOT EXISTS intro_video_thumbnail TEXT,
ADD COLUMN IF NOT EXISTS portfolio_videos JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.intro_video_url IS 'Premium feature: 30-60 second profile introduction video';
COMMENT ON COLUMN public.profiles.intro_video_thumbnail IS 'Thumbnail for the intro video';
COMMENT ON COLUMN public.profiles.portfolio_videos IS 'Premium feature: Array of portfolio video objects with url, thumbnail, title, description';