-- Create storage bucket for gig images
INSERT INTO storage.buckets (id, name, public)
VALUES ('gig-images', 'gig-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for gig images
CREATE POLICY "Anyone can view gig images"
ON storage.objects FOR SELECT
USING (bucket_id = 'gig-images');

CREATE POLICY "Authenticated users can upload gig images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'gig-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own gig images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'gig-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own gig images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'gig-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create gig reviews table for real user reviews
CREATE TABLE IF NOT EXISTS public.gig_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gig_id UUID NOT NULL REFERENCES public.jobs_services(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(gig_id, user_id)
);

-- Enable RLS on gig_reviews
ALTER TABLE public.gig_reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for gig_reviews
CREATE POLICY "Anyone can view gig reviews"
ON public.gig_reviews FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create reviews"
ON public.gig_reviews FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
ON public.gig_reviews FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
ON public.gig_reviews FOR DELETE
USING (auth.uid() = user_id);

-- Add average_rating and review_count to jobs_services if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'jobs_services' AND column_name = 'average_rating') THEN
    ALTER TABLE public.jobs_services ADD COLUMN average_rating NUMERIC(2,1) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'jobs_services' AND column_name = 'review_count') THEN
    ALTER TABLE public.jobs_services ADD COLUMN review_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Function to update gig rating stats
CREATE OR REPLACE FUNCTION public.update_gig_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.jobs_services
  SET 
    average_rating = (
      SELECT ROUND(AVG(rating)::numeric, 1) 
      FROM public.gig_reviews 
      WHERE gig_id = COALESCE(NEW.gig_id, OLD.gig_id)
    ),
    review_count = (
      SELECT COUNT(*) 
      FROM public.gig_reviews 
      WHERE gig_id = COALESCE(NEW.gig_id, OLD.gig_id)
    )
  WHERE id = COALESCE(NEW.gig_id, OLD.gig_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers to auto-update rating stats
DROP TRIGGER IF EXISTS update_gig_stats_on_review ON public.gig_reviews;
CREATE TRIGGER update_gig_stats_on_review
AFTER INSERT OR UPDATE OR DELETE ON public.gig_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_gig_rating_stats();