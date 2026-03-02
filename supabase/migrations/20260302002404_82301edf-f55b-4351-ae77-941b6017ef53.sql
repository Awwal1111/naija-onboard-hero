-- Add is_internal flag for built-in platform apps
ALTER TABLE public.mini_apps ADD COLUMN IF NOT EXISTS is_internal boolean DEFAULT false;
ALTER TABLE public.mini_apps ADD COLUMN IF NOT EXISTS internal_action text;

-- Insert built-in mini apps (using first user as placeholder developer_id)
INSERT INTO public.mini_apps (developer_id, app_name, app_description, app_url, category, status, is_featured, is_internal, internal_action, rating, install_count, approved_at)
VALUES 
  ('98542b54-cce2-4247-abaa-7f4f510c48f1', 'Buy Airtime', 'Buy airtime & data for any Nigerian network instantly with NC', 'internal://airtime', 'utility', 'approved', true, true, 'airtime', 5.0, 1000, now()),
  ('98542b54-cce2-4247-abaa-7f4f510c48f1', 'Bank Transfer', 'Send money to any Nigerian bank account via Quidax', 'internal://bank-transfer', 'finance', 'approved', true, true, 'bank_transfer', 4.8, 800, now()),
  ('98542b54-cce2-4247-abaa-7f4f510c48f1', 'Crypto Deposit', 'Deposit cUSD, CELO, or USDT to fund your wallet', 'internal://crypto-deposit', 'finance', 'approved', true, true, 'crypto_deposit', 4.9, 900, now())
ON CONFLICT DO NOTHING;