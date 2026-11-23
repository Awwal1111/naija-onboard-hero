-- Apply ONLY after the browser-side callers listed in README.md have been moved
-- to Edge Functions (service role).
REVOKE ALL ON FUNCTION public.increment_wallet_balance(uuid, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_wallet_balance(uuid, numeric) TO service_role;
