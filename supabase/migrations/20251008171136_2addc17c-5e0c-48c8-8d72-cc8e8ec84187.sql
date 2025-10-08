-- Create payouts table for withdrawal management
CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  method TEXT NOT NULL DEFAULT 'bank',
  status TEXT NOT NULL DEFAULT 'pending',
  bank_details JSONB,
  paystack_transfer_ref TEXT UNIQUE,
  admin_notes TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- Users can view their own payouts
CREATE POLICY "Users can view own payouts"
ON public.payouts FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can create their own payouts
CREATE POLICY "Users can create own payouts"
ON public.payouts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can view all payouts
CREATE POLICY "Admins can view all payouts"
ON public.payouts FOR SELECT
TO authenticated
USING (is_admin_user());

-- Admins can update payouts
CREATE POLICY "Admins can update payouts"
ON public.payouts FOR UPDATE
TO authenticated
USING (is_admin_user());

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_payouts_user_id ON public.payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON public.payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_created_at ON public.payouts(created_at DESC);