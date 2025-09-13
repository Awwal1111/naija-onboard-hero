-- Create enhanced stories functionality with privacy and viewing
CREATE TABLE IF NOT EXISTS public.story_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

-- Add privacy setting to stories if not exists
ALTER TABLE public.stories 
ADD COLUMN IF NOT EXISTS privacy_setting TEXT DEFAULT 'public' CHECK (privacy_setting IN ('public', 'connections_only'));

-- Create job applications table for enhanced job workflow
CREATE TABLE IF NOT EXISTS public.job_applications_enhanced (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_post_id UUID NOT NULL REFERENCES public.job_posts(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_url TEXT,
  cover_letter TEXT,
  portfolio_urls TEXT[],
  expected_salary NUMERIC,
  availability_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'shortlisted', 'rejected', 'hired')),
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(job_post_id, applicant_id)
);

-- Create admin notifications table for global announcements
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user role enum type safely
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('user', 'admin', 'moderator', 'expert');
    END IF;
END $$;

-- Create user roles table for proper admin management
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'user',
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Add function to check user roles (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_user_role(user_id UUID, check_role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = has_user_role.user_id 
    AND role = check_role
  );
$$;

-- RLS Policies for story_views
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own story views" ON public.story_views
FOR INSERT WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY "Users can view their own story views" ON public.story_views
FOR SELECT USING (auth.uid() = viewer_id);

CREATE POLICY "Story creators can see who viewed their stories" ON public.story_views
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.stories 
    WHERE stories.id = story_views.story_id 
    AND stories.user_id = auth.uid()
  )
);

-- RLS Policies for job_applications_enhanced  
ALTER TABLE public.job_applications_enhanced ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own job applications" ON public.job_applications_enhanced
FOR INSERT WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Applicants can view their own applications" ON public.job_applications_enhanced
FOR SELECT USING (auth.uid() = applicant_id);

CREATE POLICY "Job posters can view applications for their jobs" ON public.job_applications_enhanced
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.job_posts 
    WHERE job_posts.id = job_applications_enhanced.job_post_id 
    AND job_posts.user_id = auth.uid()
  )
);

CREATE POLICY "Job posters can update applications for their jobs" ON public.job_applications_enhanced
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.job_posts 
    WHERE job_posts.id = job_applications_enhanced.job_post_id 
    AND job_posts.user_id = auth.uid()
  )
);

-- RLS Policies for admin_notifications
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view active admin notifications" ON public.admin_notifications
FOR SELECT USING (is_active = true AND (end_time IS NULL OR end_time > now()));

CREATE POLICY "Admins can manage admin notifications" ON public.admin_notifications
FOR ALL USING (public.has_user_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage user roles" ON public.user_roles
FOR ALL USING (public.has_user_role(auth.uid(), 'admin'::user_role));

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_story_views_story_id ON public.story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_viewer_id ON public.story_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_enhanced_job_post_id ON public.job_applications_enhanced(job_post_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_enhanced_applicant_id ON public.job_applications_enhanced(applicant_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_active ON public.admin_notifications(is_active, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Trigger to increment story views count
CREATE OR REPLACE FUNCTION public.update_story_views_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.stories 
  SET views_count = views_count + 1 
  WHERE id = NEW.story_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS story_views_count_trigger ON public.story_views;
CREATE TRIGGER story_views_count_trigger
  AFTER INSERT ON public.story_views
  FOR EACH ROW
  EXECUTE FUNCTION public.update_story_views_count();

-- Function to clean up expired stories (for scheduled cleanup)
CREATE OR REPLACE FUNCTION public.cleanup_expired_stories()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.stories WHERE expires_at <= now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;