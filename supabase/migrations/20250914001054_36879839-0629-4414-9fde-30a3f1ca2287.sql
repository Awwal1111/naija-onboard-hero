-- Create group chat tables and related functionality
CREATE TYPE public.group_category AS ENUM (
  'technology', 'business', 'healthcare', 'education', 'agriculture', 
  'construction', 'finance', 'legal', 'creative', 'other'
);

-- Groups table
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category public.group_category NOT NULL,
  state_name TEXT NOT NULL,
  lga_name TEXT NOT NULL,
  area TEXT NOT NULL,
  description TEXT,
  group_lead_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  member_count INTEGER DEFAULT 1,
  UNIQUE(category, state_name, lga_name, area)
);

-- Group members table
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'lead')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(group_id, user_id)
);

-- Group messages table
CREATE TABLE public.group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file', 'poll')),
  media_url TEXT,
  media_type TEXT,
  is_pinned BOOLEAN DEFAULT false,
  reply_to_id UUID REFERENCES public.group_messages(id),
  mentions UUID[],
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Message reactions table
CREATE TABLE public.group_message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.group_messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'love', 'laugh', 'wow', 'sad', 'angry', 'support')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, reaction_type)
);

-- Group events table (for group leads)
CREATE TABLE public.group_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Group polls table
CREATE TABLE public.group_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  created_by UUID NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of options with vote counts
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Poll votes table
CREATE TABLE public.group_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES public.group_polls(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  selected_option INTEGER NOT NULL, -- Index of selected option
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- AI moderation logs
CREATE TABLE public.ai_moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.group_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  violation_type TEXT NOT NULL CHECK (violation_type IN ('spam', 'abuse', 'sensitive_info', 'inappropriate')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  action_taken TEXT NOT NULL CHECK (action_taken IN ('warning', 'message_deleted', 'user_removed')),
  content_flagged TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User warnings/violations table
CREATE TABLE public.user_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  violation_count INTEGER DEFAULT 1,
  last_violation_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_banned BOOLEAN DEFAULT false,
  ban_expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, group_id)
);

-- Enable Row Level Security
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_moderation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_violations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for groups
CREATE POLICY "Groups are viewable by authenticated users" ON public.groups
  FOR SELECT USING (is_active = true);

CREATE POLICY "Verified experts can create groups" ON public.groups
  FOR INSERT WITH CHECK (
    auth.uid() = group_lead_id AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND is_expert = true AND expert_verified_at IS NOT NULL
    )
  );

CREATE POLICY "Group leads can update their groups" ON public.groups
  FOR UPDATE USING (auth.uid() = group_lead_id);

-- RLS Policies for group members
CREATE POLICY "Group members can view their memberships" ON public.group_members
  FOR SELECT USING (
    user_id = auth.uid() OR 
    group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can join groups" ON public.group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave groups or leads can remove members" ON public.group_members
  FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.groups WHERE id = group_id AND group_lead_id = auth.uid())
  );

-- RLS Policies for group messages
CREATE POLICY "Group members can view messages" ON public.group_messages
  FOR SELECT USING (
    group_id IN (
      SELECT group_id FROM public.group_members 
      WHERE user_id = auth.uid() AND is_active = true
    ) AND deleted_at IS NULL
  );

CREATE POLICY "Group members can send messages" ON public.group_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    group_id IN (
      SELECT group_id FROM public.group_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can update their own messages" ON public.group_messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- RLS Policies for message reactions
CREATE POLICY "Group members can view reactions" ON public.group_message_reactions
  FOR SELECT USING (
    message_id IN (
      SELECT id FROM public.group_messages 
      WHERE group_id IN (
        SELECT group_id FROM public.group_members 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Group members can react to messages" ON public.group_message_reactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    message_id IN (
      SELECT id FROM public.group_messages 
      WHERE group_id IN (
        SELECT group_id FROM public.group_members 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- Indexes for performance
CREATE INDEX idx_groups_category_location ON public.groups(category, state_name, lga_name, area);
CREATE INDEX idx_group_members_user_group ON public.group_members(user_id, group_id);
CREATE INDEX idx_group_messages_group_created ON public.group_messages(group_id, created_at);
CREATE INDEX idx_group_messages_sender ON public.group_messages(sender_id);
CREATE INDEX idx_message_reactions_message ON public.group_message_reactions(message_id);

-- Function to update group member count
CREATE OR REPLACE FUNCTION public.update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.groups 
    SET member_count = member_count + 1 
    WHERE id = NEW.group_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.groups 
    SET member_count = member_count - 1 
    WHERE id = OLD.group_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle membership status changes
    IF OLD.is_active = true AND NEW.is_active = false THEN
      UPDATE public.groups 
      SET member_count = member_count - 1 
      WHERE id = NEW.group_id;
    ELSIF OLD.is_active = false AND NEW.is_active = true THEN
      UPDATE public.groups 
      SET member_count = member_count + 1 
      WHERE id = NEW.group_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for group member count
CREATE TRIGGER update_group_member_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.group_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_group_member_count();

-- Function to check for duplicate groups
CREATE OR REPLACE FUNCTION public.prevent_duplicate_groups()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.groups 
    WHERE category = NEW.category 
    AND state_name = NEW.state_name 
    AND lga_name = NEW.lga_name 
    AND area = NEW.area 
    AND is_active = true
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'A group with this category and location already exists';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent duplicate groups
CREATE TRIGGER prevent_duplicate_groups_trigger
  BEFORE INSERT OR UPDATE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_duplicate_groups();