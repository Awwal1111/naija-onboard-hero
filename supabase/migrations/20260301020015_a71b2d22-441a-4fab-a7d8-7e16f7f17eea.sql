-- Fix existing users who completed identity verification but have no verification_level set
UPDATE profiles 
SET verification_level = 'verified', 
    updated_at = now()
WHERE identity_verified = true 
  AND (verification_level IS NULL OR verification_level = 'none' OR verification_level = 'basic');

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';