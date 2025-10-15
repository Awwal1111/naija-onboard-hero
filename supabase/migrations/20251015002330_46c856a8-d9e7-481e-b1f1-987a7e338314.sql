-- Refund the user's 1000 NC that was incorrectly deducted
UPDATE profiles 
SET wallet_balance = wallet_balance + 1000
WHERE user_id = '783c22af-94e5-4082-b1e2-157a66e0f67f';

-- Log the refund transaction
INSERT INTO wallet_transactions (user_id, amount, kind, status, reference)
VALUES (
  '783c22af-94e5-4082-b1e2-157a66e0f67f',
  1000,
  'refund',
  'completed',
  'Refund: Social media task creation failed (bug fix)'
);