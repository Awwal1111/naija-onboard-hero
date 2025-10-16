-- Create disputes table for transaction dispute management
CREATE TABLE IF NOT EXISTS public.transaction_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL,
  dispute_reason TEXT NOT NULL,
  dispute_details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'rejected')),
  admin_response TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.transaction_disputes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for disputes
CREATE POLICY "Users can create their own disputes"
  ON public.transaction_disputes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own disputes"
  ON public.transaction_disputes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all disputes"
  ON public.transaction_disputes
  FOR SELECT
  TO authenticated
  USING (is_admin_user());

CREATE POLICY "Admins can update disputes"
  ON public.transaction_disputes
  FOR UPDATE
  TO authenticated
  USING (is_admin_user());

-- Add index for performance
CREATE INDEX idx_transaction_disputes_user_id ON public.transaction_disputes(user_id);
CREATE INDEX idx_transaction_disputes_status ON public.transaction_disputes(status);
CREATE INDEX idx_transaction_disputes_created_at ON public.transaction_disputes(created_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_transaction_disputes_updated_at
  BEFORE UPDATE ON public.transaction_disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();