-- Enable RLS on saved_posts if not already enabled
ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own saved posts" ON saved_posts;
DROP POLICY IF EXISTS "Users can save posts" ON saved_posts;
DROP POLICY IF EXISTS "Users can unsave posts" ON saved_posts;

-- Allow users to view their own saved posts
CREATE POLICY "Users can view their own saved posts"
ON saved_posts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to save posts
CREATE POLICY "Users can save posts"
ON saved_posts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to unsave posts
CREATE POLICY "Users can unsave posts"
ON saved_posts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);