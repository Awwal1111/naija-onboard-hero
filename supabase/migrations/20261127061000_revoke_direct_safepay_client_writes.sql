-- SafePay rows are created and transitioned only through validated RPCs.
-- The client UI reads these rows and calls propose/accept/complete/release RPCs;
-- direct browser DML would bypass escrow and status invariants.
BEGIN;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.safepay_transactions FROM PUBLIC, anon, authenticated;
COMMIT;
