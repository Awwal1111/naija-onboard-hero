-- Create IP tracking table for fraud prevention
CREATE TABLE public.ip_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL,
  user_id UUID,
  action_type TEXT NOT NULL DEFAULT 'signup', -- signup, login, transaction
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_agent TEXT,
  is_flagged BOOLEAN DEFAULT false,
  flag_reason TEXT
);

-- Create index for fast IP lookups
CREATE INDEX idx_ip_tracking_ip_address ON public.ip_tracking(ip_address);
CREATE INDEX idx_ip_tracking_created_at ON public.ip_tracking(created_at);
CREATE INDEX idx_ip_tracking_user_id ON public.ip_tracking(user_id);

-- Enable RLS
ALTER TABLE public.ip_tracking ENABLE ROW LEVEL SECURITY;

-- Only allow service role to insert (from edge functions)
CREATE POLICY "Service role can manage ip_tracking"
ON public.ip_tracking
FOR ALL
USING (true)
WITH CHECK (true);

-- Create function to check IP signup limits (max 3 signups per IP per 24 hours)
CREATE OR REPLACE FUNCTION public.check_ip_signup_limit(check_ip TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  signup_count INTEGER;
  is_allowed BOOLEAN;
  result JSON;
BEGIN
  -- Count signups from this IP in last 24 hours
  SELECT COUNT(*) INTO signup_count
  FROM ip_tracking
  WHERE ip_address = check_ip
    AND action_type = 'signup'
    AND created_at > NOW() - INTERVAL '24 hours';
  
  -- Allow up to 3 signups per IP per day
  is_allowed := signup_count < 3;
  
  result := json_build_object(
    'allowed', is_allowed,
    'signup_count', signup_count,
    'limit', 3,
    'remaining', GREATEST(0, 3 - signup_count)
  );
  
  RETURN result;
END;
$$;

-- Create function to log IP activity
CREATE OR REPLACE FUNCTION public.log_ip_activity(
  p_ip_address TEXT,
  p_user_id UUID DEFAULT NULL,
  p_action_type TEXT DEFAULT 'signup',
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
  should_flag BOOLEAN := false;
  flag_msg TEXT := NULL;
  ip_count INTEGER;
BEGIN
  -- Check if this IP has many accounts (potential fraud indicator)
  SELECT COUNT(DISTINCT user_id) INTO ip_count
  FROM ip_tracking
  WHERE ip_address = p_ip_address
    AND user_id IS NOT NULL;
  
  -- Flag if more than 5 accounts from same IP
  IF ip_count >= 5 THEN
    should_flag := true;
    flag_msg := 'Multiple accounts detected from this IP';
  END IF;
  
  INSERT INTO ip_tracking (ip_address, user_id, action_type, user_agent, is_flagged, flag_reason)
  VALUES (p_ip_address, p_user_id, p_action_type, p_user_agent, should_flag, flag_msg)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_ip_signup_limit(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_ip_activity(TEXT, UUID, TEXT, TEXT) TO anon, authenticated;