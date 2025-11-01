-- Add USDT to crypto_transactions allowed currencies
ALTER TABLE public.crypto_transactions 
DROP CONSTRAINT IF EXISTS crypto_transactions_crypto_currency_check;

ALTER TABLE public.crypto_transactions 
ADD CONSTRAINT crypto_transactions_crypto_currency_check 
CHECK (crypto_currency = ANY (ARRAY['cUSD'::text, 'CELO'::text, 'USDT'::text]));