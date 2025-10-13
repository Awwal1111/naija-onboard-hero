
-- Fix safepay_transactions table structure and add missing foreign keys

-- Add missing columns to safepay_transactions
ALTER TABLE public.safepay_transactions
ADD COLUMN IF NOT EXISTS cancel_requester_id uuid,
ADD COLUMN IF NOT EXISTS cancel_approved_by uuid,
ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS dispute_reason text,
ADD COLUMN IF NOT EXISTS admin_ruling text,
ADD COLUMN IF NOT EXISTS auto_release_at timestamp with time zone;

-- Add foreign key constraints to link to profiles table
ALTER TABLE public.safepay_transactions
ADD CONSTRAINT safepay_transactions_buyer_fk 
FOREIGN KEY (buyer_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;

ALTER TABLE public.safepay_transactions
ADD CONSTRAINT safepay_transactions_seller_fk 
FOREIGN KEY (seller_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;

-- Add foreign key for cancel_requester_id
ALTER TABLE public.safepay_transactions
ADD CONSTRAINT safepay_transactions_cancel_requester_fk 
FOREIGN KEY (cancel_requester_id) 
REFERENCES public.profiles(user_id) 
ON DELETE SET NULL;

-- Add foreign key for cancel_approved_by
ALTER TABLE public.safepay_transactions
ADD CONSTRAINT safepay_transactions_cancel_approver_fk 
FOREIGN KEY (cancel_approved_by) 
REFERENCES public.profiles(user_id) 
ON DELETE SET NULL;
