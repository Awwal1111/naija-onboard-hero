-- Create function to update connections_count in profiles
CREATE OR REPLACE FUNCTION public.update_connections_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment count for both users
    UPDATE public.profiles 
    SET connections_count = connections_count + 1 
    WHERE user_id = NEW.user1_id OR user_id = NEW.user2_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement count for both users
    UPDATE public.profiles 
    SET connections_count = GREATEST(0, connections_count - 1)
    WHERE user_id = OLD.user1_id OR user_id = OLD.user2_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_profiles_connections_count ON public.connections;

-- Create trigger to update connections_count when connections change
CREATE TRIGGER update_profiles_connections_count
AFTER INSERT OR DELETE ON public.connections
FOR EACH ROW
EXECUTE FUNCTION public.update_connections_count();