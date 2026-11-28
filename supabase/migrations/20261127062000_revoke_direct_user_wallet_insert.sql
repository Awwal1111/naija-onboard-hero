-- Browser clients may read their internal wallet but cannot create rows with
-- attacker-chosen balance or escrow_hold values. Provisioning is done by the
-- profile trigger or the authenticated ensure_user_wallet_row RPC.
BEGIN;
REVOKE INSERT ON TABLE public.user_wallets FROM PUBLIC, anon, authenticated;
COMMIT;