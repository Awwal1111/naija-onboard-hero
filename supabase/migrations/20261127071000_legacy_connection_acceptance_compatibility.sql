-- Temporary compatibility for the already-deployed UI while its branch build
-- is blocked: recipients may accept only a real pending request. No requester
-- can manufacture a connection, and request ownership cannot be rewritten.
BEGIN;

GRANT INSERT ON TABLE public.connections TO authenticated;
DROP POLICY IF EXISTS "Recipient may accept a pending connection request" ON public.connections;
CREATE POLICY "Recipient may accept a pending connection request"
ON public.connections
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user2_id
  AND status = 'connected'
  AND EXISTS (
    SELECT 1
    FROM public.connection_requests cr
    WHERE cr.requester_id = user1_id
      AND cr.requested_id = user2_id
      AND cr.status = 'pending'
  )
);

GRANT UPDATE ON TABLE public.connection_requests TO authenticated;
DROP POLICY IF EXISTS "Invited user may respond to pending request" ON public.connection_requests;
CREATE POLICY "Invited user may respond to pending request"
ON public.connection_requests
FOR UPDATE TO authenticated
USING (auth.uid() = requested_id AND status = 'pending')
WITH CHECK (auth.uid() = requested_id);

CREATE OR REPLACE FUNCTION public.guard_connection_request_response()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF auth.uid() IS DISTINCT FROM OLD.requested_id
       OR NEW.requester_id IS DISTINCT FROM OLD.requester_id
       OR NEW.requested_id IS DISTINCT FROM OLD.requested_id
       OR OLD.status <> 'pending' THEN
      RAISE EXCEPTION 'Only the invited user may respond to a pending connection request'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.status = 'rejected' THEN
      NEW.status := 'declined';
    END IF;

    IF NEW.status NOT IN ('accepted', 'declined') THEN
      RAISE EXCEPTION 'Invalid connection request response'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.status = 'accepted' AND NOT EXISTS (
      SELECT 1 FROM public.connections c
      WHERE c.user1_id = OLD.requester_id
        AND c.user2_id = OLD.requested_id
    ) THEN
      RAISE EXCEPTION 'A connection can only be accepted after the matching connection is created'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_connection_request_response ON public.connection_requests;
CREATE TRIGGER trg_guard_connection_request_response
BEFORE UPDATE ON public.connection_requests
FOR EACH ROW EXECUTE FUNCTION public.guard_connection_request_response();

COMMIT;
