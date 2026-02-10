
-- =============================================
-- FIX 1: Profiles - Replace dangerous USING(true) SELECT
-- =============================================

-- Drop the dangerous "anyone can read all profiles" policy
DROP POLICY IF EXISTS "Authenticated users view profiles" ON public.profiles;

-- Create a safe public view that excludes ALL sensitive columns
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT 
  id, user_id, full_name, bio, profession, profile_picture_url,
  connections_count, state_name, lga_name, area,
  is_expert, expert_verified_at, created_at, updated_at,
  referral_code, average_rating, rating_count, open_to_work,
  account_type, business_name, business_verified,
  completed_jobs_count, total_earnings, total_transactions,
  verification_status, is_boosted, boost_expires_at,
  is_premium, premium_expires_at,
  whatsapp_number, facebook_url, google_meet_link,
  intro_video_url, intro_video_thumbnail, portfolio_videos,
  user_mode, country_code
FROM public.profiles;

-- Allow authenticated users to read the safe public view
-- The view's security_invoker means it uses the caller's permissions
-- So we need a SELECT policy that allows reading but only safe columns go through the view
CREATE POLICY "Public profile view - safe fields only"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- NOTE: The USING(true) on the BASE table is still needed for the view to work
-- BUT the view itself only exposes safe columns, so sensitive data is hidden
-- Users should query profiles_public instead of profiles directly

-- Actually, a better approach: restrict direct table access and use RPC
-- Let's use a more targeted approach instead

-- Remove the policy we just created
DROP POLICY IF EXISTS "Public profile view - safe fields only" ON public.profiles;

-- Create a restrictive SELECT: users can only see their OWN full profile
-- For other users' profiles, they must use the view
CREATE POLICY "Users see own full profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow anon/wallet lookups (existing functionality)
-- "Wallet lookup by address" and "Users can view their own profile" already exist

-- Create a SECURITY DEFINER function for safe public profile lookups
CREATE OR REPLACE FUNCTION public.get_public_profiles(user_ids uuid[] DEFAULT NULL)
RETURNS TABLE (
  id uuid, user_id uuid, full_name text, bio text, profession text,
  profile_picture_url text, connections_count integer, state_name text,
  lga_name text, area text, is_expert boolean, expert_verified_at timestamptz,
  created_at timestamptz, updated_at timestamptz, average_rating numeric,
  rating_count integer, open_to_work boolean, account_type text,
  business_name text, business_verified boolean, completed_jobs_count integer,
  verification_status text, is_boosted boolean, is_premium boolean,
  whatsapp_number text, facebook_url text, intro_video_url text,
  intro_video_thumbnail text, user_mode text, country_code text,
  referral_code text, celo_wallet_address text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id, p.user_id, p.full_name, p.bio, p.profession,
    p.profile_picture_url, p.connections_count, p.state_name,
    p.lga_name, p.area, p.is_expert, p.expert_verified_at,
    p.created_at, p.updated_at, p.average_rating,
    p.rating_count, p.open_to_work, p.account_type,
    p.business_name, p.business_verified, p.completed_jobs_count,
    p.verification_status, p.is_boosted, p.is_premium,
    p.whatsapp_number, p.facebook_url, p.intro_video_url,
    p.intro_video_thumbnail, p.user_mode, p.country_code,
    p.referral_code, p.celo_wallet_address
  FROM public.profiles p
  WHERE (user_ids IS NULL OR p.user_id = ANY(user_ids));
$$;

-- =============================================
-- FIX 2: Expert Applications - Hide PII from public
-- =============================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view approved expert applications" ON public.expert_applications;

-- Create a safe public view for approved expert applications (no PII)
CREATE OR REPLACE VIEW public.expert_applications_public
WITH (security_invoker = on) AS
SELECT 
  id, user_id, skill_category, years_experience,
  portfolio_link, work_samples_urls, location_state,
  location_lga, location_area, status, submitted_at, reviewed_at
FROM public.expert_applications
WHERE status = 'approved';

-- Users can view approved applications but only non-PII fields via the view
-- The base table SELECT is restricted to own records + admin
-- "Users can view their own applications" already exists
-- "Admin can view and manage all expert applications" already exists

-- =============================================
-- FIX 3: System Settings - Hide sensitive keys
-- =============================================

-- Drop the overly permissive policy  
DROP POLICY IF EXISTS "Everyone can read system settings" ON public.system_settings;

-- Create restricted read: everyone can read non-sensitive settings
CREATE POLICY "Users read non-sensitive settings"
ON public.system_settings FOR SELECT
TO authenticated
USING (key NOT IN ('master_wallet_encrypted', 'master_wallet_key', 'admin_secret_key'));

-- Admins can read all settings
CREATE POLICY "Admins read all settings"
ON public.system_settings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);
