-- Ensure the trigger for updating profile ratings is set up correctly
DROP TRIGGER IF EXISTS trg_update_profile_rating ON public.expert_ratings;

CREATE TRIGGER trg_update_profile_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.expert_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profile_rating();

-- Update the function to handle all cases (INSERT, UPDATE, DELETE)
CREATE OR REPLACE FUNCTION public.update_profile_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  target_expert_id UUID;
BEGIN
  -- Determine which expert_id to update
  IF TG_OP = 'DELETE' THEN
    target_expert_id := OLD.expert_id;
  ELSE
    target_expert_id := NEW.expert_id;
  END IF;

  -- Update the profile with new average rating and count
  UPDATE public.profiles
  SET 
    average_rating = (
      SELECT COALESCE(AVG(rating)::numeric(3,2), 0)
      FROM public.expert_ratings
      WHERE expert_id = target_expert_id
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM public.expert_ratings
      WHERE expert_id = target_expert_id
    ),
    updated_at = NOW()
  WHERE user_id = target_expert_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;