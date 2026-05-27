
-- ============ 1. Chat Intro Requests ============
CREATE TABLE IF NOT EXISTS public.chat_intro_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 500),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','cancelled')),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (sender_id <> recipient_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS chat_intro_requests_unique_pending
  ON public.chat_intro_requests(sender_id, recipient_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS chat_intro_requests_recipient_idx
  ON public.chat_intro_requests(recipient_id, status, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.chat_intro_requests TO authenticated;
GRANT ALL ON public.chat_intro_requests TO service_role;

ALTER TABLE public.chat_intro_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own intros"
  ON public.chat_intro_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Sender creates own intro"
  ON public.chat_intro_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Sender or recipient can update intro"
  ON public.chat_intro_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE TRIGGER update_chat_intro_requests_updated_at
  BEFORE UPDATE ON public.chat_intro_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Accept intro: create chat + insert first message
CREATE OR REPLACE FUNCTION public.accept_chat_intro(p_intro_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_intro RECORD;
  v_chat_id UUID;
  v_u1 UUID;
  v_u2 UUID;
BEGIN
  SELECT * INTO v_intro
  FROM public.chat_intro_requests
  WHERE id = p_intro_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Intro not found';
  END IF;

  IF v_intro.recipient_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the recipient can accept';
  END IF;

  IF v_intro.status <> 'pending' THEN
    RAISE EXCEPTION 'Intro already %', v_intro.status;
  END IF;

  -- Normalize ordering for chats unique constraint
  IF v_intro.sender_id < v_intro.recipient_id THEN
    v_u1 := v_intro.sender_id; v_u2 := v_intro.recipient_id;
  ELSE
    v_u1 := v_intro.recipient_id; v_u2 := v_intro.sender_id;
  END IF;

  SELECT id INTO v_chat_id FROM public.chats
  WHERE user1_id = v_u1 AND user2_id = v_u2;

  IF v_chat_id IS NULL THEN
    INSERT INTO public.chats (user1_id, user2_id)
    VALUES (v_u1, v_u2)
    RETURNING id INTO v_chat_id;
  END IF;

  -- Insert the intro as the first message (from sender)
  INSERT INTO public.messages (chat_id, sender_id, content)
  VALUES (v_chat_id, v_intro.sender_id, v_intro.message);

  UPDATE public.chat_intro_requests
  SET status = 'accepted', responded_at = NOW(), updated_at = NOW()
  WHERE id = p_intro_id;

  -- Notify sender
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_intro.sender_id,
    'intro_accepted',
    'Introduction accepted',
    'Your introduction was accepted. You can now chat.',
    jsonb_build_object('chat_id', v_chat_id, 'other_user_id', v_intro.recipient_id)
  );

  RETURN v_chat_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decline_chat_intro(p_intro_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_intro RECORD;
BEGIN
  SELECT * INTO v_intro FROM public.chat_intro_requests
  WHERE id = p_intro_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Intro not found'; END IF;
  IF v_intro.recipient_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the recipient can decline';
  END IF;
  IF v_intro.status <> 'pending' THEN
    RAISE EXCEPTION 'Intro already %', v_intro.status;
  END IF;

  UPDATE public.chat_intro_requests
  SET status = 'declined', responded_at = NOW(), updated_at = NOW()
  WHERE id = p_intro_id;
END;
$$;

-- ============ 2. SafePay Disputes ============
ALTER TABLE public.transaction_disputes
  ADD COLUMN IF NOT EXISTS dispute_type TEXT NOT NULL DEFAULT 'generic',
  ADD COLUMN IF NOT EXISTS safepay_id UUID,
  ADD COLUMN IF NOT EXISTS counterparty_id UUID;

CREATE INDEX IF NOT EXISTS transaction_disputes_safepay_idx
  ON public.transaction_disputes(safepay_id) WHERE safepay_id IS NOT NULL;

-- Allow counterparty to view safepay disputes raised against them
DROP POLICY IF EXISTS "Counterparty can view safepay disputes" ON public.transaction_disputes;
CREATE POLICY "Counterparty can view safepay disputes"
  ON public.transaction_disputes FOR SELECT
  TO authenticated
  USING (counterparty_id = auth.uid());

CREATE OR REPLACE FUNCTION public.raise_safepay_dispute(
  p_safepay_id uuid,
  p_reason text,
  p_details text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tx RECORD;
  v_dispute_id UUID;
  v_counterparty UUID;
BEGIN
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Reason is required';
  END IF;

  SELECT * INTO v_tx FROM public.safepay_transactions
  WHERE id = p_safepay_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'SafePay not found'; END IF;

  IF auth.uid() <> v_tx.buyer_id AND auth.uid() <> v_tx.seller_id THEN
    RAISE EXCEPTION 'Not a party to this SafePay';
  END IF;

  IF v_tx.status NOT IN ('active','complete') THEN
    RAISE EXCEPTION 'Cannot dispute SafePay in % status', v_tx.status;
  END IF;

  v_counterparty := CASE WHEN auth.uid() = v_tx.buyer_id THEN v_tx.seller_id ELSE v_tx.buyer_id END;

  UPDATE public.safepay_transactions
  SET status = 'disputed', dispute_reason = p_reason, updated_at = NOW()
  WHERE id = p_safepay_id;

  INSERT INTO public.transaction_disputes (
    user_id, transaction_id, dispute_reason, dispute_details,
    dispute_type, safepay_id, counterparty_id, status
  )
  VALUES (
    auth.uid(), p_safepay_id, p_reason, p_details,
    'safepay', p_safepay_id, v_counterparty, 'pending'
  )
  RETURNING id INTO v_dispute_id;

  -- Notify counterparty
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_counterparty,
    'safepay_disputed',
    'SafePay dispute raised',
    'The other party raised a dispute on a SafePay transaction. Funds are locked pending admin review.',
    jsonb_build_object('safepay_id', p_safepay_id, 'dispute_id', v_dispute_id)
  );

  RETURN v_dispute_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_resolve_safepay_dispute(
  p_dispute_id uuid,
  p_ruling text,
  p_response text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_dispute RECORD;
  v_tx RECORD;
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  IF p_ruling NOT IN ('release_seller','refund_buyer') THEN
    RAISE EXCEPTION 'Invalid ruling';
  END IF;

  SELECT * INTO v_dispute FROM public.transaction_disputes
  WHERE id = p_dispute_id FOR UPDATE;
  IF NOT FOUND OR v_dispute.dispute_type <> 'safepay' OR v_dispute.safepay_id IS NULL THEN
    RAISE EXCEPTION 'SafePay dispute not found';
  END IF;
  IF v_dispute.status NOT IN ('pending','investigating') THEN
    RAISE EXCEPTION 'Dispute already %', v_dispute.status;
  END IF;

  SELECT * INTO v_tx FROM public.safepay_transactions
  WHERE id = v_dispute.safepay_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SafePay not found'; END IF;

  IF v_tx.status NOT IN ('disputed','active','complete') THEN
    RAISE EXCEPTION 'SafePay no longer disputable (status %)', v_tx.status;
  END IF;

  -- Always release the escrow hold on the buyer side
  UPDATE public.user_wallets
  SET escrow_hold = GREATEST(0, escrow_hold - v_tx.amount), updated_at = NOW()
  WHERE user_id = v_tx.buyer_id;

  IF p_ruling = 'release_seller' THEN
    UPDATE public.profiles
    SET wallet_balance = wallet_balance + v_tx.amount,
        balance_withdrawable = balance_withdrawable + v_tx.amount,
        updated_at = NOW()
    WHERE user_id = v_tx.seller_id;

    INSERT INTO public.wallet_transactions (user_id, safepay_id, kind, amount, status, reference)
    VALUES (v_tx.seller_id, v_tx.id, 'payment_received', v_tx.amount, 'completed',
            'SafePay dispute resolved - released to seller');

    UPDATE public.safepay_transactions
    SET status = 'released', released_at = NOW(),
        admin_ruling = 'release_seller', updated_at = NOW()
    WHERE id = v_tx.id;
  ELSE
    UPDATE public.profiles
    SET wallet_balance = wallet_balance + v_tx.amount,
        balance_withdrawable = balance_withdrawable + v_tx.amount,
        updated_at = NOW()
    WHERE user_id = v_tx.buyer_id;

    INSERT INTO public.wallet_transactions (user_id, safepay_id, kind, amount, status, reference)
    VALUES (v_tx.buyer_id, v_tx.id, 'refund', v_tx.amount, 'completed',
            'SafePay dispute resolved - refunded to buyer');

    UPDATE public.safepay_transactions
    SET status = 'cancelled', cancelled_at = NOW(),
        admin_ruling = 'refund_buyer', updated_at = NOW()
    WHERE id = v_tx.id;
  END IF;

  UPDATE public.transaction_disputes
  SET status = 'resolved',
      admin_response = COALESCE(p_response, admin_response),
      resolved_at = NOW(),
      resolved_by = auth.uid(),
      updated_at = NOW()
  WHERE id = p_dispute_id;

  -- Notify both parties
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES
    (v_tx.buyer_id, 'safepay_resolved', 'SafePay dispute resolved',
     CASE WHEN p_ruling='release_seller'
          THEN 'Admin ruled in favor of the seller. Funds released.'
          ELSE 'Admin refunded your funds.' END,
     jsonb_build_object('safepay_id', v_tx.id, 'ruling', p_ruling)),
    (v_tx.seller_id, 'safepay_resolved', 'SafePay dispute resolved',
     CASE WHEN p_ruling='release_seller'
          THEN 'Admin released the SafePay funds to you.'
          ELSE 'Admin ruled in favor of the buyer. Funds refunded.' END,
     jsonb_build_object('safepay_id', v_tx.id, 'ruling', p_ruling));
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_chat_intro(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_chat_intro(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.raise_safepay_dispute(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_safepay_dispute(uuid, text, text) TO authenticated;
