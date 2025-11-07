-- Fix the expert_ratings INSERT policy
-- The bug was: WHERE ((er.expert_id = er.expert_id) AND (er.user_id = er.user_id))
-- This always evaluates to true, preventing all inserts

DROP POLICY IF EXISTS "expert_ratings_insert" ON public.expert_ratings;

CREATE POLICY "expert_ratings_insert" ON public.expert_ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND expert_id <> auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM expert_ratings er
      WHERE er.expert_id = expert_ratings.expert_id
      AND er.user_id = expert_ratings.user_id
    )
  );