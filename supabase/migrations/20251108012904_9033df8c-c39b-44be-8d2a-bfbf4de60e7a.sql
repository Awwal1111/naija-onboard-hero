-- Remove telegram_user_id from duplicate accounts (keep only Muhammad Awwal's)
UPDATE profiles 
SET telegram_user_id = NULL, telegram_username = NULL
WHERE telegram_user_id = '6850911010' 
AND user_id != '783c22af-94e5-4082-b1e2-157a66e0f67f';

-- Add unique constraint to prevent duplicates in the future
CREATE UNIQUE INDEX IF NOT EXISTS profiles_telegram_user_id_unique 
ON profiles(telegram_user_id) 
WHERE telegram_user_id IS NOT NULL;