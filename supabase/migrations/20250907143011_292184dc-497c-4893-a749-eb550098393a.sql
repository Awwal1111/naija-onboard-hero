-- Create reactions table for enhanced reaction system  
CREATE TABLE public.post_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'love', 'laugh', 'wow', 'sad', 'angry', 'support')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Enable RLS
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

-- Create policies for reactions
CREATE POLICY "Users can create their own reactions" 
ON public.post_reactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reactions" 
ON public.post_reactions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions" 
ON public.post_reactions 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Reactions are viewable by all authenticated users" 
ON public.post_reactions 
FOR SELECT 
USING (true);

-- Add privacy field to posts for connection-based visibility
ALTER TABLE public.posts ADD COLUMN visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'connections', 'private'));

-- Update posts RLS policy to respect visibility and connections
DROP POLICY "Users can view all active posts" ON public.posts;

CREATE POLICY "Users can view posts based on visibility" 
ON public.posts 
FOR SELECT 
USING (
  status = 'active' AND (
    visibility = 'public' OR
    user_id = auth.uid() OR
    (visibility = 'connections' AND users_are_connected(auth.uid(), user_id))
  )
);

-- Add highlighting support to comments
ALTER TABLE public.post_comments ADD COLUMN highlighted BOOLEAN DEFAULT false;
ALTER TABLE public.post_comments ADD COLUMN parent_comment_id UUID REFERENCES public.post_comments(id);

-- Create function to update reaction counts
CREATE OR REPLACE FUNCTION update_post_reaction_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Remove old like if switching reactions
    DELETE FROM public.post_likes WHERE post_id = NEW.post_id AND user_id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for reaction management
CREATE TRIGGER update_reaction_counts_trigger
AFTER INSERT OR DELETE ON public.post_reactions
FOR EACH ROW
EXECUTE FUNCTION update_post_reaction_counts();

-- Create enhanced job posting table 
CREATE TABLE public.job_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  company_name TEXT,
  location TEXT,
  job_type TEXT CHECK (job_type IN ('remote', 'onsite', 'hybrid', 'contract', 'freelance')),
  experience_level TEXT CHECK (experience_level IN ('entry', 'mid', 'senior', 'lead', 'executive')),
  budget_min NUMERIC,
  budget_max NUMERIC,
  currency TEXT DEFAULT 'NGN',
  required_skills TEXT[],
  application_deadline TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'filled')),
  applications_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for job posts
ALTER TABLE public.job_posts ENABLE ROW LEVEL SECURITY;

-- Create policies for job posts
CREATE POLICY "Job posts are viewable by all authenticated users" 
ON public.job_posts 
FOR SELECT 
USING (status = 'open' OR user_id = auth.uid());

CREATE POLICY "Users can manage their own job posts" 
ON public.job_posts 
FOR ALL 
USING (auth.uid() = user_id);

-- Create job applications table
CREATE TABLE public.job_post_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_post_id UUID NOT NULL REFERENCES public.job_posts(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL,
  cover_letter TEXT,
  resume_url TEXT,
  portfolio_urls TEXT[],
  expected_salary NUMERIC,
  availability_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'shortlisted', 'rejected', 'hired')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(job_post_id, applicant_id)
);

-- Enable RLS for job applications
ALTER TABLE public.job_post_applications ENABLE ROW LEVEL SECURITY;

-- Create policies for job applications
CREATE POLICY "Users can create job applications" 
ON public.job_post_applications 
FOR INSERT 
WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Job owners can view applications for their jobs" 
ON public.job_post_applications 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.job_posts 
  WHERE job_posts.id = job_post_applications.job_post_id 
  AND job_posts.user_id = auth.uid()
));

CREATE POLICY "Applicants can view their own applications" 
ON public.job_post_applications 
FOR SELECT 
USING (auth.uid() = applicant_id);

-- Add triggers for updated_at
CREATE TRIGGER update_job_posts_updated_at
BEFORE UPDATE ON public.job_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to increment job application count
CREATE OR REPLACE FUNCTION increment_job_applications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.job_posts 
  SET applications_count = applications_count + 1 
  WHERE id = NEW.job_post_id;
  RETURN NEW;
END;
$$;

-- Create trigger for job application count
CREATE TRIGGER increment_job_applications_trigger
AFTER INSERT ON public.job_post_applications
FOR EACH ROW
EXECUTE FUNCTION increment_job_applications();

-- Add indexes for better performance
CREATE INDEX idx_post_reactions_post_id ON public.post_reactions(post_id);
CREATE INDEX idx_post_reactions_user_id ON public.post_reactions(user_id);
CREATE INDEX idx_job_posts_status ON public.job_posts(status);
CREATE INDEX idx_job_posts_location ON public.job_posts(location);
CREATE INDEX idx_job_posts_job_type ON public.job_posts(job_type);