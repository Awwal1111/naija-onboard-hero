-- Enable realtime for messages and chats tables
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.chats REPLICA IDENTITY FULL;

-- Add messages and chats to supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;

-- Fix any missing triggers for chat updates
DROP TRIGGER IF EXISTS update_chats_updated_at ON public.chats;
CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON public.chats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Fix any missing triggers for messages to update chat timestamp
DROP TRIGGER IF EXISTS update_chat_on_message ON public.messages;
CREATE TRIGGER update_chat_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_on_new_message();