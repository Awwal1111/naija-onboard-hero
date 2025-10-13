
-- Drop unique constraint on wallet_transactions reference column
-- The reference field is descriptive and doesn't need to be unique
ALTER TABLE public.wallet_transactions
DROP CONSTRAINT IF EXISTS wallet_transactions_reference_key;
