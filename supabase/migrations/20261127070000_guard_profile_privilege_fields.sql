-- Protect profile privilege, trust, and computed fields without blocking the
-- current self-service verification submission/payment-status UI.
BEGIN;

CREATE OR REPLACE FUNCTION public.guard_profile_privilege_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
  v_is_admin boolean := COALESCE(public.is_admin_user(), false);
BEGIN
  IF current_user IN ('anon', 'authenticated')
     AND auth.uid() IS NOT NULL
     AND NOT v_is_admin
  THEN
    IF TG_OP = 'INSERT' THEN
      IF COALESCE(NEW.is_expert, false)
        OR NEW.expert_verified_at IS NOT NULL
        OR COALESCE(NEW.is_premium, false)
        OR NEW.premium_expires_at IS NOT NULL
        OR COALESCE(NEW.is_boosted, false)
        OR NEW.boost_expires_at IS NOT NULL
        OR COALESCE(NEW.business_verified, false)
        OR COALESCE(NEW.email_verified, false)
        OR COALESCE(NEW.email_confirmed, false)
        OR COALESCE(NEW.phone_verified, false)
        OR COALESCE(NEW.face_verified, false)
        OR NEW.face_verified_at IS NOT NULL
        OR COALESCE(NEW.identity_verified, false)
        OR NEW.identity_verified_at IS NOT NULL
        OR COALESCE(NEW.verification_level, 'none') <> 'none'
        OR NEW.verification_reviewed_at IS NOT NULL
        OR NEW.verification_reviewed_by IS NOT NULL
        OR COALESCE(NEW.expert_level, 'new') <> 'new'
        OR NEW.partner_id IS NOT NULL
        OR COALESCE(NEW.connections_count, 0) <> 0
        OR COALESCE(NEW.completed_jobs_count, 0) <> 0
        OR COALESCE(NEW.average_rating, 0) <> 0
        OR COALESCE(NEW.rating_count, 0) <> 0
        OR COALESCE(NEW.total_earnings, 0) <> 0
        OR COALESCE(NEW.total_transactions, 0) <> 0
        OR NEW.premium_subscribed_at IS NOT NULL
        OR COALESCE(NEW.risk_score, 0) <> 0
        OR COALESCE(NEW.last_celo_balance, 0) <> 0
        OR COALESCE(NEW.last_cusd_balance, 0) <> 0
        OR COALESCE(NEW.last_usdt_balance, 0) <> 0
      THEN
        RAISE EXCEPTION 'Privilege, trust, and computed profile fields require trusted platform operations'
          USING ERRCODE = '42501';
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.is_expert IS DISTINCT FROM OLD.is_expert
        OR NEW.expert_verified_at IS DISTINCT FROM OLD.expert_verified_at
        OR NEW.is_premium IS DISTINCT FROM OLD.is_premium
        OR NEW.premium_expires_at IS DISTINCT FROM OLD.premium_expires_at
        OR NEW.is_boosted IS DISTINCT FROM OLD.is_boosted
        OR NEW.boost_expires_at IS DISTINCT FROM OLD.boost_expires_at
        OR NEW.business_verified IS DISTINCT FROM OLD.business_verified
        OR NEW.email_verified IS DISTINCT FROM OLD.email_verified
        OR NEW.email_confirmed IS DISTINCT FROM OLD.email_confirmed
        OR NEW.phone_verified IS DISTINCT FROM OLD.phone_verified
        OR NEW.face_verified IS DISTINCT FROM OLD.face_verified
        OR NEW.face_verified_at IS DISTINCT FROM OLD.face_verified_at
        OR NEW.identity_verified IS DISTINCT FROM OLD.identity_verified
        OR NEW.identity_verified_at IS DISTINCT FROM OLD.identity_verified_at
        OR NEW.verification_level IS DISTINCT FROM OLD.verification_level
        OR NEW.verification_reviewed_at IS DISTINCT FROM OLD.verification_reviewed_at
        OR NEW.verification_reviewed_by IS DISTINCT FROM OLD.verification_reviewed_by
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
        OR NEW.last_celo_balance IS DISTINCT FROM OLD.last_celo_balance
        OR NEW.last_cusd_balance IS DISTINCT FROM OLD.last_cusd_balance
        OR NEW.last_usdt_balance IS DISTINCT FROM OLD.last_usdt_balance
      THEN
        RAISE EXCEPTION 'Privilege, trust, and computed profile fields require trusted platform operations'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_profile_privilege_fields ON public.profiles;
CREATE TRIGGER trg_guard_profile_privilege_fields
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privilege_fields();

COMMIT;
