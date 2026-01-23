-- ================================================
-- CONTEST MODE SYSTEM
-- ================================================

-- Contests table - clients post creative briefs
CREATE TABLE public.contests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  prize_amount numeric NOT NULL CHECK (prize_amount >= 5000),
  escrow_funded boolean DEFAULT false,
  deadline timestamptz NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('draft', 'open', 'judging', 'completed', 'cancelled')),
  winner_id uuid REFERENCES auth.users(id),
  winning_submission_id uuid,
  max_submissions integer DEFAULT 50,
  requirements text[],
  style_preferences text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Contest submissions
CREATE TABLE public.contest_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid REFERENCES public.contests(id) ON DELETE CASCADE NOT NULL,
  freelancer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  file_urls text[] NOT NULL,
  preview_url text,
  status text DEFAULT 'submitted' CHECK (status IN ('submitted', 'shortlisted', 'winner', 'rejected')),
  client_rating integer CHECK (client_rating BETWEEN 1 AND 5),
  client_feedback text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(contest_id, freelancer_id)
);

-- ================================================
-- MILESTONE-BASED SAFEPAY
-- ================================================

CREATE TABLE public.project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  safepay_transaction_id uuid REFERENCES public.safepay_transactions(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.gig_orders(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  amount numeric NOT NULL CHECK (amount > 0),
  due_date timestamptz,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'submitted', 'revision_requested', 'approved', 'released')),
  deliverable_urls text[],
  freelancer_notes text,
  client_feedback text,
  revision_count integer DEFAULT 0,
  max_revisions integer DEFAULT 2,
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  released_at timestamptz
);

-- ================================================
-- PROJECT WORKROOMS
-- ================================================

CREATE TABLE public.workrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  project_type text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  total_budget numeric DEFAULT 0,
  spent_budget numeric DEFAULT 0,
  deadline timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.workroom_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workroom_id uuid REFERENCES public.workrooms(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'freelancer' CHECK (role IN ('owner', 'freelancer', 'collaborator', 'viewer')),
  permissions text[] DEFAULT ARRAY['read', 'comment'],
  hourly_rate numeric,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(workroom_id, user_id)
);

CREATE TABLE public.workroom_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workroom_id uuid REFERENCES public.workrooms(id) ON DELETE CASCADE NOT NULL,
  assigned_to uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  title text NOT NULL,
  description text,
  status text DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date timestamptz,
  estimated_hours numeric,
  actual_hours numeric DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.workroom_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workroom_id uuid REFERENCES public.workrooms(id) ON DELETE CASCADE NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id) NOT NULL,
  task_id uuid REFERENCES public.workroom_tasks(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size integer,
  version integer DEFAULT 1,
  parent_file_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.workroom_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workroom_id uuid REFERENCES public.workrooms(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  task_id uuid REFERENCES public.workroom_tasks(id) ON DELETE CASCADE,
  file_id uuid REFERENCES public.workroom_files(id) ON DELETE CASCADE,
  content text NOT NULL,
  mentions uuid[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ================================================
-- WORK DIARY / TIME TRACKING
-- ================================================

CREATE TABLE public.work_diary_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workroom_id uuid REFERENCES public.workrooms(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.workroom_tasks(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.gig_orders(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  duration_minutes integer,
  description text,
  activity_level integer CHECK (activity_level BETWEEN 0 AND 100),
  screenshot_url text,
  is_manual boolean DEFAULT false,
  billable boolean DEFAULT true,
  hourly_rate numeric,
  created_at timestamptz DEFAULT now()
);

-- ================================================
-- ENABLE RLS
-- ================================================

ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workroom_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workroom_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workroom_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workroom_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_diary_entries ENABLE ROW LEVEL SECURITY;

-- ================================================
-- RLS POLICIES
-- ================================================

-- Contests
CREATE POLICY "Contests viewable by everyone" ON public.contests FOR SELECT USING (status != 'draft');
CREATE POLICY "Clients create contests" ON public.contests FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Clients update own contests" ON public.contests FOR UPDATE USING (auth.uid() = client_id);

-- Contest submissions
CREATE POLICY "Submissions viewable by participants" ON public.contest_submissions 
  FOR SELECT USING (
    auth.uid() = freelancer_id OR 
    auth.uid() IN (SELECT client_id FROM public.contests WHERE id = contest_id)
  );
CREATE POLICY "Freelancers submit to contests" ON public.contest_submissions 
  FOR INSERT WITH CHECK (auth.uid() = freelancer_id);
CREATE POLICY "Freelancers update own submissions" ON public.contest_submissions 
  FOR UPDATE USING (auth.uid() = freelancer_id);

-- Milestones - use buyer_id/seller_id from gig_orders
CREATE POLICY "Milestone participants view" ON public.project_milestones 
  FOR SELECT USING (
    auth.uid() IN (
      SELECT buyer_id FROM public.safepay_transactions WHERE id = safepay_transaction_id
      UNION SELECT seller_id FROM public.safepay_transactions WHERE id = safepay_transaction_id
      UNION SELECT buyer_id FROM public.gig_orders WHERE id = order_id
      UNION SELECT seller_id FROM public.gig_orders WHERE id = order_id
    )
  );
CREATE POLICY "Project owners manage milestones" ON public.project_milestones 
  FOR ALL USING (
    auth.uid() IN (
      SELECT buyer_id FROM public.safepay_transactions WHERE id = safepay_transaction_id
      UNION SELECT buyer_id FROM public.gig_orders WHERE id = order_id
    )
  );

-- WorkRooms
CREATE POLICY "WorkRoom members view" ON public.workrooms 
  FOR SELECT USING (
    auth.uid() = owner_id OR 
    auth.uid() IN (SELECT user_id FROM public.workroom_members WHERE workroom_id = id)
  );
CREATE POLICY "Users create workrooms" ON public.workrooms FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners update workrooms" ON public.workrooms FOR UPDATE USING (auth.uid() = owner_id);

-- WorkRoom members
CREATE POLICY "View workroom members" ON public.workroom_members 
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM public.workroom_members wm WHERE wm.workroom_id = workroom_id)
    OR auth.uid() IN (SELECT owner_id FROM public.workrooms WHERE id = workroom_id)
  );
CREATE POLICY "Owners manage members" ON public.workroom_members 
  FOR ALL USING (auth.uid() IN (SELECT owner_id FROM public.workrooms WHERE id = workroom_id));

-- WorkRoom tasks
CREATE POLICY "Members view tasks" ON public.workroom_tasks 
  FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.workroom_members WHERE workroom_id = workroom_tasks.workroom_id));
CREATE POLICY "Members create tasks" ON public.workroom_tasks 
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM public.workroom_members WHERE workroom_id = workroom_tasks.workroom_id));
CREATE POLICY "Members update tasks" ON public.workroom_tasks 
  FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM public.workroom_members WHERE workroom_id = workroom_tasks.workroom_id));

-- WorkRoom files
CREATE POLICY "Members view files" ON public.workroom_files 
  FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.workroom_members WHERE workroom_id = workroom_files.workroom_id));
CREATE POLICY "Members upload files" ON public.workroom_files 
  FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

-- WorkRoom comments
CREATE POLICY "Members view comments" ON public.workroom_comments 
  FOR SELECT USING (auth.uid() IN (SELECT user_id FROM public.workroom_members WHERE workroom_id = workroom_comments.workroom_id));
CREATE POLICY "Members create comments" ON public.workroom_comments 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Work diary
CREATE POLICY "Users view own diary" ON public.work_diary_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create diary entries" ON public.work_diary_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own entries" ON public.work_diary_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Clients view project diary" ON public.work_diary_entries 
  FOR SELECT USING (auth.uid() IN (SELECT owner_id FROM public.workrooms WHERE id = workroom_id));