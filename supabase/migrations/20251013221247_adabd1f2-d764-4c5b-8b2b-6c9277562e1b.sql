
-- Update cancel_safepay to match specification
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

-- Also fix the old transaction_type column reference in wallet_transactions inserts
-- (should use 'kind' column instead)
