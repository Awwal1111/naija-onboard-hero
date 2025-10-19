-- Create table for manual deposit requests via Telegram
CREATE TABLE IF NOT EXISTS public.manual_deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_user_id TEXT,
  telegram_username TEXT,
  amount_claimed NUMERIC NOT NULL,
  amount_approved NUMERIC,
  proof_url TEXT,
  transaction_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.manual_deposits ENABLE ROW LEVEL SECURITY;

-- Users can view their own deposits
CREATE POLICY "Users can view their own deposits"
ON public.manual_deposits
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own deposits
CREATE POLICY "Users can create deposits"
ON public.manual_deposits
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all deposits
CREATE POLICY "Admins can view all deposits"
ON public.manual_deposits
FOR SELECT
USING (is_admin_user());

-- Admins can update deposits
CREATE POLICY "Admins can update deposits"
ON public.manual_deposits
FOR UPDATE
USING (is_admin_user());

-- Create index for faster queries
CREATE INDEX idx_manual_deposits_user_id ON public.manual_deposits(user_id);
CREATE INDEX idx_manual_deposits_status ON public.manual_deposits(status);
CREATE INDEX idx_manual_deposits_telegram ON public.manual_deposits(telegram_user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_manual_deposits_updated_at
BEFORE UPDATE ON public.manual_deposits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();