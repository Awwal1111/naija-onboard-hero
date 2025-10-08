-- Create admin_invitations table for tracking invitations
CREATE TABLE IF NOT EXISTS public.admin_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role user_role NOT NULL,
  invited_by UUID REFERENCES auth.users(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  invitation_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;

-- Only admins can view invitations
CREATE POLICY "Admins can view all invitations"
ON public.admin_invitations
FOR SELECT
TO authenticated
USING (is_admin_user());

-- Only admins can create invitations
CREATE POLICY "Admins can create invitations"
ON public.admin_invitations
FOR INSERT
TO authenticated
WITH CHECK (is_admin_user() AND auth.uid() = invited_by);

-- Only admins can update invitations
CREATE POLICY "Admins can update invitations"
ON public.admin_invitations
FOR UPDATE
TO authenticated
USING (is_admin_user());

-- Create function to accept invitation and assign role
CREATE OR REPLACE FUNCTION public.accept_admin_invitation(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_user_id UUID;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Get invitation details
  SELECT * INTO v_invitation
  FROM public.admin_invitations
  WHERE invitation_token = p_token
    AND status = 'pending'
    AND expires_at > NOW()
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;
  
  -- Verify email matches
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = v_user_id 
    AND LOWER(email) = LOWER(v_invitation.email)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email does not match invitation');
  END IF;
  
  -- Assign role to user
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, v_invitation.role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Update invitation status
  UPDATE public.admin_invitations
  SET status = 'accepted',
      accepted_at = NOW(),
      updated_at = NOW()
  WHERE id = v_invitation.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'role', v_invitation.role
  );
END;
$$;

-- Create admin_stats table for dashboard statistics
CREATE TABLE IF NOT EXISTS public.admin_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_users INTEGER NOT NULL DEFAULT 0,
  active_users INTEGER NOT NULL DEFAULT 0,
  total_experts INTEGER NOT NULL DEFAULT 0,
  total_posts INTEGER NOT NULL DEFAULT 0,
  total_jobs INTEGER NOT NULL DEFAULT 0,
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  pending_applications INTEGER NOT NULL DEFAULT 0,
  new_signups INTEGER NOT NULL DEFAULT 0,
  total_wallet_balance NUMERIC NOT NULL DEFAULT 0,
  total_transactions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(stat_date)
);

-- Enable RLS for admin_stats
ALTER TABLE public.admin_stats ENABLE ROW LEVEL SECURITY;

-- Only admins can view stats
CREATE POLICY "Admins can view stats"
ON public.admin_stats
FOR SELECT
TO authenticated
USING (is_admin_user());

-- Function to refresh admin stats (can be called via cron or manually)
CREATE OR REPLACE FUNCTION public.refresh_admin_stats()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stat_date DATE := CURRENT_DATE;
  v_total_users INTEGER;
  v_active_users INTEGER;
  v_total_experts INTEGER;
  v_total_posts INTEGER;
  v_total_jobs INTEGER;
  v_total_revenue NUMERIC;
  v_pending_applications INTEGER;
  v_new_signups INTEGER;
  v_total_wallet_balance NUMERIC;
  v_total_transactions INTEGER;
BEGIN
  -- Calculate statistics
  SELECT COUNT(*) INTO v_total_users FROM public.profiles;
  
  SELECT COUNT(*) INTO v_active_users 
  FROM public.profiles 
  WHERE created_at > NOW() - INTERVAL '30 days';
  
  SELECT COUNT(*) INTO v_total_experts 
  FROM public.profiles 
  WHERE is_expert = true;
  
  SELECT COUNT(*) INTO v_total_posts FROM public.posts;
  
  SELECT COUNT(*) INTO v_total_jobs FROM public.job_posts;
  
  SELECT COALESCE(SUM(amount), 0) INTO v_total_revenue
  FROM public.wallet_transactions
  WHERE transaction_type IN ('deposit', 'payment_received');
  
  SELECT COUNT(*) INTO v_pending_applications
  FROM public.expert_applications
  WHERE status = 'pending';
  
  SELECT COUNT(*) INTO v_new_signups
  FROM public.profiles
  WHERE created_at > NOW() - INTERVAL '7 days';
  
  SELECT COALESCE(SUM(wallet_balance), 0) INTO v_total_wallet_balance
  FROM public.profiles;
  
  SELECT COUNT(*) INTO v_total_transactions
  FROM public.wallet_transactions;
  
  -- Insert or update stats
  INSERT INTO public.admin_stats (
    stat_date, total_users, active_users, total_experts,
    total_posts, total_jobs, total_revenue, pending_applications,
    new_signups, total_wallet_balance, total_transactions, updated_at
  ) VALUES (
    v_stat_date, v_total_users, v_active_users, v_total_experts,
    v_total_posts, v_total_jobs, v_total_revenue, v_pending_applications,
    v_new_signups, v_total_wallet_balance, v_total_transactions, NOW()
  )
  ON CONFLICT (stat_date)
  DO UPDATE SET
    total_users = EXCLUDED.total_users,
    active_users = EXCLUDED.active_users,
    total_experts = EXCLUDED.total_experts,
    total_posts = EXCLUDED.total_posts,
    total_jobs = EXCLUDED.total_jobs,
    total_revenue = EXCLUDED.total_revenue,
    pending_applications = EXCLUDED.pending_applications,
    new_signups = EXCLUDED.new_signups,
    total_wallet_balance = EXCLUDED.total_wallet_balance,
    total_transactions = EXCLUDED.total_transactions,
    updated_at = NOW();
END;
$$;