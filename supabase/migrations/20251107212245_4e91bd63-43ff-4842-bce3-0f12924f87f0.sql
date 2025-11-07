-- Drop incorrect foreign key constraints
ALTER TABLE expert_ratings DROP CONSTRAINT IF EXISTS expert_ratings_expert_id_fkey;
ALTER TABLE expert_ratings DROP CONSTRAINT IF EXISTS expert_ratings_user_id_fkey;

-- Add correct foreign key constraints pointing to profiles.user_id
ALTER TABLE expert_ratings 
ADD CONSTRAINT expert_ratings_expert_id_fkey 
FOREIGN KEY (expert_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

ALTER TABLE expert_ratings 
ADD CONSTRAINT expert_ratings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;