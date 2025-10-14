-- Update skills visibility policy to allow everyone to view skills
DROP POLICY IF EXISTS "Skills are viewable by connected users" ON public.skills;

CREATE POLICY "Anyone can view skills"
ON public.skills
FOR SELECT
USING (true);

-- Allow deleting endorsements
DROP POLICY IF EXISTS "Users can remove their own endorsements" ON public.skill_endorsements;

CREATE POLICY "Users can remove their own endorsements"
ON public.skill_endorsements
FOR DELETE
USING (auth.uid() = endorser_id);