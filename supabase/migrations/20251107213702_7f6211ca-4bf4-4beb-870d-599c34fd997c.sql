-- Enable RLS on portfolio_items if not already enabled
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view portfolio items" ON portfolio_items;
DROP POLICY IF EXISTS "Users can insert their own portfolio items" ON portfolio_items;
DROP POLICY IF EXISTS "Users can update their own portfolio items" ON portfolio_items;
DROP POLICY IF EXISTS "Users can delete their own portfolio items" ON portfolio_items;

-- Allow anyone to view portfolio items
CREATE POLICY "Anyone can view portfolio items"
ON portfolio_items
FOR SELECT
USING (true);

-- Allow authenticated users to insert their own portfolio items
CREATE POLICY "Users can insert their own portfolio items"
ON portfolio_items
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own portfolio items
CREATE POLICY "Users can update their own portfolio items"
ON portfolio_items
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own portfolio items
CREATE POLICY "Users can delete their own portfolio items"
ON portfolio_items
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);