-- Create referral tasks table
CREATE TABLE public.referral_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  reward numeric NOT NULL,
  status text NOT NULL DEFAULT 'active',  -- active/inactive
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create referral submissions table
CREATE TABLE public.referral_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  task_id uuid NOT NULL REFERENCES public.referral_tasks(id) ON DELETE CASCADE,
  proof_url text,
  status text NOT NULL DEFAULT 'pending',  -- pending/approved/rejected
  admin_comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referral_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_submissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for referral_tasks
CREATE POLICY "Active referral tasks visible to authenticated users" 
ON public.referral_tasks 
FOR SELECT 
USING (status = 'active');

CREATE POLICY "Admin can manage referral tasks" 
ON public.referral_tasks 
FOR ALL 
USING (is_admin_user())
WITH CHECK (is_admin_user());

-- RLS policies for referral_submissions
CREATE POLICY "Users can create their own submissions" 
ON public.referral_submissions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own submissions" 
ON public.referral_submissions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all submissions" 
ON public.referral_submissions 
FOR SELECT 
USING (is_admin_user());

CREATE POLICY "Admin can update submissions" 
ON public.referral_submissions 
FOR UPDATE 
USING (is_admin_user())
WITH CHECK (is_admin_user());

-- Add trigger for updated_at
CREATE TRIGGER update_referral_tasks_updated_at
BEFORE UPDATE ON public.referral_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_referral_submissions_updated_at
BEFORE UPDATE ON public.referral_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();