
-- 1. Create the trigger that was NEVER attached to the messages table
-- This is why Telegram + Email notifications never fired on new messages
DROP TRIGGER IF EXISTS on_new_message_notify ON public.messages;

CREATE TRIGGER on_new_message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();

-- 2. Create a trigger to send welcome email on new user profile creation
-- This fires the send-notification edge function with 'welcome' template
CREATE OR REPLACE FUNCTION public.send_welcome_on_profile_create()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url TEXT := 'https://jxybqmquymxkvxxpiuhv.supabase.co';
  anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4eWJxbXF1eW14a3Z4eHBpdWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NTg2NTAsImV4cCI6MjA3MjEzNDY1MH0.muLG6PAzyEllY7WHbz_SnUCvwhISPqqaQn0L-kP0VdA';
BEGIN
  -- Send welcome email via the send-notification edge function
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := jsonb_build_object(
      'userId', NEW.user_id::text,
      'type', 'welcome',
      'title', 'Welcome to NaijaLancers! 🎉',
      'message', 'Welcome to NaijaLancers, ' || COALESCE(NEW.full_name, 'there') || '! Start exploring opportunities.',
      'sendEmail', true,
      'emailTemplate', 'welcome',
      'metadata', jsonb_build_object(
        'signupBonus', 500
      )
    )
  );

  -- Also send Telegram welcome if they link later (via send-welcome-notification)
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-welcome-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := '{}'::jsonb
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_welcome ON public.profiles;

CREATE TRIGGER on_profile_created_welcome
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.send_welcome_on_profile_create();
