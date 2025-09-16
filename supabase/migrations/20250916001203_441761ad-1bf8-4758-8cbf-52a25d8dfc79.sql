-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can manage their own game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Users can view their own game sessions" ON public.game_sessions;

-- Update user profiles table structure for NaijaLance (only add if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'balance_withdrawable') THEN
    ALTER TABLE public.profiles ADD COLUMN balance_withdrawable NUMERIC DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'balance_non_withdrawable') THEN
    ALTER TABLE public.profiles ADD COLUMN balance_non_withdrawable NUMERIC DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'transaction_pin') THEN
    ALTER TABLE public.profiles ADD COLUMN transaction_pin TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email_confirmed') THEN
    ALTER TABLE public.profiles ADD COLUMN email_confirmed BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Create transactions table (drop and recreate to ensure clean state)
DROP TABLE IF EXISTS public.transactions CASCADE;
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id),
  transaction_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  balance_type TEXT NOT NULL,
  recipient_id UUID REFERENCES public.profiles(user_id),
  description TEXT,
  status TEXT DEFAULT 'completed',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS and create policies for transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = recipient_id);

CREATE POLICY "System can insert transactions" ON public.transactions
  FOR INSERT WITH CHECK (true);

-- Update existing game_sessions table policies
CREATE POLICY "Users can view their own game sessions" ON public.game_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own game sessions" ON public.game_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own game sessions" ON public.game_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Create predictor questions table
DROP TABLE IF EXISTS public.predictor_questions CASCADE;
CREATE TABLE public.predictor_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  options JSONB NOT NULL,
  stake_amount NUMERIC NOT NULL DEFAULT 20,
  total_pool NUMERIC DEFAULT 0,
  correct_option INTEGER,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.predictor_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active predictor questions" ON public.predictor_questions
  FOR SELECT USING (status = 'active');

CREATE POLICY "Admins can manage predictor questions" ON public.predictor_questions
  FOR ALL USING (is_admin_user());

-- Create predictor bets table
DROP TABLE IF EXISTS public.predictor_bets CASCADE;
CREATE TABLE public.predictor_bets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id),
  question_id UUID NOT NULL REFERENCES public.predictor_questions(id),
  selected_option INTEGER NOT NULL,
  stake_amount NUMERIC NOT NULL,
  winnings NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.predictor_bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bets" ON public.predictor_bets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bets" ON public.predictor_bets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create trivia questions table
DROP TABLE IF EXISTS public.trivia_questions CASCADE;
CREATE TABLE public.trivia_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer INTEGER NOT NULL,
  difficulty TEXT DEFAULT 'medium',
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.trivia_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active trivia questions" ON public.trivia_questions
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage trivia questions" ON public.trivia_questions
  FOR ALL USING (is_admin_user());

-- Create indexes for performance
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_type ON public.transactions(transaction_type);
CREATE INDEX idx_predictor_bets_user_id ON public.predictor_bets(user_id);
CREATE INDEX idx_predictor_bets_question_id ON public.predictor_bets(question_id);

-- Insert sample trivia questions
INSERT INTO public.trivia_questions (question, options, correct_answer, category) VALUES
('What is the capital of Nigeria?', '["Lagos", "Abuja", "Kano", "Port Harcourt"]', 1, 'geography'),
('Which year did Nigeria gain independence?', '["1958", "1959", "1960", "1961"]', 2, 'history'),
('What is the largest ethnic group in Nigeria?', '["Yoruba", "Igbo", "Hausa", "Fulani"]', 2, 'culture'),
('Which Nigerian author won the Nobel Prize in Literature?', '["Chinua Achebe", "Wole Soyinka", "Ben Okri", "Chimamanda Adichie"]', 1, 'literature'),
('What is the official language of Nigeria?', '["Hausa", "Yoruba", "English", "Igbo"]', 2, 'general');

-- Insert sample predictor questions
INSERT INTO public.predictor_questions (title, description, options, stake_amount) VALUES
('Who will win the next Premier League title?', 'Predict the winner of the 2024/25 Premier League season', '["Manchester City", "Arsenal", "Liverpool", "Chelsea", "Manchester United"]', 20),
('Next Nigerian President Election', 'Who will be the next elected President of Nigeria?', '["Candidate A", "Candidate B", "Candidate C", "Others"]', 50);

-- Function to safely transfer funds between users
CREATE OR REPLACE FUNCTION public.transfer_funds(
  sender_id UUID,
  recipient_email TEXT,
  amount NUMERIC,
  pin_hash TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_profile RECORD;
  sender_balance NUMERIC;
  result JSONB;
BEGIN
  -- Validate sender exists and PIN matches
  SELECT balance_withdrawable, transaction_pin INTO sender_balance, pin_hash
  FROM profiles WHERE user_id = sender_id;
  
  IF NOT FOUND THEN
    RETURN '{"success": false, "error": "Sender not found"}';
  END IF;
  
  -- Find recipient by email
  SELECT user_id, full_name, email_confirmed 
  INTO recipient_profile
  FROM profiles 
  WHERE phone_number = recipient_email OR user_id IN (
    SELECT id FROM auth.users WHERE email = recipient_email
  );
  
  IF NOT FOUND THEN
    RETURN '{"success": false, "error": "Recipient not found"}';
  END IF;
  
  IF NOT recipient_profile.email_confirmed THEN
    RETURN '{"success": false, "error": "Recipient email not confirmed"}';
  END IF;
  
  -- Validate amount and balance
  IF amount <= 0 THEN
    RETURN '{"success": false, "error": "Invalid amount"}';
  END IF;
  
  IF sender_balance < amount THEN
    RETURN '{"success": false, "error": "Insufficient balance"}';
  END IF;
  
  IF sender_id = recipient_profile.user_id THEN
    RETURN '{"success": false, "error": "Cannot transfer to yourself"}';
  END IF;
  
  -- Perform the transfer
  UPDATE profiles SET balance_withdrawable = balance_withdrawable - amount 
  WHERE user_id = sender_id;
  
  UPDATE profiles SET balance_withdrawable = balance_withdrawable + amount 
  WHERE user_id = recipient_profile.user_id;
  
  -- Log transactions
  INSERT INTO transactions (user_id, transaction_type, amount, balance_type, recipient_id, description)
  VALUES (sender_id, 'transfer_out', -amount, 'withdrawable', recipient_profile.user_id, 'Transfer to ' || recipient_profile.full_name);
  
  INSERT INTO transactions (user_id, transaction_type, amount, balance_type, recipient_id, description)
  VALUES (recipient_profile.user_id, 'transfer_in', amount, 'withdrawable', sender_id, 'Transfer from sender');
  
  RETURN jsonb_build_object(
    'success', true, 
    'recipient_name', recipient_profile.full_name,
    'amount', amount
  );
END;
$$;