-- Create function to update profile rating stats
CREATE OR REPLACE FUNCTION update_profile_rating_stats()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update the expert's profile with new rating statistics
  UPDATE profiles
  SET 
    average_rating = (
      SELECT COALESCE(AVG(rating::numeric), 0)
      FROM expert_ratings
      WHERE expert_id = COALESCE(NEW.expert_id, OLD.expert_id)
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM expert_ratings
      WHERE expert_id = COALESCE(NEW.expert_id, OLD.expert_id)
    ),
    updated_at = NOW()
  WHERE user_id = COALESCE(NEW.expert_id, OLD.expert_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for INSERT on expert_ratings
DROP TRIGGER IF EXISTS update_profile_rating_on_insert ON expert_ratings;
CREATE TRIGGER update_profile_rating_on_insert
  AFTER INSERT ON expert_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_rating_stats();

-- Create trigger for DELETE on expert_ratings
DROP TRIGGER IF EXISTS update_profile_rating_on_delete ON expert_ratings;
CREATE TRIGGER update_profile_rating_on_delete
  AFTER DELETE ON expert_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_rating_stats();