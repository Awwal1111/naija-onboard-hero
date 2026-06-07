
UPDATE public.profiles
SET wallet_balance = wallet_balance - 4000,
    balance_withdrawable = balance_withdrawable - 4000
WHERE user_id = '783c22af-94e5-4082-b1e2-157a66e0f67f';

INSERT INTO public.wallet_transactions (user_id, amount, currency, kind, status, reference, metadata)
VALUES (
  '783c22af-94e5-4082-b1e2-157a66e0f67f',
  -4000,
  'NC',
  'adjustment',
  'completed',
  'pretium-refund-reversal-e66f103c',
  jsonb_build_object(
    'pretium_transaction_id', 'e66f103c-c160-4b93-9ef2-96f73376bb8c',
    'transaction_code', '312d47bf-7600-4276-8f4f-222e8d8f66d2',
    'transaction_hash', '0x48bbfded0fa5cd7863583601fabf18d4312d3132f9fe111807e9ca3080478b11',
    'reason', 'Pretium API returned: This transaction hash has already been processed. Reversing user-side refund.'
  )
);

UPDATE public.pretium_transactions
SET status = 'pending',
    metadata = (metadata - 'refund') || jsonb_build_object(
      'refund_reversed', jsonb_build_object(
        'at', now(),
        'reason', 'Pretium confirmed transaction was already processed on their side; user-side credit reversed'
      )
    )
WHERE id = 'e66f103c-c160-4b93-9ef2-96f73376bb8c';

INSERT INTO public.audit_logs (user_id, action, table_name, record_id, metadata)
VALUES (
  '783c22af-94e5-4082-b1e2-157a66e0f67f',
  'pretium_refund_reversed',
  'pretium_transactions',
  'e66f103c-c160-4b93-9ef2-96f73376bb8c',
  jsonb_build_object('amount', 4000, 'reason', 'Pretium API confirmed transaction already processed')
);

INSERT INTO public.notifications (user_id, type, title, message, metadata)
VALUES (
  '783c22af-94e5-4082-b1e2-157a66e0f67f',
  'wallet',
  'Refund reversed',
  'The 4,000 NC refund for your offramp has been reversed. Pretium confirmed the transaction was processed on their side. Please contact support if your bank account did not receive the funds.',
  jsonb_build_object('pretium_transaction_id', 'e66f103c-c160-4b93-9ef2-96f73376bb8c')
);
