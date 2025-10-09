-- Create saved_posts table for bookmarking posts
CREATE TABLE IF NOT EXISTS public.saved_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Enable RLS
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

-- Create policies for saved_posts
CREATE POLICY "Users can save posts" ON public.saved_posts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their saved posts" ON public.saved_posts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can unsave posts" ON public.saved_posts
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Create post_reports table
CREATE TABLE IF NOT EXISTS public.post_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed'))
);

-- Enable RLS
ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for post_reports
CREATE POLICY "Users can report posts" ON public.post_reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Users can view their own reports" ON public.post_reports
  FOR SELECT TO authenticated
  USING (auth.uid() = reported_by);

CREATE POLICY "Admins can view all reports" ON public.post_reports
  FOR SELECT TO authenticated
  USING (is_admin_user());

CREATE POLICY "Admins can update reports" ON public.post_reports
  FOR UPDATE TO authenticated
  USING (is_admin_user());

-- Create index for better query performance
CREATE INDEX idx_saved_posts_user_id ON public.saved_posts(user_id);
CREATE INDEX idx_saved_posts_post_id ON public.saved_posts(post_id);
CREATE INDEX idx_post_reports_post_id ON public.post_reports(post_id);
CREATE INDEX idx_post_reports_status ON public.post_reports(status);