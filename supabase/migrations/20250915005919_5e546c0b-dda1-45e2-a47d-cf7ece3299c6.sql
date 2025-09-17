-- Update user profiles table structure for NaijaLance
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS balance_withdrawable NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS balance_non_withdrawable NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS transaction_pin TEXT,
ADD COLUMN IF NOT EXISTS email_confirmed BOOLEAN DEFAULT FALSE;

-- Create transactions table for tracking all financial activities
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id),
  transaction_type TEXT NOT NULL, -- 'transfer_in', 'transfer_out', 'game_win', 'game_loss', 'purchase', 'withdrawal', 'daily_signin', 'referral', 'social_task'
  amount NUMERIC NOT NULL,
  balance_type TEXT NOT NULL, -- 'withdrawable', 'non_withdrawable'
  recipient_id UUID REFERENCES public.profiles(user_id),
  description TEXT,
  status TEXT DEFAULT 'completed', -- 'pending', 'completed', 'failed'
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create game sessions table for tracking game plays
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id),
  game_type TEXT NOT NULL, -- 'spin_wheel', 'trivia', 'predictor'
  entry_fee NUMERIC NOT NULL,
  winnings NUMERIC DEFAULT 0,
  game_data JSONB,
  status TEXT DEFAULT 'completed', -- 'active', 'completed', 'abandoned'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create predictor questions table
CREATE TABLE IF NOT EXISTS public.predictor_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  options JSONB NOT NULL, -- Array of options
  stake_amount NUMERIC NOT NULL DEFAULT 20,
  total_pool NUMERIC DEFAULT 0,
  correct_option INTEGER, -- Index of correct option (set by admin)
  status TEXT DEFAULT 'active', -- 'active', 'resolved', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create predictor bets table
CREATE TABLE IF NOT EXISTS public.predictor_bets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id),
  question_id UUID NOT NULL REFERENCES public.predictor_questions(id),
  selected_option INTEGER NOT NULL,
  stake_amount NUMERIC NOT NULL,
  winnings NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending', -- 'pending', 'won', 'lost'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trivia questions table
CREATE TABLE IF NOT EXISTS public.trivia_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of 4 options
  correct_answer INTEGER NOT NULL, -- Index of correct answer (0-3)
  difficulty TEXT DEFAULT 'medium', -- 'easy', 'medium', 'hard'
  category TEXT DEFAULT 'general', -- 'history', 'culture', 'sports', etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictor_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictor_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trivia_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transactions
CREATE POLICY "Users can view their own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for game sessions
CREATE POLICY "Users can view their own game sessions" ON public.game_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own game sessions" ON public.game_sessions
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for predictor questions
CREATE POLICY "Anyone can view active predictor questions" ON public.predictor_questions
  FOR SELECT USING (status = 'active');

CREATE POLICY "Admins can manage predictor questions" ON public.predictor_questions
  FOR ALL USING (is_admin_user());

-- RLS Policies for predictor bets
CREATE POLICY "Users can view their own bets" ON public.predictor_bets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bets" ON public.predictor_bets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for trivia questions
CREATE POLICY "Anyone can view active trivia questions" ON public.trivia_questions
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage trivia questions" ON public.trivia_questions
  FOR ALL USING (is_admin_user());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON public.game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictor_bets_user_id ON public.predictor_bets(user_id);
CREATE INDEX IF NOT EXISTS idx_predictor_bets_question_id ON public.predictor_bets(question_id);

-- Function to update user balance safely
CREATE OR REPLACE FUNCTION public.update_user_balance(
  target_user_id UUID,
  amount_change NUMERIC,
  balance_type TEXT,
  transaction_type TEXT,
  description TEXT DEFAULT NULL,
  recipient_id UUID DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance NUMERIC;
  new_balance NUMERIC;
BEGIN
  -- Get current balance
  IF balance_type = 'withdrawable' THEN
    SELECT balance_withdrawable INTO current_balance 
    FROM profiles WHERE user_id = target_user_id;
  ELSE
    SELECT balance_non_withdrawable INTO current_balance 
    FROM profiles WHERE user_id = target_user_id;
  END IF;
  
  -- Check if user exists
  IF current_balance IS NULL THEN
    RETURN FALSE;
  END IF;
  
  new_balance := current_balance + amount_change;
  
  -- Prevent negative balance
  IF new_balance < 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Update balance
  IF balance_type = 'withdrawable' THEN
    UPDATE profiles SET balance_withdrawable = new_balance 
    WHERE user_id = target_user_id;
  ELSE
    UPDATE profiles SET balance_non_withdrawable = new_balance 
    WHERE user_id = target_user_id;
  END IF;
  
  -- Log transaction
  INSERT INTO transactions (
    user_id, transaction_type, amount, balance_type, 
    recipient_id, description, status
  ) VALUES (
    target_user_id, transaction_type, amount_change, balance_type,
    recipient_id, description, 'completed'
  );
  
  RETURN TRUE;
END;
$$;