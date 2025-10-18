-- Remove duplicate YouTube Follow task (keeping the one with lower id)
DELETE FROM social_tasks WHERE id = 6 AND platform = 'YouTube' AND type = 'Follow';

-- Add comment for clarity
COMMENT ON TABLE social_tasks IS 'Social media tasks with unique platform-type combinations to prevent duplicates';