
-- Create user_wallets table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_wallets (
  user_id UUID PRIMARY KEY REFERENCES profiles(user_id) ON DELETE CASCADE,
  balance NUMERIC NOT NULL DEFAULT 0,
  escrow_hold NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on user_wallets
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_wallets
DROP POLICY IF EXISTS "Users can view their own wallet" ON public.user_wallets;
CREATE POLICY "Users can view their own wallet" 
  ON public.user_wallets FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own wallet" ON public.user_wallets;
CREATE POLICY "Users can insert their own wallet" 
  ON public.user_wallets FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can update wallets" ON public.user_wallets;
CREATE POLICY "System can update wallets" 
  ON public.user_wallets FOR UPDATE 
  USING (true);

-- RLS policies for safepay_transactions
DROP POLICY IF EXISTS "Users can view their safepay transactions" ON public.safepay_transactions;
CREATE POLICY "Users can view their safepay transactions" 
  ON public.safepay_transactions FOR SELECT 
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "Users can create safepay transactions" ON public.safepay_transactions;
CREATE POLICY "Users can create safepay transactions" 
  ON public.safepay_transactions FOR INSERT 
  WITH CHECK (auth.uid() = buyer_id);

-- Function: complete_safepay_work
CREATE OR REPLACE FUNCTION public.complete_safepay_work(p_safepay_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_id uuid;
  v_status text;
BEGIN
  -- Get transaction details
  SELECT seller_id, status INTO v_seller_id, v_status
  FROM public.safepay_transactions
  WHERE id = p_safepay_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SafePay transaction not found';
  END IF;

  IF v_status != 'active' THEN
    RAISE EXCEPTION 'SafePay must be in active state';
  END IF;

  IF auth.uid() != v_seller_id THEN
    RAISE EXCEPTION 'Only the seller can mark work as complete';
  END IF;

  -- Update to complete status with auto-release timer (5 days)
  UPDATE public.safepay_transactions
  SET 
    status = 'complete',
    completed_at = NOW(),
    auto_release_at = NOW() + INTERVAL '5 days',
    updated_at = NOW()
  WHERE id = p_safepay_id;
END;
$$;

-- Function: request_cancel_safepay
CREATE OR REPLACE FUNCTION public.request_cancel_safepay(p_safepay_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id uuid;
  v_seller_id uuid;
  v_status text;
BEGIN
  -- Get transaction details
  SELECT buyer_id, seller_id, status 
  INTO v_buyer_id, v_seller_id, v_status
  FROM public.safepay_transactions
  WHERE id = p_safepay_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SafePay transaction not found';
  END IF;

  IF v_status != 'active' THEN
    RAISE EXCEPTION 'Can only request cancel for active SafePay';
  END IF;

  IF auth.uid() != v_buyer_id AND auth.uid() != v_seller_id THEN
    RAISE EXCEPTION 'Only participants can request cancellation';
  END IF;

  -- Set cancel requester
  UPDATE public.safepay_transactions
  SET 
    cancel_requester_id = auth.uid(),
    updated_at = NOW()
  WHERE id = p_safepay_id;
END;
$$;

-- Function: approve_cancel_safepay
CREATE OR REPLACE FUNCTION public.approve_cancel_safepay(p_safepay_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id uuid;
  v_seller_id uuid;
  v_amount integer;
  v_cancel_requester_id uuid;
  v_status text;
BEGIN
  -- Get transaction details with row lock
  SELECT buyer_id, seller_id, amount, cancel_requester_id, status
  INTO v_buyer_id, v_seller_id, v_amount, v_cancel_requester_id, v_status
  FROM public.safepay_transactions
  WHERE id = p_safepay_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SafePay transaction not found';
  END IF;

  IF v_status != 'active' THEN
    RAISE EXCEPTION 'SafePay must be in active state';
  END IF;

  IF v_cancel_requester_id IS NULL THEN
    RAISE EXCEPTION 'No cancellation request exists';
  END IF;

  IF auth.uid() = v_cancel_requester_id THEN
    RAISE EXCEPTION 'Cannot approve your own cancellation request';
  END IF;

  IF auth.uid() != v_buyer_id AND auth.uid() != v_seller_id THEN
    RAISE EXCEPTION 'Only the other participant can approve';
  END IF;

  -- Release escrow hold from buyer
  UPDATE public.user_wallets
  SET 
    escrow_hold = GREATEST(0, escrow_hold - v_amount),
    updated_at = NOW()
  WHERE user_id = v_buyer_id;

  -- Refund to buyer's withdrawable balance
  UPDATE public.profiles
  SET 
    wallet_balance = wallet_balance + v_amount,
    balance_withdrawable = balance_withdrawable + v_amount,
    updated_at = NOW()
  WHERE user_id = v_buyer_id;

  -- Log refund transaction
  INSERT INTO public.wallet_transactions (user_id, safepay_id, kind, amount, status, reference)
  VALUES (
    v_buyer_id, 
    p_safepay_id, 
    'refund', 
    v_amount, 
    'completed', 
    'SafePay cancelled by mutual agreement'
  );

  -- Update SafePay status
  UPDATE public.safepay_transactions
  SET 
    status = 'cancelled',
    cancel_approved_by = auth.uid(),
    cancelled_at = NOW(),
    updated_at = NOW()
  WHERE id = p_safepay_id;
END;
$$;

-- Function: file_dispute_safepay
CREATE OR REPLACE FUNCTION public.file_dispute_safepay(p_safepay_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id uuid;
  v_seller_id uuid;
  v_status text;
  v_chat_id uuid;
  v_message record;
BEGIN
  -- Get transaction details
  SELECT buyer_id, seller_id, status
  INTO v_buyer_id, v_seller_id, v_status
  FROM public.safepay_transactions
  WHERE id = p_safepay_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SafePay transaction not found';
  END IF;

  IF v_status != 'complete' THEN
    RAISE EXCEPTION 'Can only dispute completed SafePay';
  END IF;

  IF auth.uid() != v_buyer_id THEN
    RAISE EXCEPTION 'Only the buyer can file a dispute';
  END IF;

  -- Find the chat between buyer and seller
  SELECT id INTO v_chat_id
  FROM public.chats
  WHERE (user1_id = v_buyer_id AND user2_id = v_seller_id)
     OR (user1_id = v_seller_id AND user2_id = v_buyer_id)
  LIMIT 1;

  IF v_chat_id IS NOT NULL THEN
    -- Snapshot all messages from this chat
    FOR v_message IN 
      SELECT sender_id, content, created_at
      FROM public.messages
      WHERE chat_id = v_chat_id
      ORDER BY created_at ASC
    LOOP
      INSERT INTO public.disputed_chat_snapshots (
        safepay_id,
        sender_id,
        message_text,
        created_at,
        snapshot_created_at
      ) VALUES (
        p_safepay_id,
        v_message.sender_id,
        v_message.content,
        v_message.created_at,
        NOW()
      );
    END LOOP;
  END IF;

  -- Update SafePay to disputed status
  UPDATE public.safepay_transactions
  SET 
    status = 'disputed',
    dispute_reason = p_reason,
    disputed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_safepay_id;
END;
$$;

-- Function: auto_release_safepay (for cron job)
CREATE OR REPLACE FUNCTION public.auto_release_safepay()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction record;
BEGIN
  -- Find all complete transactions past their auto-release time
  FOR v_transaction IN
    SELECT id, seller_id, amount, buyer_id
    FROM public.safepay_transactions
    WHERE status = 'complete'
    AND auto_release_at <= NOW()
  LOOP
    -- Release escrow hold
    UPDATE public.user_wallets
    SET 
      escrow_hold = GREATEST(0, escrow_hold - v_transaction.amount),
      updated_at = NOW()
    WHERE user_id = v_transaction.buyer_id;

    -- Credit seller
    UPDATE public.profiles
    SET 
      wallet_balance = wallet_balance + v_transaction.amount,
      balance_withdrawable = balance_withdrawable + v_transaction.amount,
      updated_at = NOW()
    WHERE user_id = v_transaction.seller_id;

    -- Log transaction
    INSERT INTO public.wallet_transactions (
      user_id, safepay_id, kind, amount, status, reference
    ) VALUES (
      v_transaction.seller_id,
      v_transaction.id,
      'payment_received',
      v_transaction.amount,
      'completed',
      'SafePay auto-released'
    );

    -- Update SafePay
    UPDATE public.safepay_transactions
    SET 
      status = 'released',
      released_at = NOW(),
      updated_at = NOW()
    WHERE id = v_transaction.id;
  END LOOP;
END;
$$;

-- Update cancel_safepay function
CREATE OR REPLACE FUNCTION public.cancel_safepay(p_safepay_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount integer;
  v_buyer_id uuid;
  v_seller_id uuid;
  v_status text;
BEGIN
  -- Get transaction details with row lock
  SELECT amount, buyer_id, seller_id, status 
  INTO v_amount, v_buyer_id, v_seller_id, v_status
  FROM public.safepay_transactions 
  WHERE id = p_safepay_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SafePay transaction not found';
  END IF;

  -- PROPOSED STATUS: Only buyer can cancel (Cancel Offer)
  IF v_status = 'proposed' THEN
    IF auth.uid() != v_buyer_id THEN
      RAISE EXCEPTION 'Only the buyer can cancel a proposed SafePay';
    END IF;

    -- No money movement needed - funds were never locked
    UPDATE public.safepay_transactions 
    SET 
      status = 'cancelled',
      cancelled_at = NOW(),
      updated_at = NOW()
    WHERE id = p_safepay_id;

  -- ACTIVE STATUS: Cannot cancel directly - must use mutual agreement flow
  ELSIF v_status = 'active' THEN
    RAISE EXCEPTION 'Active SafePay requires mutual agreement to cancel. Use request_cancel_safepay instead.';

  -- OTHER STATUSES: Cannot cancel
  ELSE
    RAISE EXCEPTION 'SafePay cannot be cancelled in % status', v_status;
  END IF;
END;
$$;
