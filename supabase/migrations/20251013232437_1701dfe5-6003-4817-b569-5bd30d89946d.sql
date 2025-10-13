-- Set up admin user and test balance for cat701450@gmail.com
-- First, ensure the user exists in profiles, then assign admin role and balance

-- Update or insert profile with test balance
INSERT INTO public.profiles (user_id, wallet_balance, balance_withdrawable, balance_non_withdrawable)
SELECT 
  au.id,
  100000.00,  -- Test balance
  100000.00,  -- All withdrawable
  0.00
FROM auth.users au
WHERE LOWER(au.email) = 'cat701450@gmail.com'
ON CONFLICT (user_id) 
DO UPDATE SET
  wallet_balance = 100000.00,
  balance_withdrawable = 100000.00,
  balance_non_withdrawable = 0.00;

-- Assign admin role
INSERT INTO public.user_roles (user_id, role)
SELECT 
  au.id,
  'admin'::user_role
FROM auth.users au
WHERE LOWER(au.email) = 'cat701450@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Initialize wallet
INSERT INTO public.user_wallets (user_id, balance, escrow_hold)
SELECT 
  au.id,
  0,
  0
FROM auth.users au
WHERE LOWER(au.email) = 'cat701450@gmail.com'
ON CONFLICT (user_id) DO NOTHING;