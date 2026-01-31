-- Contest Escrow Enhancement
-- Add escrow_transaction_id to track wallet deduction
ALTER TABLE public.contests 
ADD COLUMN IF NOT EXISTS escrow_transaction_id TEXT,
ADD COLUMN IF NOT EXISTS escrow_amount_held NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS prize_distributed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS prize_distribution_status TEXT DEFAULT 'pending';

-- Link workrooms to jobs/contracts
ALTER TABLE public.workrooms
ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.jobs(id),
ADD COLUMN IF NOT EXISTS contract_id UUID,
ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'fixed' CHECK (payment_type IN ('fixed', 'hourly', 'milestone'));

-- Link work diary entries to billable tracking
ALTER TABLE public.work_diary_entries
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'invoiced', 'paid'));

-- Contest activity notifications table
CREATE TABLE IF NOT EXISTS public.contest_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Workroom activity notifications table  
CREATE TABLE IF NOT EXISTS public.workroom_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workroom_id UUID NOT NULL REFERENCES public.workrooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT,
  related_task_id UUID REFERENCES public.workroom_tasks(id),
  related_file_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contest_activities_contest_id ON public.contest_activities(contest_id);
CREATE INDEX IF NOT EXISTS idx_contest_activities_created_at ON public.contest_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workroom_activities_workroom_id ON public.workroom_activities(workroom_id);
CREATE INDEX IF NOT EXISTS idx_workroom_activities_created_at ON public.workroom_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workrooms_job_id ON public.workrooms(job_id);
CREATE INDEX IF NOT EXISTS idx_work_diary_payment_status ON public.work_diary_entries(payment_status);

-- Enable RLS
ALTER TABLE public.contest_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workroom_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contest_activities
CREATE POLICY "Users can view activities for contests they participate in"
ON public.contest_activities FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.contests c 
    WHERE c.id = contest_id 
    AND (c.client_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.contest_submissions cs WHERE cs.contest_id = c.id AND cs.freelancer_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can create activities for their own actions"
ON public.contest_activities FOR INSERT
WITH CHECK (user_id = auth.uid());

-- RLS Policies for workroom_activities
CREATE POLICY "Workroom members can view activities"
ON public.workroom_activities FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workroom_members wm 
    WHERE wm.workroom_id = workroom_activities.workroom_id 
    AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Workroom members can create activities"
ON public.workroom_activities FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workroom_members wm 
    WHERE wm.workroom_id = workroom_activities.workroom_id 
    AND wm.user_id = auth.uid()
  )
);

-- Function to validate contest creation (check wallet balance)
CREATE OR REPLACE FUNCTION public.validate_contest_creation()
RETURNS TRIGGER AS $$
DECLARE
  user_balance NUMERIC;
BEGIN
  -- Get user's available balance
  SELECT COALESCE(wallet_balance, 0) INTO user_balance
  FROM public.profiles
  WHERE user_id = NEW.client_id;
  
  -- Check if user has enough balance for prize
  IF user_balance < NEW.prize_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance. You need NC % to create this contest. Your balance: NC %', 
      NEW.prize_amount, user_balance;
  END IF;
  
  -- Deduct from wallet and set escrow
  UPDATE public.profiles
  SET wallet_balance = wallet_balance - NEW.prize_amount,
      balance_withdrawable = GREATEST(0, balance_withdrawable - NEW.prize_amount)
  WHERE user_id = NEW.client_id;
  
  -- Mark contest as escrow funded
  NEW.escrow_funded = TRUE;
  NEW.escrow_amount_held = NEW.prize_amount;
  NEW.status = 'open';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for contest creation
DROP TRIGGER IF EXISTS contest_creation_validation ON public.contests;
CREATE TRIGGER contest_creation_validation
  BEFORE INSERT ON public.contests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_contest_creation();

-- Function to distribute contest prize to winner
CREATE OR REPLACE FUNCTION public.distribute_contest_prize()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run when winner is selected and status changes to completed
  IF NEW.winner_id IS NOT NULL 
     AND NEW.status = 'completed' 
     AND (OLD.winner_id IS NULL OR OLD.status != 'completed')
     AND NEW.prize_distribution_status = 'pending' THEN
    
    -- Credit winner's wallet (to withdrawable balance)
    UPDATE public.profiles
    SET wallet_balance = wallet_balance + NEW.escrow_amount_held,
        balance_withdrawable = balance_withdrawable + NEW.escrow_amount_held
    WHERE user_id = NEW.winner_id;
    
    -- Record transaction for winner
    INSERT INTO public.wallet_transactions (user_id, kind, amount, status, reference)
    VALUES (
      NEW.winner_id, 
      'contest_prize', 
      NEW.escrow_amount_held, 
      'completed',
      'Contest prize: ' || NEW.title
    );
    
    -- Update contest distribution status
    NEW.prize_distributed_at = now();
    NEW.prize_distribution_status = 'completed';
    
    -- Create notification for winner
    INSERT INTO public.notifications (user_id, title, message, type, data)
    VALUES (
      NEW.winner_id,
      '🏆 Congratulations! You Won!',
      'You won the contest "' || NEW.title || '" and received NC ' || NEW.escrow_amount_held::TEXT || '!',
      'contest',
      jsonb_build_object('contest_id', NEW.id, 'amount', NEW.escrow_amount_held)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for prize distribution
DROP TRIGGER IF EXISTS contest_prize_distribution ON public.contests;
CREATE TRIGGER contest_prize_distribution
  BEFORE UPDATE ON public.contests
  FOR EACH ROW
  EXECUTE FUNCTION public.distribute_contest_prize();

-- Function to handle contest cancellation refund
CREATE OR REPLACE FUNCTION public.refund_contest_escrow()
RETURNS TRIGGER AS $$
BEGIN
  -- Only refund if cancelling a funded contest
  IF NEW.status = 'cancelled' 
     AND OLD.status != 'cancelled' 
     AND OLD.escrow_funded = TRUE 
     AND OLD.winner_id IS NULL THEN
    
    -- Refund to client
    UPDATE public.profiles
    SET wallet_balance = wallet_balance + OLD.escrow_amount_held,
        balance_withdrawable = balance_withdrawable + OLD.escrow_amount_held
    WHERE user_id = OLD.client_id;
    
    -- Record refund transaction
    INSERT INTO public.wallet_transactions (user_id, kind, amount, status, reference)
    VALUES (
      OLD.client_id, 
      'contest_refund', 
      OLD.escrow_amount_held, 
      'completed',
      'Contest refund: ' || OLD.title
    );
    
    NEW.escrow_funded = FALSE;
    NEW.escrow_amount_held = 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for contest cancellation refund
DROP TRIGGER IF EXISTS contest_cancellation_refund ON public.contests;
CREATE TRIGGER contest_cancellation_refund
  BEFORE UPDATE ON public.contests
  FOR EACH ROW
  EXECUTE FUNCTION public.refund_contest_escrow();