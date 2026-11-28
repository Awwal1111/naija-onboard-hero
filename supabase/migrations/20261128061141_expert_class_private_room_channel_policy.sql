-- Private class-room signalling channel (applied to production 2026-11-28).
-- Only the host and active participants of a LIVE class can send/receive on
-- the Realtime topic "classroom-<class id>". Requires the client to open the
-- channel with { config: { private: true } }.

CREATE OR REPLACE FUNCTION public.can_access_class_room(p_topic text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_id uuid;
  m text[];
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  m := regexp_match(p_topic, '^classroom-([0-9a-fA-F-]{36})$');
  IF m IS NULL THEN RETURN false; END IF;
  v_id := m[1]::uuid;
  RETURN EXISTS (
    SELECT 1 FROM public.expert_classes c
    WHERE c.id = v_id
      AND c.status = 'live'
      AND (
        c.expert_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.class_participants p
                   WHERE p.class_id = c.id AND p.user_id = auth.uid() AND p.is_active)
      )
  );
END; $$;
REVOKE ALL ON FUNCTION public.can_access_class_room(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_class_room(text) TO authenticated;

DROP POLICY IF EXISTS "class room members can receive" ON realtime.messages;
CREATE POLICY "class room members can receive" ON realtime.messages
FOR SELECT TO authenticated
USING (realtime.topic() LIKE 'classroom-%' AND public.can_access_class_room(realtime.topic()));

DROP POLICY IF EXISTS "class room members can send" ON realtime.messages;
CREATE POLICY "class room members can send" ON realtime.messages
FOR INSERT TO authenticated
WITH CHECK (realtime.topic() LIKE 'classroom-%' AND public.can_access_class_room(realtime.topic()));
