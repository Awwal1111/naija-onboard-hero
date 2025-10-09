-- Migrate existing wallet balances to withdrawable balance
-- This is needed because we just implemented balance_withdrawable and balance_non_withdrawable
-- All existing balances should be treated as withdrawable (earned before the new system)

UPDATE public.profiles
SET 
  balance_withdrawable = wallet_balance,
  balance_non_withdrawable = 0
WHERE 
  wallet_balance > 0 
  AND balance_withdrawable = 0 
  AND balance_non_withdrawable = 0;