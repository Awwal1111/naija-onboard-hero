-- Create user_wallets table
CREATE TABLE public.user_wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER DEFAULT 0,
  escrow_hold INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create safepay_transactions table
CREATE TABLE public.safepay_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'proposed',
  cancellation_requester_id UUID REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create blocked_users table
CREATE TABLE public.blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- Create disputed_chat_snapshots table
CREATE TABLE public.disputed_chat_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  safepay_id UUID REFERENCES public.safepay_transactions(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  snapshot_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safepay_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputed_chat_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_wallets
CREATE POLICY "Users can view their own wallet" ON public.user_wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet" ON public.user_wallets
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for safepay_transactions
CREATE POLICY "SafePay participants can view transactions" ON public.safepay_transactions
  FOR SELECT USING (auth.uid() IN (buyer_id, seller_id));

CREATE POLICY "Users can create SafePay transactions" ON public.safepay_transactions
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "SafePay participants can update transactions" ON public.safepay_transactions
  FOR UPDATE USING (auth.uid() IN (buyer_id, seller_id));

-- RLS Policies for blocked_users
CREATE POLICY "Users can view their blocks" ON public.blocked_users
  FOR SELECT USING (auth.uid() = blocker_id);

CREATE POLICY "Users can create blocks" ON public.blocked_users
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can delete their blocks" ON public.blocked_users
  FOR DELETE USING (auth.uid() = blocker_id);

-- RLS Policies for disputed_chat_snapshots
CREATE POLICY "Admins can view disputed snapshots" ON public.disputed_chat_snapshots
  FOR SELECT USING (is_admin_user());

-- Add safepay_id column to existing wallet_transactions table
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS safepay_id UUID REFERENCES public.safepay_transactions(id) ON DELETE CASCADE;

-- Database functions for SafePay operations
CREATE OR REPLACE FUNCTION public.accept_safepay(p_safepay_id UUID)
RETURNS VOID AS $$
DECLARE
  v_amount INTEGER;
  v_buyer_id UUID;
  v_status TEXT;
  v_buyer_balance INTEGER;
BEGIN
  SELECT amount, buyer_id, status INTO v_amount, v_buyer_id, v_status
  FROM public.safepay_transactions 
  WHERE id = p_safepay_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SafePay transaction not found';
  END IF;

  IF v_status != 'proposed' THEN
    RAISE EXCEPTION 'SafePay is not in proposed state';
  END IF;

  SELECT balance INTO v_buyer_balance
  FROM public.user_wallets 
  WHERE user_id = v_buyer_id FOR UPDATE;

  IF v_buyer_balance IS NULL OR v_buyer_balance < v_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  UPDATE public.user_wallets 
  SET balance = balance - v_amount,
      escrow_hold = escrow_hold + v_amount,
      updated_at = NOW()
  WHERE user_id = v_buyer_id;

  INSERT INTO public.wallet_transactions (user_id, safepay_id, transaction_type, amount, balance_type, description)
  VALUES (v_buyer_id, p_safepay_id, 'escrow_hold', -v_amount, 'withdrawable', 'SafePay escrow hold');

  UPDATE public.safepay_transactions 
  SET status = 'active', updated_at = NOW()
  WHERE id = p_safepay_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.release_safepay(p_safepay_id UUID)
RETURNS VOID AS $$
DECLARE
  v_amount INTEGER;
  v_buyer_id UUID;
  v_seller_id UUID;
  v_status TEXT;
BEGIN
  SELECT amount, buyer_id, seller_id, status INTO v_amount, v_buyer_id, v_seller_id, v_status
  FROM public.safepay_transactions 
  WHERE id = p_safepay_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SafePay transaction not found';
  END IF;

  IF v_status != 'complete' AND v_status != 'active' THEN
    RAISE EXCEPTION 'SafePay cannot be released in current state';
  END IF;

  UPDATE public.user_wallets 
  SET escrow_hold = escrow_hold - v_amount,
      updated_at = NOW()
  WHERE user_id = v_buyer_id;

  INSERT INTO public.user_wallets (user_id, balance, updated_at)
  VALUES (v_seller_id, v_amount, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET balance = user_wallets.balance + v_amount, updated_at = NOW();

  INSERT INTO public.wallet_transactions (user_id, safepay_id, transaction_type, amount, balance_type, description)
  VALUES (v_seller_id, p_safepay_id, 'payment_received', v_amount, 'withdrawable', 'SafePay payment received');

  UPDATE public.safepay_transactions 
  SET status = 'complete', updated_at = NOW()
  WHERE id = p_safepay_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.cancel_safepay(p_safepay_id UUID)
RETURNS VOID AS $$
DECLARE
  v_amount INTEGER;
  v_buyer_id UUID;
  v_status TEXT;
BEGIN
  SELECT amount, buyer_id, status INTO v_amount, v_buyer_id, v_status
  FROM public.safepay_transactions 
  WHERE id = p_safepay_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SafePay transaction not found';
  END IF;

  IF v_status = 'active' THEN
    UPDATE public.user_wallets 
    SET balance = balance + v_amount,
        escrow_hold = escrow_hold - v_amount,
        updated_at = NOW()
    WHERE user_id = v_buyer_id;

    INSERT INTO public.wallet_transactions (user_id, safepay_id, transaction_type, amount, balance_type, description)
    VALUES (v_buyer_id, p_safepay_id, 'refund', v_amount, 'withdrawable', 'SafePay refund');
  END IF;

  UPDATE public.safepay_transactions 
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_safepay_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;