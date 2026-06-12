CREATE OR REPLACE FUNCTION public.ensure_user_wallet_row(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_wallets (user_id, balance, escrow_hold)
  VALUES (_user_id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_profile_wallet_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_user_wallet_row(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_ensure_user_wallet_row ON public.profiles;
CREATE TRIGGER trg_profiles_ensure_user_wallet_row
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_profile_wallet_row();

INSERT INTO public.user_wallets (user_id, balance, escrow_hold)
SELECT p.user_id, 0, 0
FROM public.profiles p
LEFT JOIN public.user_wallets uw ON uw.user_id = p.user_id
WHERE uw.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;