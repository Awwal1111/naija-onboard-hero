-- Retire the removed fundraising API while retaining historical records,
-- and prevent anonymous/client callers from running scheduled task payouts.
BEGIN;

REVOKE ALL PRIVILEGES ON TABLE
  public.fundraisings,
  public.fundraising_contributions,
  public.fundraising_updates
FROM PUBLIC, anon, authenticated;

DO $$
DECLARE fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname ILIKE '%fundrais%'
      AND p.prokind = 'f'
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      fn.signature
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_approve_user_task_submissions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_approve_user_task_submissions() TO service_role;

COMMIT;
