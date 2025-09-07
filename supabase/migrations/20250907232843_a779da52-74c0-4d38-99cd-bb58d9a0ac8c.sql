-- Approve Kabiru's expert application
UPDATE expert_applications 
SET status = 'approved', 
    admin_feedback = 'Application approved by admin',
    reviewed_at = now()
WHERE user_id = '75aaab45-e969-409c-a7c5-69e5de43df39';

-- Update his profile to expert status
UPDATE profiles 
SET is_expert = true,
    expert_verified_at = now()
WHERE user_id = '75aaab45-e969-409c-a7c5-69e5de43df39';