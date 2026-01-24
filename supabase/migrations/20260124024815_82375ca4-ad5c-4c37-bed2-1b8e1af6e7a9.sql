-- Create ads table for native ad management
CREATE TABLE public.ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT NOT NULL,
  placement TEXT NOT NULL DEFAULT 'feed' CHECK (placement IN ('banner', 'feed', 'sidebar', 'popup')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  impression_count INTEGER NOT NULL DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  target_pages TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- Public can view active ads
CREATE POLICY "Anyone can view active ads" 
ON public.ads 
FOR SELECT 
USING (is_active = true AND (start_date IS NULL OR start_date <= now()) AND (end_date IS NULL OR end_date >= now()));

-- Admins can manage ads (using account_type)
CREATE POLICY "Admins can manage ads" 
ON public.ads 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.account_type = 'admin'
  )
);

-- Create index for faster queries
CREATE INDEX idx_ads_placement_active ON public.ads(placement, is_active);
CREATE INDEX idx_ads_priority ON public.ads(priority DESC);

-- Trigger for updated_at
CREATE TRIGGER update_ads_updated_at
BEFORE UPDATE ON public.ads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to track ad impression
CREATE OR REPLACE FUNCTION public.track_ad_impression(ad_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ads SET impression_count = impression_count + 1 WHERE id = ad_id;
END;
$$;

-- Function to track ad click
CREATE OR REPLACE FUNCTION public.track_ad_click(ad_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ads SET click_count = click_count + 1 WHERE id = ad_id;
END;
$$;