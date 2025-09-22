-- First clean up existing data to match constraints
UPDATE public.transactions 
SET status = CASE 
    WHEN status = 'completed' THEN 'success'
    WHEN status IS NULL THEN 'pending'
    ELSE 'pending'
END
WHERE status NOT IN ('pending','success','failed','expired');

UPDATE public.transactions 
SET type = CASE 
    WHEN type = 'deposit' THEN 'buy'
    WHEN type IS NULL THEN 'buy'
    ELSE 'buy'
END
WHERE type NOT IN ('buy','withdraw','manual_fund','manual_withdraw','escrow');

-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default system settings
INSERT INTO public.system_settings (key, value) VALUES
('paystack_spread_rate', '0.03'),
('bank_transfer_spread_rate', '0.005'),
('withdrawal_fee_rate', '0.05')
ON CONFLICT (key) DO NOTHING;

-- Update wallets table to match the new schema
ALTER TABLE public.wallets 
ADD COLUMN IF NOT EXISTS pending_balance DECIMAL(12,2) DEFAULT 0;

-- Update transactions table to match the new schema
DO $$ 
BEGIN
    -- Add columns that might be missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'amount_nc') THEN
        ALTER TABLE public.transactions ADD COLUMN amount_nc DECIMAL(12,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'amount_ngn') THEN
        ALTER TABLE public.transactions ADD COLUMN amount_ngn DECIMAL(12,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'fee_nc') THEN
        ALTER TABLE public.transactions ADD COLUMN fee_nc DECIMAL(12,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'payment_method') THEN
        ALTER TABLE public.transactions ADD COLUMN payment_method VARCHAR(20);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'reference') THEN
        ALTER TABLE public.transactions ADD COLUMN reference VARCHAR(255);
    END IF;
END $$;

-- Create unique constraint on reference if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'transactions_reference_key'
    ) THEN
        ALTER TABLE public.transactions ADD CONSTRAINT transactions_reference_key UNIQUE (reference);
    END IF;
END $$;

-- Add constraints for transaction status and type
DO $$
BEGIN
    -- Only add constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'transactions_status_check' 
        AND table_name = 'transactions'
    ) THEN
        ALTER TABLE public.transactions 
        ADD CONSTRAINT transactions_status_check 
        CHECK (status IN ('pending','success','failed','expired'));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'transactions_type_check' 
        AND table_name = 'transactions'
    ) THEN
        ALTER TABLE public.transactions 
        ADD CONSTRAINT transactions_type_check 
        CHECK (type IN ('buy','withdraw','manual_fund','manual_withdraw','escrow'));
    END IF;
END $$;

-- Create function to get system setting
CREATE OR REPLACE FUNCTION get_system_setting(setting_key VARCHAR)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
    SELECT value FROM public.system_settings WHERE key = setting_key;
$$;

-- Create function to calculate NC amount with spread
CREATE OR REPLACE FUNCTION calculate_nc_amount(amount_ngn DECIMAL, payment_method VARCHAR DEFAULT 'paystack')
RETURNS DECIMAL
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    spread_rate DECIMAL;
    nc_amount DECIMAL;
BEGIN
    -- Get spread rate based on payment method
    IF payment_method = 'bank_transfer' THEN
        spread_rate := COALESCE(get_system_setting('bank_transfer_spread_rate')::DECIMAL, 0.005);
    ELSE
        spread_rate := COALESCE(get_system_setting('paystack_spread_rate')::DECIMAL, 0.03);
    END IF;
    
    -- Calculate NC amount after spread
    nc_amount := amount_ngn * (1 - spread_rate);
    
    RETURN ROUND(nc_amount, 2);
END;
$$;

-- Enable RLS on system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- System settings policies
CREATE POLICY "Admin can manage system settings" ON public.system_settings
    FOR ALL USING (is_admin_user());

CREATE POLICY "Everyone can read system settings" ON public.system_settings 
    FOR SELECT USING (true);