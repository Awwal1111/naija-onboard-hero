-- Enable realtime for messages table
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Add the messages table to the realtime publication if not already added
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION
    WHEN duplicate_object THEN
      -- Table already in publication, do nothing
      NULL;
  END;
END $$;

-- Ensure chats table is also in realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
  EXCEPTION
    WHEN duplicate_object THEN
      -- Table already in publication, do nothing
      NULL;
  END;
END $$;