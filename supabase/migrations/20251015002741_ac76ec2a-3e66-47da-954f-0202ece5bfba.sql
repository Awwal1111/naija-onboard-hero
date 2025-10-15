-- Add is_active column to referral_tasks
ALTER TABLE referral_tasks 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Add some sample referral tasks if table is empty
INSERT INTO referral_tasks (title, description, reward, status, is_active)
SELECT 
  'Refer 5 Friends',
  'Invite 5 friends to join NaijaLancers and earn 500 NC when they sign up',
  500,
  'available',
  true
WHERE NOT EXISTS (SELECT 1 FROM referral_tasks LIMIT 1);

INSERT INTO referral_tasks (title, description, reward, status, is_active)
SELECT 
  'First Referral Bonus',
  'Get 100 NC for your first successful referral',
  100,
  'available',
  true
WHERE (SELECT COUNT(*) FROM referral_tasks) < 2;

INSERT INTO referral_tasks (title, description, reward, status, is_active)
SELECT 
  'Monthly Referral Champion',
  'Refer 20 friends in one month and earn 2000 NC bonus',
  2000,
  'available',
  true
WHERE (SELECT COUNT(*) FROM referral_tasks) < 3;