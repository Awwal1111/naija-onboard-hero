-- Create AI Copilot settings and memory table
CREATE TABLE public.ai_copilot_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  copilot_name TEXT NOT NULL DEFAULT 'NaijaLancers Copilot',
  expertise TEXT NOT NULL DEFAULT 'all-rounder',
  tone TEXT NOT NULL DEFAULT 'professional',
  is_visible BOOLEAN NOT NULL DEFAULT true,
  client_mode BOOLEAN NOT NULL DEFAULT false,
  memory_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AI conversation memory table
CREATE TABLE public.ai_copilot_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  media_url TEXT,
  metadata JSONB DEFAULT '{}',
  is_saved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create saved AI outputs table
CREATE TABLE public.ai_copilot_saved (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message_id UUID REFERENCES public.ai_copilot_messages(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  output_type TEXT NOT NULL,
  media_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_copilot_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_copilot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_copilot_saved ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_copilot_settings
CREATE POLICY "Users can view their own AI settings" 
ON public.ai_copilot_settings FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI settings" 
ON public.ai_copilot_settings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI settings" 
ON public.ai_copilot_settings FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for ai_copilot_messages
CREATE POLICY "Users can view their own AI messages" 
ON public.ai_copilot_messages FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI messages" 
ON public.ai_copilot_messages FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI messages" 
ON public.ai_copilot_messages FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI messages" 
ON public.ai_copilot_messages FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for ai_copilot_saved
CREATE POLICY "Users can view their own saved AI outputs" 
ON public.ai_copilot_saved FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved AI outputs" 
ON public.ai_copilot_saved FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved AI outputs" 
ON public.ai_copilot_saved FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_ai_copilot_messages_user_id ON public.ai_copilot_messages(user_id);
CREATE INDEX idx_ai_copilot_messages_created_at ON public.ai_copilot_messages(created_at DESC);
CREATE INDEX idx_ai_copilot_saved_user_id ON public.ai_copilot_saved(user_id);

-- Create trigger for updated_at on settings
CREATE TRIGGER update_ai_copilot_settings_updated_at
BEFORE UPDATE ON public.ai_copilot_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();