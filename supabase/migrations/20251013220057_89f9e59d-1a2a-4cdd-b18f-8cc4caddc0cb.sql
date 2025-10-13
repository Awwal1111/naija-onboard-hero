-- Fix wallet_transactions foreign key to point to profiles
ALTER TABLE public.wallet_transactions
DROP CONSTRAINT wallet_transactions_user_fk;

ALTER TABLE public.wallet_transactions
ADD CONSTRAINT wallet_transactions_user_fk 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;