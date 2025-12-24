-- Add verification fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'submitted', 'verified')),
ADD COLUMN IF NOT EXISTS verification_payment_status text DEFAULT 'not_paid' CHECK (verification_payment_status IN ('not_paid', 'paid')),
ADD COLUMN IF NOT EXISTS verification_description text,
ADD COLUMN IF NOT EXISTS verification_submitted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS verification_reviewed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS verification_reviewed_by uuid REFERENCES auth.users(id);

-- Update all existing experts to default to unverified
UPDATE public.profiles 
SET verification_status = 'unverified' 
WHERE is_expert = true AND verification_status IS NULL;

-- Create index for faster verification queries
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status ON public.profiles(verification_status) WHERE is_expert = true;

-- Create admin verification table to track verification fee payments
CREATE TABLE IF NOT EXISTS public.expert_verification_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 5000,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method text,
  transaction_id uuid REFERENCES public.transactions(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);

-- Enable RLS on verification payments
ALTER TABLE public.expert_verification_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for expert verification payments
CREATE POLICY "Users can view their own verification payments" 
ON public.expert_verification_payments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own verification payments" 
ON public.expert_verification_payments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all verification payments" 
ON public.expert_verification_payments 
FOR SELECT 
USING (is_admin_user());

CREATE POLICY "Admins can update verification payments" 
ON public.expert_verification_payments 
FOR UPDATE 
USING (is_admin_user());