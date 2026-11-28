-- Notification reliability and self-service cleanup.
-- Duplicate trigger cleanup and wallet transition fix were applied to production
-- on 2026-11-28; this file records the exact idempotent migration in Git.
DROP TRIGGER IF EXISTS trg_notify_new_message ON public.messages;
DROP TRIGGER IF EXISTS trg_notify_expert_rating ON public.expert_ratings;

CREATE OR REPLACE FUNCTION public.notify_wallet_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'completed'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.notifications (user_id, type, title, message, metadata)
    VALUES (
      NEW.user_id, 'transaction', 'Wallet Update',
      CASE
        WHEN NEW.kind = 'deposit' THEN 'Deposit of ₦' || ABS(NEW.amount) || 'NC successful'
        WHEN NEW.kind = 'withdrawal' THEN 'Withdrawal of ₦' || ABS(NEW.amount) || 'NC processed'
        WHEN NEW.kind = 'transfer_in' THEN 'Received ₦' || ABS(NEW.amount) || 'NC transfer'
        WHEN NEW.kind = 'transfer_out' THEN 'Sent ₦' || ABS(NEW.amount) || 'NC transfer'
        WHEN NEW.kind LIKE '%_reward' THEN 'Earned ₦' || ABS(NEW.amount) || 'NC reward'
        ELSE 'Transaction of ₦' || ABS(NEW.amount) || 'NC'
      END,
      jsonb_build_object('transaction_id', NEW.id, 'amount', NEW.amount, 'kind', NEW.kind)
    );
  END IF;
  RETURN NEW;
END;
$function$;

DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS notifications_user_read_created_idx
ON public.notifications (user_id, read_at, created_at DESC);
