-- Create trigger to notify experts when they receive a rating
CREATE OR REPLACE TRIGGER notify_expert_on_rating
  AFTER INSERT ON expert_ratings
  FOR EACH ROW
  EXECUTE FUNCTION notify_expert_rating();