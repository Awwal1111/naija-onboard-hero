-- Create storage bucket for group media uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('group-uploads', 'group-uploads', false);

-- Create storage policies for group uploads
CREATE POLICY "Group members can view group media" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'group-uploads' AND 
  (storage.foldername(name))[1] IN (
    SELECT group_id::text FROM public.group_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Group members can upload group media" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'group-uploads' AND 
  (storage.foldername(name))[1] IN (
    SELECT group_id::text FROM public.group_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can update their own group uploads" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'group-uploads' AND 
  (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users can delete their own group uploads" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'group-uploads' AND 
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Add RLS policies for missing tables
CREATE POLICY "Group events viewable by group members" ON public.group_events
  FOR SELECT USING (
    group_id IN (
      SELECT group_id FROM public.group_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Group leads can create events" ON public.group_events
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM public.groups 
      WHERE id = group_id AND (
        group_lead_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.group_members 
          WHERE group_id = groups.id AND user_id = auth.uid() AND role IN ('lead', 'moderator')
        )
      )
    )
  );

CREATE POLICY "Group leads can update events" ON public.group_events
  FOR UPDATE USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM public.groups 
      WHERE id = group_id AND group_lead_id = auth.uid()
    )
  );

-- Group polls policies
CREATE POLICY "Group members can view polls" ON public.group_polls
  FOR SELECT USING (
    group_id IN (
      SELECT group_id FROM public.group_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Group leads can create polls" ON public.group_polls
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    group_id IN (
      SELECT group_id FROM public.group_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Poll votes policies  
CREATE POLICY "Group members can vote" ON public.group_poll_votes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    poll_id IN (
      SELECT id FROM public.group_polls 
      WHERE group_id IN (
        SELECT group_id FROM public.group_members 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Users can view poll votes" ON public.group_poll_votes
  FOR SELECT USING (
    poll_id IN (
      SELECT id FROM public.group_polls 
      WHERE group_id IN (
        SELECT group_id FROM public.group_members 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- AI moderation and violations policies (admin only)
CREATE POLICY "Only admins can view moderation logs" ON public.ai_moderation_logs
  FOR SELECT USING (is_admin_user());

CREATE POLICY "Only system can insert moderation logs" ON public.ai_moderation_logs
  FOR INSERT WITH CHECK (false); -- Only edge functions can insert

CREATE POLICY "Only admins can view user violations" ON public.user_violations
  FOR SELECT USING (is_admin_user());

CREATE POLICY "Only system can manage violations" ON public.user_violations
  FOR ALL USING (false); -- Only edge functions can manage

-- Set proper search path for functions
ALTER FUNCTION public.update_group_member_count() SET search_path = public;
ALTER FUNCTION public.prevent_duplicate_groups() SET search_path = public;