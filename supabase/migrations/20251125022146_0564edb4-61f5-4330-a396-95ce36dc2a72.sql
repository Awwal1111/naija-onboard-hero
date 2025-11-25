-- Create expert_classes table
CREATE TABLE IF NOT EXISTS public.expert_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expert_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  class_type TEXT NOT NULL DEFAULT 'live', -- live, upcoming, on-demand
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, live, completed, cancelled
  scheduled_start TIMESTAMP WITH TIME ZONE,
  scheduled_end TIMESTAMP WITH TIME ZONE,
  actual_start TIMESTAMP WITH TIME ZONE,
  actual_end TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  max_participants INTEGER DEFAULT 20,
  current_participants INTEGER DEFAULT 0,
  is_free BOOLEAN DEFAULT true,
  price DECIMAL(10, 2) DEFAULT 0,
  room_code TEXT NOT NULL UNIQUE,
  category TEXT,
  thumbnail_url TEXT,
  recording_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create class_participants table
CREATE TABLE IF NOT EXISTS public.class_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.expert_classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(class_id, user_id)
);

-- Enable RLS
ALTER TABLE public.expert_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_participants ENABLE ROW LEVEL SECURITY;

-- Policies for expert_classes
CREATE POLICY "Anyone can view published classes"
  ON public.expert_classes FOR SELECT
  USING (status IN ('scheduled', 'live'));

CREATE POLICY "Experts can create their own classes"
  ON public.expert_classes FOR INSERT
  WITH CHECK (auth.uid() = expert_id);

CREATE POLICY "Experts can update their own classes"
  ON public.expert_classes FOR UPDATE
  USING (auth.uid() = expert_id);

CREATE POLICY "Experts can delete their own classes"
  ON public.expert_classes FOR DELETE
  USING (auth.uid() = expert_id);

-- Policies for class_participants
CREATE POLICY "Users can view participants in classes they joined"
  ON public.class_participants FOR SELECT
  USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.expert_classes 
      WHERE id = class_id AND expert_id = auth.uid()
    )
  );

CREATE POLICY "Users can join classes"
  ON public.class_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their participation"
  ON public.class_participants FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_expert_classes_expert_id ON public.expert_classes(expert_id);
CREATE INDEX idx_expert_classes_status ON public.expert_classes(status);
CREATE INDEX idx_expert_classes_scheduled_start ON public.expert_classes(scheduled_start);
CREATE INDEX idx_class_participants_class_id ON public.class_participants(class_id);
CREATE INDEX idx_class_participants_user_id ON public.class_participants(user_id);

-- Create updated_at trigger
CREATE TRIGGER update_expert_classes_updated_at
  BEFORE UPDATE ON public.expert_classes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();