-- Chat reliability: enforce blocks at the database boundary and notify both project parties.
-- No new tables, cron jobs, or realtime subscriptions are introduced.

-- A blocked relationship must be visible to either participant so the UI can
-- accurately disable messaging for the person who was blocked as well.
DROP POLICY IF EXISTS "Participants can view block relationships" ON public.blocked_users;
CREATE POLICY "Participants can view block relationships"
  ON public.blocked_users FOR SELECT
  USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

-- Replace the original insert rule with a reciprocal block check. This is
-- enforced by Postgres even if someone bypasses the React chat interface.
DROP POLICY IF EXISTS "Users can send messages in their chats" ON public.messages;
CREATE POLICY "Users can send messages in unblocked chats"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1
      FROM public.chats c
      WHERE c.id = messages.chat_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        AND NOT EXISTS (
          SELECT 1
          FROM public.blocked_users b
          WHERE (b.blocker_id = auth.uid() AND b.blocked_id =
            CASE WHEN c.user1_id = auth.uid() THEN c.user2_id ELSE c.user1_id END)
             OR (b.blocker_id =
            CASE WHEN c.user1_id = auth.uid() THEN c.user2_id ELSE c.user1_id END
              AND b.blocked_id = auth.uid())
        )
    )
  );

-- Persist an in-app notification whenever a project-completion request is
-- created, and notify the other party whenever a confirmation is recorded.
CREATE OR REPLACE FUNCTION public.notify_project_completion_parties()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient UUID;
  v_actor UUID;
  v_title TEXT;
  v_message TEXT;
  v_event TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_recipient := CASE
      WHEN NEW.initiated_by = NEW.client_id THEN NEW.freelancer_id
      ELSE NEW.client_id
    END;
    v_title := 'Project completion request';
    v_message := COALESCE(NULLIF(NEW.title, ''), 'A project') ||
      ' was submitted for your confirmation.';
    v_event := 'requested';
  ELSIF TG_OP = 'UPDATE' AND (
    NEW.client_confirmed IS DISTINCT FROM OLD.client_confirmed OR
    NEW.freelancer_confirmed IS DISTINCT FROM OLD.freelancer_confirmed
  ) THEN
    v_actor := auth.uid();
    IF NEW.client_confirmed IS DISTINCT FROM OLD.client_confirmed THEN
      v_recipient := NEW.freelancer_id;
    ELSE
      v_recipient := NEW.client_id;
    END IF;

    IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
      v_title := 'Project completed';
      v_message := COALESCE(NULLIF(NEW.title, ''), 'Your project') ||
        ' has been confirmed by both parties.';
      v_event := 'completed';
    ELSE
      v_title := 'Project confirmation received';
      v_message := COALESCE(NULLIF(NEW.title, ''), 'Your project') ||
        ' has received the other party’s confirmation.';
      v_event := 'confirmed';
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  IF v_recipient IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    VALUES (
      v_recipient,
      'project_completion',
      v_title,
      v_message,
      jsonb_build_object(
        'completion_id', NEW.id,
        'event', v_event,
        'other_user_id', COALESCE(v_actor, NEW.initiated_by),
        'url', CASE
          WHEN v_recipient = NEW.client_id THEN '/chat/' || NEW.freelancer_id::text
          ELSE '/chat/' || NEW.client_id::text
        END
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_project_completion_parties ON public.project_completions;
CREATE TRIGGER trg_notify_project_completion_parties
  AFTER INSERT OR UPDATE ON public.project_completions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_project_completion_parties();
