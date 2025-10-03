-- Comprehensive fix for all reported issues - Clean Version

-- 1. CREATE STORAGE BUCKETS FOR SOCIAL MEDIA AND REFERRAL TASKS
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('social-media-tasks', 'social-media-tasks', false),
  ('referral-tasks', 'referral-tasks', false)
ON CONFLICT (id) DO NOTHING;

-- 2. ADD RLS POLICIES FOR NEW BUCKETS (drop if exists first)
DROP POLICY IF EXISTS "Users can upload their social media task proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own social media task proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all social media task proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their referral task proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own referral task proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all referral task proofs" ON storage.objects;

-- Social media tasks bucket policies
CREATE POLICY "Users can upload their social media task proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'social-media-tasks' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own social media task proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'social-media-tasks' AND
  (auth.uid()::text = (storage.foldername(name))[1] OR is_admin_user())
);

-- Referral tasks bucket policies
CREATE POLICY "Users can upload their referral task proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'referral-tasks' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own referral task proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'referral-tasks' AND
  (auth.uid()::text = (storage.foldername(name))[1] OR is_admin_user())
);

-- 3. FIX HANDLE_NEW_USER FUNCTION TO PROPERLY HANDLE SIGNUP BONUS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Create profile with signup bonus
  INSERT INTO public.profiles (
    user_id, 
    full_name, 
    phone_number,
    wallet_balance,
    balance_withdrawable,
    balance_non_withdrawable
  ) VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
    50.00,  -- ₦50NC signup bonus
    0.00,   -- Signup bonus is non-withdrawable
    50.00   -- Non-withdrawable signup bonus
  );
  
  -- Log the signup bonus transaction
  INSERT INTO public.wallet_transactions (
    user_id, 
    kind, 
    amount, 
    status, 
    reference
  ) VALUES (
    NEW.id,
    'signup_bonus',
    50.00,
    'completed',
    'New user signup bonus - ₦50NC'
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block signup
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$function$;

-- 4. ADD ADMIN WALLET MANAGEMENT PERMISSIONS
DROP POLICY IF EXISTS "Admins can update any wallet" ON profiles;
CREATE POLICY "Admins can update any wallet" 
ON profiles FOR UPDATE
TO authenticated
USING (is_admin_user())
WITH CHECK (is_admin_user());