-- Add referral_code to profiles table
ALTER TABLE public.profiles ADD COLUMN referral_code TEXT UNIQUE;

-- Create index for referral_code lookups
CREATE INDEX idx_profiles_referral_code ON public.profiles(referral_code);

-- Create referrals table
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  referee_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  points_earned INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE NULL,
  UNIQUE(referrer_id, referee_id)
);

-- Create game_sessions table to track game plays and earnings
CREATE TABLE public.game_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  game_type TEXT NOT NULL CHECK (game_type IN ('guess_number', 'motorbike', 'survey')),
  points_earned INTEGER DEFAULT 0,
  session_data JSONB NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE NULL
);

-- Create survey_completions table for BitLabs tracking
CREATE TABLE public.survey_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bitlabs_user_id TEXT NOT NULL,
  offer_id TEXT NOT NULL,
  points_earned INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  callback_data JSONB NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE NULL,
  UNIQUE(user_id, offer_id)
);

-- Enable RLS on new tables
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referrals
CREATE POLICY "Users can view their own referrals" 
ON public.referrals 
FOR SELECT 
USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

CREATE POLICY "Users can create referrals they are part of" 
ON public.referrals 
FOR INSERT 
WITH CHECK (auth.uid() = referrer_id OR auth.uid() = referee_id);

-- RLS Policies for game_sessions
CREATE POLICY "Users can manage their own game sessions" 
ON public.game_sessions 
FOR ALL
USING (auth.uid() = user_id);

-- RLS Policies for survey_completions
CREATE POLICY "Users can view their own survey completions" 
ON public.survey_completions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own survey completions" 
ON public.survey_completions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 8-character code
    code := upper(substring(encode(gen_random_bytes(6), 'base64') from 1 for 8));
    -- Check if it already exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = code) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically assign referral code on profile creation
CREATE OR REPLACE FUNCTION public.assign_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to assign referral code on profile insert
CREATE TRIGGER assign_referral_code_trigger
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.assign_referral_code();

-- Update existing profiles to have referral codes
UPDATE public.profiles 
SET referral_code = public.generate_referral_code() 
WHERE referral_code IS NULL;

-- Function to check and reward referrer when referee reaches threshold
CREATE OR REPLACE FUNCTION public.check_referral_reward()
RETURNS TRIGGER AS $$
DECLARE
  referral_record RECORD;
BEGIN
  -- Check if wallet balance reached 1000 naira and referral is pending
  IF NEW.wallet_balance >= 1000 AND OLD.wallet_balance < 1000 THEN
    -- Find pending referral where this user is the referee
    SELECT * INTO referral_record 
    FROM public.referrals 
    WHERE referee_id = NEW.user_id AND status = 'pending';
    
    IF FOUND THEN
      -- Update referral status and points
      UPDATE public.referrals 
      SET status = 'completed', 
          points_earned = 100,
          completed_at = now()
      WHERE id = referral_record.id;
      
      -- Add 100 naira to referrer's wallet
      UPDATE public.profiles 
      SET wallet_balance = wallet_balance + 100 
      WHERE user_id = referral_record.referrer_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to check for referral rewards when wallet balance updates
CREATE TRIGGER check_referral_reward_trigger
AFTER UPDATE OF wallet_balance ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.check_referral_reward();

-- Enable real-time for new tables
ALTER TABLE public.referrals REPLICA IDENTITY FULL;
ALTER TABLE public.game_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.survey_completions REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.referrals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.survey_completions;