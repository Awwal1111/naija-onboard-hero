-- Fix function search path issues by updating the functions

-- Update generate_referral_code function with proper search_path
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
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
$$;

-- Update assign_referral_code function with proper search_path
CREATE OR REPLACE FUNCTION public.assign_referral_code()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

-- Update check_referral_reward function with proper search_path
CREATE OR REPLACE FUNCTION public.check_referral_reward()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
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
$$;