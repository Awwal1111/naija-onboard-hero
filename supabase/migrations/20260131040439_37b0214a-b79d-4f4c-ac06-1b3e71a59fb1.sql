-- Communication Analytics Table for tracking button clicks
CREATE TABLE IF NOT EXISTS public.communication_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  button_type TEXT NOT NULL CHECK (button_type IN ('whatsapp', 'phone', 'email', 'google_meet', 'facebook')),
  source_page TEXT,
  source_context TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.communication_analytics ENABLE ROW LEVEL SECURITY;

-- Users can insert their own analytics
CREATE POLICY "Users can insert own analytics" ON public.communication_analytics
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all analytics via user_roles table
CREATE POLICY "Admins can view all analytics" ON public.communication_analytics
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Create index for efficient admin dashboard queries
CREATE INDEX idx_communication_analytics_created_at ON public.communication_analytics(created_at DESC);
CREATE INDEX idx_communication_analytics_button_type ON public.communication_analytics(button_type);

-- Add user_mode to profiles for freelancer/client differentiation
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_mode TEXT DEFAULT 'both' CHECK (user_mode IN ('freelancer', 'client', 'both'));