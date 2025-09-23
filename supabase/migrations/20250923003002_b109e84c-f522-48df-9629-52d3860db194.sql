-- First, remove existing constraints and then update data
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_transaction_type_check;

-- Now update the data
UPDATE public.wallet_transactions SET type = 'buy' WHERE type = 'deposit' OR type IS NULL;

-- Add the new constraint
ALTER TABLE public.wallet_transactions 
ADD CONSTRAINT wallet_transactions_type_check CHECK (type IN ('buy', 'withdraw', 'manual_fund', 'manual_withdraw', 'escrow', 'game_win', 'game_loss'));

-- Complete the rest of the schema updates
ALTER TABLE public.wallet_transactions 
ADD COLUMN IF NOT EXISTS amount_nc DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS amount_ngn DECIMAL(12,2),  
ADD COLUMN IF NOT EXISTS fee_nc DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20),
ADD COLUMN IF NOT EXISTS metadata JSONB,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add status constraint
ALTER TABLE public.wallet_transactions 
DROP CONSTRAINT IF EXISTS wallet_transactions_status_check,
ADD CONSTRAINT wallet_transactions_status_check CHECK (status IN ('pending', 'success', 'failed', 'expired'));

-- Add unique constraint on reference_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'wallet_transactions_reference_id_key'
    ) THEN
        ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_reference_id_key UNIQUE (reference_id);
    END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON public.wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON public.wallet_transactions(type);