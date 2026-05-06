
-- Fix the notify_new_message function to also send Telegram and email notifications
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_id UUID;
  sender_name TEXT;
  msg_preview TEXT;
  supabase_url TEXT := 'https://your-project-ref.supabase.co';
  anon_key TEXT := 'your-public-anon-key';
BEGIN
  -- Get recipient ID
  SELECT CASE 
    WHEN user1_id = NEW.sender_id THEN user2_id
    ELSE user1_id
  END INTO recipient_id
  FROM chats WHERE id = NEW.chat_id;

  -- Get sender name
  SELECT full_name INTO sender_name
  FROM profiles WHERE user_id = NEW.sender_id;

  msg_preview := LEFT(COALESCE(NEW.content, ''), 100);

  -- Insert in-app notification
  INSERT INTO notifications (user_id, type, title, message, metadata)
  VALUES (
    recipient_id,
    'message',
    'New Message',
    COALESCE(sender_name, 'Someone') || ' sent you a message',
    jsonb_build_object('chat_id', NEW.chat_id, 'message_id', NEW.id, 'sender_id', NEW.sender_id)
  );

  -- Send Telegram notification via edge function (non-blocking via pg_net)
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-telegram-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := jsonb_build_object(
      'user_id', recipient_id::text,
      'message', '💬 *New Message from ' || COALESCE(sender_name, 'Someone') || '*' || E'\n\n' || 
                 CASE WHEN LENGTH(msg_preview) > 0 THEN '"' || msg_preview || '"' ELSE '(media)' END || 
                 E'\n\nOpen the app to reply 📱'
    )
  );

  -- Send email notification via edge function (non-blocking via pg_net)
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := jsonb_build_object(
      'userId', recipient_id::text,
      'type', 'message',
      'title', 'New Message from ' || COALESCE(sender_name, 'Someone'),
      'message', COALESCE(sender_name, 'Someone') || ' sent you a message: "' || msg_preview || '"',
      'sendEmail', true,
      'emailTemplate', 'general',
      'metadata', jsonb_build_object(
        'actionUrl', 'https://naijalancers.name.ng/chat/' || NEW.sender_id,
        'actionText', 'Reply Now'
      )
    )
  );

  RETURN NEW;
END;
$$;
