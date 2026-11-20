-- Create partners table for institutional partner system
CREATE TABLE public.partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  partner_cut_pct NUMERIC(5,2) NOT NULL,
  platform_fee_pct NUMERIC(5,2) NOT NULL,
  password_hash TEXT NOT NULL,
  plain_display_pin TEXT NOT NULL,
  website_url TEXT,
  payout_info JSONB,
  total_earned NUMERIC(12,2) DEFAULT 0.00 NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on partners table
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only authenticated users can read all partners (Admins will be checked in application layer or via specific roles if added later)
CREATE POLICY "Authenticated users can view partners for admin use" 
ON public.partners 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- RLS Policy: No public insert, update, or delete (managed by Admin via service role or trusted RPCs)

-- Create partner_payout_logs table to track transactions
CREATE TABLE public.partner_payout_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  gig_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('commission_earned', 'payout_made')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on partner_payout_logs
ALTER TABLE public.partner_payout_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only authenticated users can view logs (Admins will be checked in application layer)
CREATE POLICY "Authenticated users can view payout logs" 
ON public.partner_payout_logs 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Add partner_id column to profiles table to track attributions
ALTER TABLE public.profiles ADD COLUMN partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL;

-- Add index for fast lookup of profiles by partner
CREATE INDEX idx_profiles_partner_id ON public.profiles(partner_id);

-- Helper function to generate a secure hash for partner passwords
CREATE OR REPLACE FUNCTION public.hash_partner_password(p_pin TEXT) 
RETURNS TEXT AS $$
DECLARE
  secret TEXT := 'NL-PARTNER-HALT-' || now()::TEXT;
BEGIN
  RETURN encode(digest(p_pin || secret, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql STABLE;

-- Public RPC to verify partner portal access
CREATE OR REPLACE FUNCTION public.verify_partner_portal(p_slug TEXT, p_password TEXT) 
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public AS $$
DECLARE
  v_partner RECORD;
  v_is_valid BOOLEAN;
  v_student_count INTEGER;
  v_total_earnings NUMERIC(12,2) := 0.00;
  v_recent_deals JSONB;
BEGIN
  -- Check if partner exists and is active
  SELECT * INTO v_partner FROM public.partners WHERE slug = p_slug AND is_active = TRUE;
  
  IF v_partner.id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Partner not found or inactive');
  END IF;

  -- Verify password
  v_is_valid := (public.hash_partner_password(p_password) = v_partner.password_hash);

  IF NOT v_is_valid THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Invalid password');
  END IF;

  -- Get stats (capped limit for recent deals to save egress)
  SELECT COUNT(*) INTO v_student_count FROM public.profiles WHERE partner_id = v_partner.id;
  
  SELECT COALESCE(SUM(t.amount), 0) INTO v_total_earnings 
  FROM public.partner_payout_logs t 
  WHERE t.partner_id = v_partner.id AND t.type = 'commission_earned';

  -- Get recent deals (anonymized)
  SELECT jsonb_agg(jsonb_build_object(
    'id', l.id,
    'amount', l.amount,
    'type', l.type,
    'date', l.created_at
  )) INTO v_recent_deals
  FROM public.partner_payout_logs l
  WHERE l.partner_id = v_partner.id AND l.type = 'commission_earned'
  ORDER BY l.created_at DESC
  LIMIT 10;

  IF v_recent_deals IS NULL THEN
    v_recent_deals = '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'token', p_slug || '-' || public.hash_partner_password('SESSION-KEY-' || v_partner.id),
    'partner_name', v_partner.name,
    'stats', jsonb_build_object(
      'students_registered', v_student_count,
      'total_commission_earned', v_total_earnings,
      'partner_partnership_balance', v_partner.total_earned
    ),
    'recent_deals', v_recent_deals
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in verify_partner_portal: %', SQLERRM;
    RETURN jsonb_build_object('success', FALSE, 'error', 'An unexpected error occurred');
END;
$$;