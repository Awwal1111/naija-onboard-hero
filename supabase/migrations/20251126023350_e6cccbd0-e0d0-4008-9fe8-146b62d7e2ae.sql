-- Add expert password field for class moderation
ALTER TABLE expert_classes ADD COLUMN IF NOT EXISTS expert_pass TEXT;

-- Generate expert passwords for existing classes
UPDATE expert_classes 
SET expert_pass = substring(md5(random()::text) from 1 for 12)
WHERE expert_pass IS NULL;