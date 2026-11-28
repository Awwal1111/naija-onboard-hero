-- Keep the denormalized group member count accurate without adding tables,
-- scheduled jobs, Edge Functions, or additional realtime channels.
CREATE OR REPLACE FUNCTION public.update_group_member_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  affected_group_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected_group_id := OLD.group_id;
  ELSE
    affected_group_id := NEW.group_id;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.group_id IS DISTINCT FROM NEW.group_id THEN
    UPDATE public.groups
    SET member_count = (
      SELECT count(*)::integer
      FROM public.group_members
      WHERE group_id = OLD.group_id
        AND is_active = true
    )
    WHERE id = OLD.group_id;
  END IF;

  UPDATE public.groups
  SET member_count = (
    SELECT count(*)::integer
    FROM public.group_members
    WHERE group_id = affected_group_id
      AND is_active = true
  )
  WHERE id = affected_group_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Repair historical drift (including inactive rows that older trigger logic
-- could accidentally count).
UPDATE public.groups AS g
SET member_count = (
  SELECT count(*)::integer
  FROM public.group_members AS gm
  WHERE gm.group_id = g.id
    AND gm.is_active = true
);
