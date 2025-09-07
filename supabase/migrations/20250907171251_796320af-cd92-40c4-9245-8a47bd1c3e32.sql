-- Create daily sign-ins table
CREATE TABLE public.daily_signins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reward_amount NUMERIC NOT NULL DEFAULT 5.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, signin_date)
);

-- Enable Row Level Security
ALTER TABLE public.daily_signins ENABLE ROW LEVEL SECURITY;

-- Users can view their own sign-ins
CREATE POLICY "Users can view their own daily signins" 
ON public.daily_signins 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create their own sign-ins
CREATE POLICY "Users can create their own daily signins" 
ON public.daily_signins 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Admin can view all sign-ins
CREATE POLICY "Admin can view all daily signins" 
ON public.daily_signins 
FOR SELECT 
USING (is_admin_user());

-- Create trigger for updated_at if we add that column later
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;