-- Make connection creation depend on an accepted request.
-- Clients may request a connection, but cannot directly create connections or
-- rewrite request ownership/status to manufacture an accepted relationship.
BEGIN;

CREATE OR REPLACE FUNCTION public.send_connection_request(p_target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_request_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;
  IF p_target_user_id IS NULL OR p_target_user_id = v_actor THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid connection target');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_target_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.connections
    WHERE (user1_id = v_actor AND user2_id = p_target_user_id)
       OR (user1_id = p_target_user_id AND user2_id = v_actor)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already connected');
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.connection_requests
    WHERE status = 'pending'
      AND ((requester_id = v_actor AND requested_id = p_target_user_id)
        OR (requester_id = p_target_user_id AND requested_id = v_actor))
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'A pending request already exists');
  END IF;

  INSERT INTO public.connection_requests(requester_id, requested_id, status)
  VALUES (v_actor, p_target_user_id, 'pending')
  ON CONFLICT (requester_id, requested_id)
  DO UPDATE SET status = 'pending', updated_at = now()
  WHERE public.connection_requests.status = 'declined'
  RETURNING id INTO v_request_id;

  IF v_request_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'A connection request already exists');
  END IF;

  RETURN jsonb_build_object('success', true, 'request_id', v_request_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.respond_to_connection_request(
  p_request_id uuid,
  p_accept boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_request public.connection_requests%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;
  IF p_request_id IS NULL OR p_accept IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid request');
  END IF;

  SELECT * INTO v_request
  FROM public.connection_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;
  IF v_request.requested_id IS DISTINCT FROM v_actor THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the invited user can respond');
  END IF;
  IF v_request.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request is no longer pending');
  END IF;

  IF p_accept THEN
    INSERT INTO public.connections(user1_id, user2_id, status)
    VALUES (v_request.requester_id, v_request.requested_id, 'connected')
    ON CONFLICT DO NOTHING;
    UPDATE public.connection_requests
    SET status = 'accepted', updated_at = now()
    WHERE id = p_request_id;
  ELSE
    UPDATE public.connection_requests
    SET status = 'declined', updated_at = now()
    WHERE id = p_request_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'accepted', p_accept,
    'requester_id', v_request.requester_id,
    'requested_id', v_request.requested_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.send_connection_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_connection_request(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.respond_to_connection_request(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_connection_request(uuid, boolean) TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.connections FROM PUBLIC, anon, authenticated;
REVOKE UPDATE ON TABLE public.connection_requests FROM PUBLIC, anon, authenticated;

COMMIT;
