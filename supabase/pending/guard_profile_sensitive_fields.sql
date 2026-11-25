-- 1) Prevent browser clients from editing balances, verification, partner,
-- premium, and computed reputation fields directly on their own profile.
CREATE OR REPLACE FUNCTION public.guard_profile_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_is_admin boolean := COALESCE(public.is_admin_user(), false);
BEGIN
  IF current_user IN ('anon','authenticated') AND auth.uid() IS NOT NULL AND NOT v_is_admin THEN
    IF TG_OP = 'INSERT' THEN
      NEW.wallet_balance := 0;
      NEW.balance_withdrawable := 0;
      NEW.balance_non_withdrawable := 0;
      NEW.total_earnings := 0;
      NEW.total_transactions := 0;
      NEW.completed_jobs_count := 0;
      NEW.connections_count := 0;
      NEW.average_rating := 0;
      NEW.rating_count := 0;
      NEW.is_expert := false;
      NEW.expert_verified_at := NULL;
      NEW.email_confirmed := false;
      NEW.email_verified := false;
      NEW.phone_verified := false;
      NEW.face_verified := false;
      NEW.face_verified_at := NULL;
      NEW.business_verified := false;
      NEW.identity_verified := false;
      NEW.identity_verified_at := NULL;
      NEW.verification_status := 'unverified';
      NEW.verification_payment_status := 'not_paid';
      NEW.verification_level := 'none';
      NEW.verification_reviewed_at := NULL;
      NEW.verification_reviewed_by := NULL;
      NEW.is_boosted := false;
      NEW.boost_expires_at := NULL;
      NEW.is_premium := false;
      NEW.premium_expires_at := NULL;
      NEW.premium_subscribed_at := NULL;
      NEW.partner_id := NULL;
      NEW.risk_score := 0;
      NEW.expert_level := 'new';
      NEW.last_celo_balance := 0;
      NEW.last_cusd_balance := 0;
      NEW.last_usdt_balance := 0;
      NEW.current_streak := 0;
      NEW.login_count := 0;
    ELSE
      IF NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance
        OR NEW.balance_withdrawable IS DISTINCT FROM OLD.balance_withdrawable
        OR NEW.balance_non_withdrawable IS DISTINCT FROM OLD.balance_non_withdrawable
        OR NEW.total_earnings IS DISTINCT FROM OLD.total_earnings
        OR NEW.total_transactions IS DISTINCT FROM OLD.total_transactions
        OR NEW.completed_jobs_count IS DISTINCT FROM OLD.completed_jobs_count
        OR NEW.connections_count IS DISTINCT FROM OLD.connections_count
        OR NEW.average_rating IS DISTINCT FROM OLD.average_rating
        OR NEW.rating_count IS DISTINCT FROM OLD.rating_count
        OR NEW.is_expert IS DISTINCT FROM OLD.is_expert
        OR NEW.expert_verified_at IS DISTINCT FROM OLD.expert_verified_at
        OR NEW.email_confirmed IS DISTINCT FROM OLD.email_confirmed
        OR NEW.email_verified IS DISTINCT FROM OLD.email_verified
        OR NEW.phone_verified IS DISTINCT FROM OLD.phone_verified
        OR NEW.face_verified IS DISTINCT FROM OLD.face_verified
        OR NEW.face_verified_at IS DISTINCT FROM OLD.face_verified_at
        OR NEW.business_verified IS DISTINCT FROM OLD.business_verified
        OR NEW.identity_verified IS DISTINCT FROM OLD.identity_verified
        OR NEW.identity_verified_at IS DISTINCT FROM OLD.identity_verified_at
        OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
        OR NEW.verification_payment_status IS DISTINCT FROM OLD.verification_payment_status
        OR NEW.verification_reviewed_at IS DISTINCT FROM OLD.verification_reviewed_at
        OR NEW.verification_reviewed_by IS DISTINCT FROM OLD.verification_reviewed_by
        OR NEW.verification_level IS DISTINCT FROM OLD.verification_level
        OR NEW.is_boosted IS DISTINCT FROM OLD.is_boosted
        OR NEW.boost_expires_at IS DISTINCT FROM OLD.boost_expires_at
        OR NEW.is_premium IS DISTINCT FROM OLD.is_premium
        OR NEW.premium_expires_at IS DISTINCT FROM OLD.premium_expires_at
        OR NEW.premium_subscribed_at IS DISTINCT FROM OLD.premium_subscribed_at
        OR NEW.partner_id IS DISTINCT FROM OLD.partner_id
        OR NEW.risk_score IS DISTINCT FROM OLD.risk_score
        OR NEW.expert_level IS DISTINCT FROM OLD.expert_level
        OR NEW.last_celo_balance IS DISTINCT FROM OLD.last_celo_balance
        OR NEW.last_cusd_balance IS DISTINCT FROM OLD.last_cusd_balance
        OR NEW.last_usdt_balance IS DISTINCT FROM OLD.last_usdt_balance
        OR NEW.current_streak IS DISTINCT FROM OLD.current_streak
        OR NEW.login_count IS DISTINCT FROM OLD.login_count
      THEN
        RAISE EXCEPTION 'Financial, verification, partner, and computed profile fields can only be changed by trusted platform operations'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_sensitive_fields ON public.profiles;
CREATE TRIGGER trg_guard_profile_sensitive_fields
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_sensitive_fields();

