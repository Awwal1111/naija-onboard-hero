-- Update wallet_transactions table to match NaijaCoin spec
ALTER TABLE public.wallet_transactions 
ADD COLUMN IF NOT EXISTS amount_nc DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS amount_ngn DECIMAL(12,2),  
ADD COLUMN IF NOT EXISTS fee_nc DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20),
ADD COLUMN IF NOT EXISTS metadata JSONB,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add missing columns to transactions table if they don't exist
DO $$ 
BEGIN
    -- Check if type column exists in wallet_transactions (rename transaction_type to type)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_transactions' AND column_name = 'transaction_type') AND
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_transactions' AND column_name = 'type') THEN
        ALTER TABLE public.wallet_transactions RENAME COLUMN transaction_type TO type;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_transactions' AND column_name = 'type') THEN
        ALTER TABLE public.wallet_transactions ADD COLUMN type VARCHAR(20) DEFAULT 'buy';
    END IF;

    -- Update type values
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_transactions' AND column_name = 'type') THEN
        UPDATE public.wallet_transactions SET type = 'buy' WHERE type = 'deposit' OR type IS NULL;
    END IF;
END $$;

-- Add constraints to wallet_transactions
ALTER TABLE public.wallet_transactions 
DROP CONSTRAINT IF EXISTS wallet_transactions_type_check,
ADD CONSTRAINT wallet_transactions_type_check CHECK (type IN ('buy', 'withdraw', 'manual_fund', 'manual_withdraw', 'escrow', 'game_win', 'game_loss'));

ALTER TABLE public.wallet_transactions 
DROP CONSTRAINT IF EXISTS wallet_transactions_status_check,
ADD CONSTRAINT wallet_transactions_status_check CHECK (status IN ('pending', 'success', 'failed', 'expired'));

-- Create unique constraint on reference_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'wallet_transactions_reference_id_key'
    ) THEN
        ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_reference_id_key UNIQUE (reference_id);
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON public.wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON public.wallet_transactions(type);

-- Ensure system_settings has all required settings
INSERT INTO public.system_settings (key, value) VALUES
('paystack_spread_rate', '0.03'),
('bank_transfer_spread_rate', '0.005'), 
('withdrawal_fee_rate', '0.05'),
('naijacoin_rate', '1.0')
ON CONFLICT (key) DO NOTHING;

-- Update audit_logs table structure
ALTER TABLE public.audit_logs 
ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS action VARCHAR(50),
ADD COLUMN IF NOT EXISTS details JSONB;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_wallet_transaction_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for wallet_transactions timestamp updates
DROP TRIGGER IF EXISTS update_wallet_transactions_timestamp ON public.wallet_transactions;
CREATE TRIGGER update_wallet_transactions_timestamp
    BEFORE UPDATE ON public.wallet_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_wallet_transaction_timestamp();