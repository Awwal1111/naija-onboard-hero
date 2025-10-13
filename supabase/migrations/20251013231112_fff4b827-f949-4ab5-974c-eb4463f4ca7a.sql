-- Add access tracking and purchase records

-- Create table for tracking product purchases with access
CREATE TABLE IF NOT EXISTS public.product_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.digital_products(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  download_count INTEGER DEFAULT 0,
  last_downloaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, buyer_id)
);

-- Enable RLS
ALTER TABLE public.product_downloads ENABLE ROW LEVEL SECURITY;

-- Buyers can view their own downloads
CREATE POLICY "Buyers can view their purchases"
ON public.product_downloads FOR SELECT
USING (auth.uid() = buyer_id);

-- Track download access
CREATE POLICY "Buyers can update their download records"
ON public.product_downloads FOR UPDATE
USING (auth.uid() = buyer_id);

-- Create table for course access/enrollment
CREATE TABLE IF NOT EXISTS public.course_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  progress_percentage INTEGER DEFAULT 0,
  completed_lessons JSONB DEFAULT '[]'::jsonb,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, student_id)
);

-- Enable RLS
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

-- Students can view their own progress
CREATE POLICY "Students can view their progress"
ON public.course_progress FOR SELECT
USING (auth.uid() = student_id);

-- Students can update their progress
CREATE POLICY "Students can update their progress"
ON public.course_progress FOR UPDATE
USING (auth.uid() = student_id);

-- Course creators can view progress
CREATE POLICY "Course creators can view student progress"
ON public.course_progress FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.courses
  WHERE courses.id = course_progress.course_id
  AND courses.user_id = auth.uid()
));

-- Add notification preferences
ALTER TABLE public.job_post_applications
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_downloads_buyer ON public.product_downloads(buyer_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_student ON public.course_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON public.job_post_applications(status);
CREATE INDEX IF NOT EXISTS idx_fundraising_status ON public.fundraisings(status);

-- Function to check if user has purchased a product
CREATE OR REPLACE FUNCTION public.has_purchased_product(p_product_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.digital_product_purchases
    WHERE product_id = p_product_id
    AND buyer_id = p_user_id
  );
$$;

-- Function to check if user is enrolled in course
CREATE OR REPLACE FUNCTION public.is_enrolled_in_course(p_course_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.course_enrollments
    WHERE course_id = p_course_id
    AND student_id = p_user_id
  );
$$;