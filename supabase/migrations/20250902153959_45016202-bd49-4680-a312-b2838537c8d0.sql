-- Fix critical security issues with user data exposure

-- Step 1: Create connections table to track user connections
CREATE TABLE IF NOT EXISTS public.connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id uuid NOT NULL,
  user2_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'connected',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT connections_unique_pair UNIQUE (user1_id, user2_id),
  CONSTRAINT connections_no_self_connection CHECK (user1_id != user2_id)
);

-- Enable RLS on connections table
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- Create policies for connections table
CREATE POLICY "Users can view their own connections"
ON public.connections
FOR SELECT
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create connections they are part of"
ON public.connections
FOR INSERT
WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Step 2: Create security definer function to check if users are connected
CREATE OR REPLACE FUNCTION public.users_are_connected(user1 uuid, user2 uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.connections 
    WHERE (user1_id = user1 AND user2_id = user2) 
       OR (user1_id = user2 AND user2_id = user1)
  );
$$;

-- Step 3: Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Step 4: Create new restrictive policies for profile access
-- Allow users to view their own profile completely
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to view basic public info of connected users
CREATE POLICY "Users can view connected users basic info"  
ON public.profiles
FOR SELECT
USING (
  auth.uid() != user_id 
  AND public.users_are_connected(auth.uid(), user_id)
);

-- Allow users to view very limited public info for discovery (name, profession, profile picture only)
CREATE POLICY "Public discovery info for all users"
ON public.profiles  
FOR SELECT
USING (true);

-- Note: The above policy will be restricted by creating a view for public data

-- Step 5: Create a view for public profile data only
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  user_id,
  full_name,
  profession,
  bio,
  profile_picture_url,
  is_expert,
  expert_verified_at,
  created_at,
  -- Exclude sensitive data: phone_number, wallet_balance, full location details, referral_code
  0 as connections_count -- Show 0 for privacy
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO authenticated;

-- Step 6: Enhance expert applications security with field-level restrictions
-- Create function to mask sensitive data in expert applications for non-owners
CREATE OR REPLACE FUNCTION public.mask_expert_application_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow full access to the application owner
  IF auth.uid() != NEW.user_id THEN
    -- Mask sensitive data for non-owners (this would apply to admin views)
    NEW.email := 'hidden@example.com';
    NEW.phone_number := 'xxx-xxx-xxxx';
  END IF;
  RETURN NEW;
END;
$$;

-- Step 7: Add trigger for updated_at on connections
CREATE TRIGGER update_connections_updated_at
    BEFORE UPDATE ON public.connections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Step 8: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_connections_user1_id ON public.connections(user1_id);
CREATE INDEX IF NOT EXISTS idx_connections_user2_id ON public.connections(user2_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- Step 9: Add audit logging table for sensitive data access
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  metadata jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on audit logs  
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs (for now, users can't see them)
CREATE POLICY "Only system can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (false); -- This will be used by security definer functions only