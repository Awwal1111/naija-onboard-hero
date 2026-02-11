
-- ================================================================
-- LOGIN HISTORY TABLE - Track all user sign-ins with IP/device info
-- ================================================================
CREATE TABLE public.login_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT, -- 'mobile', 'desktop', 'tablet'
  browser TEXT,
  os TEXT,
  country TEXT,
  city TEXT,
  login_method TEXT DEFAULT 'email', -- 'email', 'google', 'phone'
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own login history"
  ON public.login_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert login history"
  ON public.login_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all login history"
  ON public.login_history FOR SELECT
  USING (public.is_admin_user());

CREATE INDEX idx_login_history_user_id ON public.login_history(user_id);
CREATE INDEX idx_login_history_created_at ON public.login_history(created_at DESC);

-- ================================================================
-- IDENTITY VERIFICATIONS TABLE - NIN/BVN/International ID storage
-- ================================================================
CREATE TABLE public.identity_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  -- Verification type
  verification_type TEXT NOT NULL, -- 'nin', 'bvn', 'international_id', 'passport'
  -- Verification status
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'verified', 'rejected', 'expired'
  -- Hashed/masked ID (never store full NIN/BVN)
  id_number_hash TEXT, -- SHA256 hash of NIN/BVN
  id_number_last4 TEXT, -- Last 4 digits only for display
  -- Verified name from API (for cross-checking)
  verified_first_name TEXT,
  verified_last_name TEXT,
  verified_middle_name TEXT,
  verified_gender TEXT,
  verified_dob TEXT,
  verified_state TEXT,
  -- NIN/BVN photo from API (base64 stored encrypted)
  verification_photo_url TEXT, -- Stored in Supabase storage (private bucket)
  -- Face match result
  face_match_score NUMERIC, -- 0-100 similarity score
  face_match_passed BOOLEAN DEFAULT false,
  -- AI risk assessment
  ai_risk_score NUMERIC DEFAULT 0, -- 0-100 (0=safe, 100=high risk)
  ai_risk_factors JSONB DEFAULT '[]'::jsonb,
  -- Metadata
  verified_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  api_report_id TEXT, -- Reference from checkmyninbvn
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own verification status (not raw data)
CREATE POLICY "Users can view own verification status"
  ON public.identity_verifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert verifications"
  ON public.identity_verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all verifications"
  ON public.identity_verifications FOR ALL
  USING (public.is_admin_user());

CREATE INDEX idx_identity_verifications_user ON public.identity_verifications(user_id);

-- ================================================================
-- VERIFICATION LEVEL on profiles - computed from verifications
-- ================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_level TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS identity_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS identity_verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS verification_country TEXT DEFAULT 'NG',
  ADD COLUMN IF NOT EXISTS face_selfie_url TEXT,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS risk_score NUMERIC DEFAULT 0;

-- ================================================================
-- ACTION RESTRICTIONS TABLE - Define what actions need what verification level
-- ================================================================
CREATE TABLE public.action_restrictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_name TEXT NOT NULL UNIQUE,
  required_level TEXT NOT NULL DEFAULT 'basic', -- 'none', 'basic', 'verified', 'fully_verified'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.action_restrictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read action restrictions"
  ON public.action_restrictions FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage restrictions"
  ON public.action_restrictions FOR ALL
  USING (public.is_admin_user());

-- Insert default action restrictions
INSERT INTO public.action_restrictions (action_name, required_level, description) VALUES
  ('view_phone', 'verified', 'View other users phone number'),
  ('view_email', 'basic', 'View other users email'),
  ('send_message', 'basic', 'Send direct messages'),
  ('make_call', 'verified', 'Make voice/video calls'),
  ('accept_physical_job', 'fully_verified', 'Accept physical/in-person jobs'),
  ('withdraw_funds', 'verified', 'Withdraw funds from wallet'),
  ('create_contest', 'basic', 'Create a design contest'),
  ('apply_expert', 'basic', 'Apply for expert status'),
  ('large_transfer', 'fully_verified', 'Transfer amounts over 50000 NC'),
  ('post_gig', 'basic', 'Post a gig/service');

-- ================================================================
-- FUNCTION: Calculate verification level for a user
-- ================================================================
CREATE OR REPLACE FUNCTION public.get_verification_level(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email_verified BOOLEAN;
  v_phone_verified BOOLEAN;
  v_face_verified BOOLEAN;
  v_identity_verified BOOLEAN;
  v_level TEXT := 'none';
BEGIN
  SELECT 
    COALESCE(email_verified, false),
    COALESCE(phone_verified, false),
    COALESCE(face_verified, false),
    COALESCE(identity_verified, false)
  INTO v_email_verified, v_phone_verified, v_face_verified, v_identity_verified
  FROM public.profiles
  WHERE user_id = p_user_id;

  IF v_identity_verified AND v_face_verified THEN
    v_level := 'fully_verified';
  ELSIF v_face_verified OR (v_email_verified AND v_phone_verified) THEN
    v_level := 'verified';
  ELSIF v_email_verified OR v_phone_verified THEN
    v_level := 'basic';
  END IF;

  RETURN v_level;
END;
$$;

-- ================================================================
-- FUNCTION: Check if user can perform action
-- ================================================================
CREATE OR REPLACE FUNCTION public.check_action_allowed(p_user_id UUID, p_action TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_level TEXT;
  v_required_level TEXT;
  v_level_order JSONB := '{"none": 0, "basic": 1, "verified": 2, "fully_verified": 3}'::jsonb;
  v_user_rank INT;
  v_required_rank INT;
BEGIN
  v_user_level := public.get_verification_level(p_user_id);

  SELECT required_level INTO v_required_level
  FROM public.action_restrictions
  WHERE action_name = p_action;

  IF v_required_level IS NULL THEN
    RETURN jsonb_build_object('allowed', true, 'user_level', v_user_level);
  END IF;

  v_user_rank := (v_level_order->>v_user_level)::int;
  v_required_rank := (v_level_order->>v_required_level)::int;

  IF v_user_rank >= v_required_rank THEN
    RETURN jsonb_build_object('allowed', true, 'user_level', v_user_level);
  ELSE
    RETURN jsonb_build_object(
      'allowed', false,
      'user_level', v_user_level,
      'required_level', v_required_level,
      'message', 'You need ' || v_required_level || ' verification to perform this action'
    );
  END IF;
END;
$$;

-- Trigger to update verification_level on profile changes
CREATE OR REPLACE FUNCTION public.update_verification_level()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.verification_level := public.get_verification_level(NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_verification_level
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (
    OLD.email_verified IS DISTINCT FROM NEW.email_verified OR
    OLD.phone_verified IS DISTINCT FROM NEW.phone_verified OR
    OLD.face_verified IS DISTINCT FROM NEW.face_verified OR
    OLD.identity_verified IS DISTINCT FROM NEW.identity_verified
  )
  EXECUTE FUNCTION public.update_verification_level();

-- Create private storage bucket for verification photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-photos', 'verification-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for verification photos
CREATE POLICY "Users can upload own verification photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'verification-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own verification photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'verification-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all verification photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'verification-photos' AND public.is_admin_user());
