
DO $$
DECLARE
  r RECORD;
  v_reverse numeric;
BEGIN
  FOR r IN
    SELECT wt.id, wt.user_id, wt.amount, p.balance_withdrawable
    FROM wallet_transactions wt
    JOIN profiles p ON p.user_id = wt.user_id
    WHERE wt.kind = 'gig_order_refund' AND wt.status = 'completed'
  LOOP
    v_reverse := LEAST(r.amount, GREATEST(r.balance_withdrawable, 0));
    IF v_reverse > 0 THEN
      UPDATE profiles
      SET balance_withdrawable = GREATEST(balance_withdrawable - v_reverse, 0),
          wallet_balance = GREATEST(wallet_balance - v_reverse, 0),
          updated_at = now()
      WHERE user_id = r.user_id;
    END IF;

    INSERT INTO wallet_transactions(user_id, kind, amount, status, reference, metadata)
    VALUES (r.user_id, 'gig_order_refund_reversal', -v_reverse, 'completed',
      'Reversal of erroneous gig refund (system cleanup)',
      jsonb_build_object('original_tx', r.id, 'requested', r.amount, 'reversed', v_reverse));

    INSERT INTO notifications(user_id, title, message, type, metadata)
    VALUES (r.user_id, 'Order system reset',
      'We detected an issue with our gig order system that allowed refunds on orders without real deposits. We have reversed affected refunds. If you genuinely deposited and were refunded incorrectly, please contact support.',
      'system', jsonb_build_object('reversed', v_reverse));
  END LOOP;

  FOR r IN
    SELECT id, buyer_id, seller_id, title FROM gig_orders
    WHERE status IN ('pending','accepted','in_progress','delivered','revision_requested')
  LOOP
    UPDATE gig_orders
    SET status='cancelled', cancelled_at=now(),
        cancellation_reason='System cleanup: order reset due to refund bug', updated_at=now()
    WHERE id=r.id;

    INSERT INTO notifications(user_id, title, message, type, metadata) VALUES
      (r.buyer_id, 'Order cancelled (system reset)',
       'Your order "'||r.title||'" was cancelled as part of a system cleanup. No refund was issued because no funds were actually held. If you genuinely deposited and were charged, please contact support.',
       'system', jsonb_build_object('order_id', r.id, 'role','buyer')),
      (r.seller_id, 'Order cancelled (system reset)',
       'The order "'||r.title||'" was cancelled as part of a system cleanup. Please ask the buyer to re-place the order if needed.',
       'system', jsonb_build_object('order_id', r.id, 'role','seller'));
  END LOOP;
END $$;
