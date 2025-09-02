-- Fix security definer view issue and improve the security approach

-- Step 1: Drop the problematic security definer view
DROP VIEW IF EXISTS public.public_profiles;

-- Step 2: Instead of a view, we'll modify the RLS policies to be more specific
-- First, drop the overly broad public policy  
DROP POLICY IF EXISTS "Public discovery info for all users" ON public.profiles;

-- Step 3: Create more specific policies for different access levels

-- Policy for viewing basic public information (name, profession, profile picture) for discovery
CREATE POLICY "Basic public info for discovery"
ON public.profiles
FOR SELECT  
USING (
  -- Users can see basic info of others for discovery, but sensitive data is hidden via column selection in queries
  auth.uid() != user_id
);

-- Step 4: Create a function to get only public profile data (without security definer)
CREATE OR REPLACE FUNCTION public.get_public_profile_info(target_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  profession text,
  bio text,
  profile_picture_url text,
  is_expert boolean,
  expert_verified_at timestamp with time zone,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY INVOKER  -- Use SECURITY INVOKER instead of DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.full_name,
    p.profession,
    p.bio,
    p.profile_picture_url,
    p.is_expert,
    p.expert_verified_at,
    p.created_at
  FROM public.profiles p
  WHERE p.user_id = target_user_id;
$$;

-- Step 5: Create a function to get connected user's detailed info
CREATE OR REPLACE FUNCTION public.get_connected_profile_info(target_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  profession text,
  bio text,
  profile_picture_url text,
  phone_number text,
  connections_count integer,
  state_name text,
  lga_name text,
  area text,
  is_expert boolean,
  expert_verified_at timestamp with time zone,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.full_name,
    p.profession,
    p.bio,
    p.profile_picture_url,
    p.phone_number,
    p.connections_count,
    p.state_name,
    p.lga_name,
    p.area,
    p.is_expert,
    p.expert_verified_at,
    p.created_at
  FROM public.profiles p
  WHERE p.user_id = target_user_id
    AND (
      auth.uid() = target_user_id  -- Own profile
      OR public.users_are_connected(auth.uid(), target_user_id)  -- Connected users
    );
$$;

-- Step 6: Add specific RLS policy to limit what columns can be accessed directly
-- Update the policies to be more restrictive about sensitive data

-- Remove the basic public info policy and replace with column-specific access
DROP POLICY IF EXISTS "Basic public info for discovery" ON public.profiles;

-- Policy that only allows access to non-sensitive data for non-connected users
CREATE POLICY "Limited public discovery"
ON public.profiles
FOR SELECT
USING (
  -- Allow own profile access
  auth.uid() = user_id
  -- Allow connected users to see more data  
  OR public.users_are_connected(auth.uid(), user_id)
  -- For non-connected users, they need to use the public function to access limited data
);

-- Step 7: Create a rate limiting table to prevent abuse
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  action text NOT NULL,
  count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rate_limits_unique_user_action_window UNIQUE (user_id, action, window_start)
);

-- Enable RLS on rate limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can only see their own rate limit data
CREATE POLICY "Users can view their own rate limits"
ON public.rate_limits
FOR SELECT
USING (auth.uid() = user_id);

-- Create function to check rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  action_name text,
  max_requests integer DEFAULT 100,
  window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
  window_start_time timestamp with time zone;
BEGIN
  -- Calculate window start time
  window_start_time := date_trunc('hour', now()) + 
    (extract(minute from now())::integer / window_minutes) * (window_minutes || ' minutes')::interval;
  
  -- Get current count for this window
  SELECT count INTO current_count
  FROM public.rate_limits 
  WHERE user_id = auth.uid() 
    AND action = action_name 
    AND window_start = window_start_time;
  
  -- If no record exists, create one
  IF current_count IS NULL THEN
    INSERT INTO public.rate_limits (user_id, action, count, window_start)
    VALUES (auth.uid(), action_name, 1, window_start_time)
    ON CONFLICT (user_id, action, window_start) 
    DO UPDATE SET count = rate_limits.count + 1;
    RETURN true;
  END IF;
  
  -- Check if under limit
  IF current_count < max_requests THEN
    UPDATE public.rate_limits 
    SET count = count + 1
    WHERE user_id = auth.uid() 
      AND action = action_name 
      AND window_start = window_start_time;
    RETURN true;
  END IF;
  
  -- Over limit
  RETURN false;
END;
$$;