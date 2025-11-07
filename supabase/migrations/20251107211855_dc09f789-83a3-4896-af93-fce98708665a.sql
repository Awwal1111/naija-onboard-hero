-- Add rating constraint to ensure ratings are between 1-5
ALTER TABLE expert_ratings DROP CONSTRAINT IF EXISTS expert_ratings_rating_check;
ALTER TABLE expert_ratings ADD CONSTRAINT expert_ratings_rating_check CHECK (rating >= 1 AND rating <= 5);

-- Drop existing policies
DROP POLICY IF EXISTS "expert_ratings_insert" ON expert_ratings;
DROP POLICY IF EXISTS "expert_ratings_no_update" ON expert_ratings;
DROP POLICY IF EXISTS "expert_ratings_no_delete" ON expert_ratings;

-- Allow users to insert ratings (can't rate themselves, can't duplicate)
CREATE POLICY "expert_ratings_insert" ON expert_ratings
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND expert_id <> auth.uid()
  AND NOT EXISTS (
    SELECT 1 FROM expert_ratings er 
    WHERE er.expert_id = expert_ratings.expert_id 
    AND er.user_id = auth.uid()
  )
);

-- Allow users to update their own ratings within 24 hours
CREATE POLICY "expert_ratings_update_own_24h" ON expert_ratings
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  AND created_at > (now() - interval '24 hours')
)
WITH CHECK (
  user_id = auth.uid()
  AND expert_id = expert_id  -- Can't change the expert being rated
  AND user_id = user_id       -- Can't change who rated
);

-- Allow users to delete their own ratings within 24 hours
CREATE POLICY "expert_ratings_delete_own_24h" ON expert_ratings
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  AND created_at > (now() - interval '24 hours')
);