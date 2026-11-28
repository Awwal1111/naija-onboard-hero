-- This broad profile aggregation has no application call sites and exposes
-- contact/wallet/referral fields. Public profile pages use narrower RPCs.
REVOKE ALL ON FUNCTION public.get_public_profiles(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO service_role;
