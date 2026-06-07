DO $$
DECLARE
  v_tx_id uuid := 'e66f103c-c160-4b93-9ef2-96f73376bb8c';
  v_user_id uuid := '783c22af-94e5-4082-b1e2-157a66e0f67f';
  v_code text := '312d47bf-7600-4276-8f4f-222e8d8f66d2';
  v_amount numeric := 4000;
  v_current_balance numeric;
  v_new_balance numeric;
  v_status text;
BEGIN
  SELECT status INTO v_status FROM public.pretium_transactions WHERE id = v_tx_id;
  IF v_status = 'refunded' THEN RAISE NOTICE 'Already refunded'; RETURN; END IF;

  SELECT COALESCE(wallet_balance, 0) INTO v_current_balance FROM public.profiles WHERE user_id = v_user_id;
  v_new_balance := v_current_balance + v_amount;

  UPDATE public.profiles SET wallet_balance = v_new_balance, updated_at = now() WHERE user_id = v_user_id;

  UPDATE public.pretium_transactions
  SET status = 'refunded',
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'refund', jsonb_build_object(
          'at', now(),
          'reason', 'Pretium offramp stuck in pending since 2026-06-01; funds never delivered. Manual admin reversal.',
          'by', 'system_migration',
          'amount', v_amount
        )
      )
  WHERE id = v_tx_id;

  INSERT INTO public.wallet_transactions (user_id, kind, amount, currency, reference, status, metadata)
  VALUES (v_user_id, 'credit', v_amount, 'NC', v_code, 'completed',
          jsonb_build_object('category','refund','description','Pretium refund for ' || v_code || ' (admin reversal)'));

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, metadata)
  VALUES (v_user_id, 'pretium_admin_refund', 'pretium_transactions', v_tx_id,
          jsonb_build_object('amount', v_amount, 'target_user', v_user_id, 'reason', 'stuck offramp reversal'));

  INSERT INTO public.notifications (user_id, type, title, message, metadata)
  VALUES (v_user_id, 'wallet_credit',
          'Refund credited to your NC wallet',
          'We refunded NC ' || v_amount::text || ' for your stuck offramp transaction (' || v_code || '). New balance: NC ' || v_new_balance::text || '.',
          jsonb_build_object('transaction_code', v_code, 'amount', v_amount));
END $$;