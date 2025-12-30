-- Create gig_testimonials table for user testimonials
CREATE TABLE public.gig_testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gig_id UUID NOT NULL REFERENCES public.jobs_services(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  testimonial TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  project_type TEXT,
  project_date DATE,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add unique constraint so one user can only leave one testimonial per gig
ALTER TABLE public.gig_testimonials ADD CONSTRAINT unique_user_gig_testimonial UNIQUE (gig_id, user_id);

-- Enable Row Level Security
ALTER TABLE public.gig_testimonials ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view gig testimonials"
ON public.gig_testimonials
FOR SELECT
USING (true);

CREATE POLICY "Users can create their own testimonials"
ON public.gig_testimonials
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own testimonials"
ON public.gig_testimonials
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own testimonials"
ON public.gig_testimonials
FOR DELETE
USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_gig_testimonials_updated_at
BEFORE UPDATE ON public.gig_testimonials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add gig FAQ table
CREATE TABLE public.gig_faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gig_id UUID NOT NULL REFERENCES public.jobs_services(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for FAQs
ALTER TABLE public.gig_faqs ENABLE ROW LEVEL SECURITY;

-- FAQ policies
CREATE POLICY "Anyone can view gig FAQs"
ON public.gig_faqs
FOR SELECT
USING (true);

CREATE POLICY "Gig owners can manage FAQs"
ON public.gig_faqs
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.jobs_services 
  WHERE id = gig_id AND user_id = auth.uid()
));

-- Add delivery_time and packages columns to jobs_services
ALTER TABLE public.jobs_services 
ADD COLUMN IF NOT EXISTS delivery_days INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS packages JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS order_queue INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS response_time TEXT DEFAULT 'Within 1 hour';