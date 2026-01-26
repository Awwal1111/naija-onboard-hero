-- Fix workroom and contest RLS policies to allow INSERT with immediate SELECT

-- First, check and add policy for workroom owners to immediately see their created workrooms
DROP POLICY IF EXISTS "Users create workrooms" ON public.workrooms;
CREATE POLICY "Users create workrooms" ON public.workrooms 
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Add policy to let owners read their created workrooms immediately (needed for .select() after insert)
DROP POLICY IF EXISTS "Owners view own workrooms" ON public.workrooms;
CREATE POLICY "Owners view own workrooms" ON public.workrooms 
  FOR SELECT USING (auth.uid() = owner_id);

-- Fix workroom_members INSERT policy - allow users to add themselves as members
DROP POLICY IF EXISTS "Users join workrooms" ON public.workroom_members;
CREATE POLICY "Users join workrooms" ON public.workroom_members 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow members to view their membership
DROP POLICY IF EXISTS "Members view own membership" ON public.workroom_members;
CREATE POLICY "Members view own membership" ON public.workroom_members 
  FOR SELECT USING (auth.uid() = user_id);

-- Fix contest RLS policies
DROP POLICY IF EXISTS "Anyone view open contests" ON public.contests;
CREATE POLICY "Anyone view open contests" ON public.contests 
  FOR SELECT USING (status = 'open' OR auth.uid() = client_id);

DROP POLICY IF EXISTS "Users create contests" ON public.contests;
CREATE POLICY "Users create contests" ON public.contests 
  FOR INSERT WITH CHECK (auth.uid() = client_id);

-- Owners can update their contests
DROP POLICY IF EXISTS "Owners update contests" ON public.contests;
CREATE POLICY "Owners update contests" ON public.contests 
  FOR UPDATE USING (auth.uid() = client_id);

-- Fix contest_submissions RLS
DROP POLICY IF EXISTS "Anyone view submissions" ON public.contest_submissions;
CREATE POLICY "Anyone view submissions" ON public.contest_submissions 
  FOR SELECT USING (
    auth.uid() = freelancer_id OR 
    auth.uid() IN (SELECT client_id FROM public.contests WHERE id = contest_id)
  );

DROP POLICY IF EXISTS "Freelancers submit to contests" ON public.contest_submissions;
CREATE POLICY "Freelancers submit to contests" ON public.contest_submissions 
  FOR INSERT WITH CHECK (auth.uid() = freelancer_id);

DROP POLICY IF EXISTS "Freelancers update own submissions" ON public.contest_submissions;
CREATE POLICY "Freelancers update own submissions" ON public.contest_submissions 
  FOR UPDATE USING (auth.uid() = freelancer_id);

-- Allow contest owners to update submissions (for selecting winners)
DROP POLICY IF EXISTS "Contest owners update submissions" ON public.contest_submissions;
CREATE POLICY "Contest owners update submissions" ON public.contest_submissions 
  FOR UPDATE USING (
    auth.uid() IN (SELECT client_id FROM public.contests WHERE id = contest_id)
  );