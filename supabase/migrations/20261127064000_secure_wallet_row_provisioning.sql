-- A client may provision only its own zero-balance internal wallet row.
-- Service-role jobs and the profile trigger remain able to provision rows.
BEGIN;

CREATE OR REPLACE FUNCTION public.ensure_user_wallet_row(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'User id is required';
  END IF;

  IF auth.uid() IS DISTINCT FROM _user_id
     AND COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Not authorized to provision another user wallet'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.user_wallets(user_id, balance, escrow_hold)
  VALUES (_user_id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
END;
$function$;

REVOKE ALL ON FUNCTION public.ensure_user_wallet_row(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_user_wallet_row(uuid) TO authenticated, service_role;

COMMIT;
