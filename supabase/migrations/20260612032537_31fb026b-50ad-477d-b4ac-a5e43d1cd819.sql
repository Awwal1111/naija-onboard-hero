
-- 1) Fix accept_chat_intro: use 'metadata' instead of 'data'
CREATE OR REPLACE FUNCTION public.accept_chat_intro(p_intro_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_intro RECORD;
  v_chat_id UUID;
  v_u1 UUID;
  v_u2 UUID;
  v_recipient_name TEXT;
  supabase_url TEXT := 'https://jxybqmquymxkvxxpiuhv.supabase.co';
  anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4eWJxbXF1eW14a3Z4eHBpdWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NTg2NTAsImV4cCI6MjA3MjEzNDY1MH0.muLG6PAzyEllY7WHbz_SnUCvwhISPqqaQn0L-kP0VdA';
BEGIN
  SELECT * INTO v_intro FROM public.chat_intro_requests WHERE id = p_intro_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Intro not found'; END IF;
  IF v_intro.recipient_id <> auth.uid() THEN RAISE EXCEPTION 'Only the recipient can accept'; END IF;
  IF v_intro.status <> 'pending' THEN RAISE EXCEPTION 'Intro already %', v_intro.status; END IF;

  IF v_intro.sender_id < v_intro.recipient_id THEN
    v_u1 := v_intro.sender_id; v_u2 := v_intro.recipient_id;
  ELSE
    v_u1 := v_intro.recipient_id; v_u2 := v_intro.sender_id;
  END IF;

  SELECT id INTO v_chat_id FROM public.chats WHERE user1_id = v_u1 AND user2_id = v_u2;
  IF v_chat_id IS NULL THEN
    INSERT INTO public.chats (user1_id, user2_id) VALUES (v_u1, v_u2) RETURNING id INTO v_chat_id;
  END IF;

  INSERT INTO public.messages (chat_id, sender_id, content)
  VALUES (v_chat_id, v_intro.sender_id, v_intro.message);

  UPDATE public.chat_intro_requests
  SET status = 'accepted', responded_at = NOW(), updated_at = NOW()
  WHERE id = p_intro_id;

  SELECT full_name INTO v_recipient_name FROM public.profiles WHERE user_id = v_intro.recipient_id;

  -- In-app notification to sender (use 'metadata', not 'data')
  INSERT INTO public.notifications (user_id, type, title, message, metadata)
  VALUES (
    v_intro.sender_id,
    'intro_accepted',
    'Introduction accepted',
    COALESCE(v_recipient_name, 'They') || ' accepted your introduction. You can now chat.',
    jsonb_build_object('chat_id', v_chat_id, 'other_user_id', v_intro.recipient_id)
  );

  -- Telegram notification to sender (non-blocking)
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-telegram-notification',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || anon_key),
    body := jsonb_build_object(
      'user_id', v_intro.sender_id::text,
      'message', '✅ *Introduction Accepted!*' || E'\n\n' ||
                 COALESCE(v_recipient_name, 'Someone') || ' accepted your introduction. You can now start chatting.' ||
                 E'\n\nOpen the app to send a message 💬'
    )
  );

  RETURN v_chat_id;
END;
$function$;

-- 2) New trigger: notify recipient when an intro is sent
CREATE OR REPLACE FUNCTION public.notify_new_chat_intro()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sender_name TEXT;
  supabase_url TEXT := 'https://jxybqmquymxkvxxpiuhv.supabase.co';
  anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4eWJxbXF1eW14a3Z4eHBpdWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NTg2NTAsImV4cCI6MjA3MjEzNDY1MH0.muLG6PAzyEllY7WHbz_SnUCvwhISPqqaQn0L-kP0VdA';
BEGIN
  IF NEW.status <> 'pending' THEN RETURN NEW; END IF;

  SELECT full_name INTO v_sender_name FROM public.profiles WHERE user_id = NEW.sender_id;

  INSERT INTO public.notifications (user_id, type, title, message, metadata)
  VALUES (
    NEW.recipient_id,
    'intro_request',
    'New introduction request',
    COALESCE(v_sender_name, 'Someone') || ' wants to chat with you.',
    jsonb_build_object('intro_id', NEW.id, 'sender_id', NEW.sender_id)
  );

  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-telegram-notification',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || anon_key),
    body := jsonb_build_object(
      'user_id', NEW.recipient_id::text,
      'message', '🤝 *New Introduction Request*' || E'\n\n' ||
                 '*' || COALESCE(v_sender_name, 'Someone') || '* wants to chat with you:' || E'\n\n' ||
                 '"' || LEFT(NEW.message, 200) || '"' || E'\n\nOpen the app to accept or decline.'
    )
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_new_chat_intro ON public.chat_intro_requests;
CREATE TRIGGER trg_notify_new_chat_intro
AFTER INSERT ON public.chat_intro_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_new_chat_intro();
