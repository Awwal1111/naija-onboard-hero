-- Gig orders are created only by place_gig_order(), which debits the buyer.
-- Legacy UI status updates remain supported, but financial/ownership fields and
-- money-moving statuses cannot be edited directly by a browser client.
BEGIN;

REVOKE INSERT ON TABLE public.gig_orders FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.guard_gig_order_client_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF current_user IN ('anon', 'authenticated') AND v_actor IS NOT NULL THEN
    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.gig_id IS DISTINCT FROM OLD.gig_id
      OR NEW.buyer_id IS DISTINCT FROM OLD.buyer_id
      OR NEW.seller_id IS DISTINCT FROM OLD.seller_id
      OR NEW.title IS DISTINCT FROM OLD.title
      OR NEW.description IS DISTINCT FROM OLD.description
      OR NEW.amount IS DISTINCT FROM OLD.amount
      OR NEW.platform_fee IS DISTINCT FROM OLD.platform_fee
      OR NEW.delivery_deadline IS DISTINCT FROM OLD.delivery_deadline
      OR NEW.buyer_notes IS DISTINCT FROM OLD.buyer_notes
      OR NEW.max_revisions IS DISTINCT FROM OLD.max_revisions
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
      OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at
      OR NEW.cancellation_reason IS DISTINCT FROM OLD.cancellation_reason
      OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
    THEN
      RAISE EXCEPTION 'Gig order ownership, price, escrow, and terminal fields require trusted platform operations'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF v_actor = OLD.seller_id THEN
        IF NOT (
          (OLD.status = 'pending' AND NEW.status = 'accepted')
          OR (OLD.status = 'accepted' AND NEW.status = 'in_progress')
          OR (OLD.status IN ('in_progress', 'revision_requested') AND NEW.status = 'delivered')
        ) THEN
          RAISE EXCEPTION 'Invalid seller order status transition'
            USING ERRCODE = '42501';
        END IF;
      ELSIF v_actor = OLD.buyer_id THEN
        IF NOT (OLD.status = 'delivered' AND NEW.status = 'revision_requested') THEN
          RAISE EXCEPTION 'Invalid buyer order status transition'
            USING ERRCODE = '42501';
        END IF;
      ELSE
        RAISE EXCEPTION 'Only an order participant may change order status'
          USING ERRCODE = '42501';
      END IF;
    END IF;

    IF NEW.seller_notes IS DISTINCT FROM OLD.seller_notes
       AND v_actor IS DISTINCT FROM OLD.seller_id THEN
      RAISE EXCEPTION 'Only the seller may update delivery notes'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.revision_count IS DISTINCT FROM OLD.revision_count THEN
      IF v_actor IS DISTINCT FROM OLD.buyer_id
         OR NEW.status <> 'revision_requested'
         OR NEW.revision_count <> COALESCE(OLD.revision_count, 0) + 1
         OR NEW.revision_count > COALESCE(OLD.max_revisions, 0) THEN
        RAISE EXCEPTION 'Invalid revision counter update'
          USING ERRCODE = '42501';
      END IF;
    END IF;

    IF NEW.delivered_at IS DISTINCT FROM OLD.delivered_at
       AND (v_actor IS DISTINCT FROM OLD.seller_id OR NEW.status <> 'delivered') THEN
      RAISE EXCEPTION 'Only the seller may timestamp delivery'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.delivery_files IS DISTINCT FROM OLD.delivery_files
       AND (v_actor IS DISTINCT FROM OLD.seller_id OR NEW.status <> 'delivered') THEN
      RAISE EXCEPTION 'Only the seller may attach delivery files'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_gig_order_client_updates ON public.gig_orders;
CREATE TRIGGER trg_guard_gig_order_client_updates
BEFORE UPDATE ON public.gig_orders
FOR EACH ROW EXECUTE FUNCTION public.guard_gig_order_client_updates();

COMMIT;
