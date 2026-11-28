-- STAGED SECURITY REMEDIATION — REVIEW BEFORE APPLYING
-- This file is intentionally under supabase/pending and is NOT a migration.
-- It has NOT been executed against production.
-- Apply only after validating application flows and testing in a staging project.

BEGIN;

-- 1) Stop browser clients from writing escrow rows directly. Trusted Edge
-- Functions use service_role and are unaffected.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.escrow_payments FROM PUBLIC, anon, authenticated;

-- 2) SafePay must use its validated RPCs; direct row creation/editing bypasses
-- the wallet hold and release invariants.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.safepay_transactions FROM PUBLIC, anon, authenticated;

-- 3) Gig order creation must use place_gig_order(), which performs the wallet
-- debit. UPDATE remains temporarily enabled because the current UI uses it for
-- non-financial order workflow states; protect the financial columns separately
-- before removing direct UPDATE.
REVOKE INSERT ON TABLE public.gig_orders FROM PUBLIC, anon, authenticated;

-- 4) The legacy wallets table is written by trusted server-side functions.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.wallets FROM PUBLIC, anon, authenticated;

-- 5) Remove the unauthenticated public profile dump RPC. The app source audit
-- found no caller; keep service_role access for trusted maintenance only.
REVOKE EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO service_role;

-- 6) Protect privilege and deposit-baseline fields from direct browser edits.
-- Wallet debit flows are deliberately NOT blocked here; ExpertVerification
-- currently performs browser-side profile and wallet_transactions writes and
-- must be migrated to a secure RPC before balance guards or this trigger are applied.
-- The additional verification fields below also require migrating the current
-- ExpertVerification submit/payment mutations to trusted RPCs first.
CREATE OR REPLACE FUNCTION public.guard_profile_privilege_and_deposit_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_is_admin boolean := COALESCE(public.is_admin_user(), false);
BEGIN
  IF current_user IN ('anon', 'authenticated')
     AND auth.uid() IS NOT NULL
     AND NOT v_is_admin
     AND TG_OP = 'UPDATE'
  THEN
    IF NEW.is_expert IS DISTINCT FROM OLD.is_expert
      OR NEW.expert_verified_at IS DISTINCT FROM OLD.expert_verified_at
      OR NEW.is_premium IS DISTINCT FROM OLD.is_premium
      OR NEW.premium_expires_at IS DISTINCT FROM OLD.premium_expires_at
      OR NEW.is_boosted IS DISTINCT FROM OLD.is_boosted
      OR NEW.boost_expires_at IS DISTINCT FROM OLD.boost_expires_at
      OR NEW.business_verified IS DISTINCT FROM OLD.business_verified
      OR NEW.email_verified IS DISTINCT FROM OLD.email_verified
      OR NEW.phone_verified IS DISTINCT FROM OLD.phone_verified
      OR NEW.face_verified IS DISTINCT FROM OLD.face_verified
      OR NEW.identity_verified IS DISTINCT FROM OLD.identity_verified
      OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
      OR NEW.verification_payment_status IS DISTINCT FROM OLD.verification_payment_status
      OR NEW.verification_level IS DISTINCT FROM OLD.verification_level
      OR NEW.verification_reviewed_at IS DISTINCT FROM OLD.verification_reviewed_at
      OR NEW.verification_reviewed_by IS DISTINCT FROM OLD.verification_reviewed_by
      OR NEW.verification_submitted_at IS DISTINCT FROM OLD.verification_submitted_at
      OR NEW.email_confirmed IS DISTINCT FROM OLD.email_confirmed
      OR NEW.face_verified_at IS DISTINCT FROM OLD.face_verified_at
      OR NEW.identity_verified_at IS DISTINCT FROM OLD.identity_verified_at
      OR NEW.expert_level IS DISTINCT FROM OLD.expert_level
      OR NEW.partner_id IS DISTINCT FROM OLD.partner_id
      OR NEW.connections_count IS DISTINCT FROM OLD.connections_count
      OR NEW.completed_jobs_count IS DISTINCT FROM OLD.completed_jobs_count
      OR NEW.average_rating IS DISTINCT FROM OLD.average_rating
      OR NEW.rating_count IS DISTINCT FROM OLD.rating_count
      OR NEW.total_earnings IS DISTINCT FROM OLD.total_earnings
      OR NEW.total_transactions IS DISTINCT FROM OLD.total_transactions
      OR NEW.premium_subscribed_at IS DISTINCT FROM OLD.premium_subscribed_at
      OR NEW.risk_score IS DISTINCT FROM OLD.risk_score
      OR NEW.last_cusd_balance IS DISTINCT FROM OLD.last_cusd_balance
      OR NEW.last_usdt_balance IS DISTINCT FROM OLD.last_usdt_balance
      OR NEW.last_celo_balance IS DISTINCT FROM OLD.last_celo_balance
    THEN
      RAISE EXCEPTION 'Verification, privilege, risk, and deposit checkpoint fields require trusted platform operations'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_privilege_and_deposit_fields ON public.profiles;
CREATE TRIGGER trg_guard_profile_privilege_and_deposit_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privilege_and_deposit_fields();

COMMIT;

-- NOT YET INCLUDED (requires application refactor and dedicated tests):
-- * SafePay release RPC must verify actual held funds and immutable amount.
-- * Gig order status updates need a secure transition RPC; completion must
--   verify a funded escrow hold before crediting the seller.
-- * connections INSERT must require a pending request accepted by the recipient.
-- * profiles SELECT must be redesigned around a safe public projection/RPC;
--   dropping the current broad SELECT policy without replacing its callers
--   would break profile discovery and other app features.
-- * user_wallets and wallet_transactions need writer-by-writer migration.
