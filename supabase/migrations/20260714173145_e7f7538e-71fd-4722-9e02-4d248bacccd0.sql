
-- 1. developer_charge_sessions
DROP POLICY IF EXISTS "Payer or anyone signed-in can read by session_id" ON public.developer_charge_sessions;
CREATE POLICY "Payer or developer reads charge session"
  ON public.developer_charge_sessions
  FOR SELECT TO authenticated
  USING (payer_user_id = auth.uid() OR developer_id = auth.uid());

-- 2. developer_ramp_sessions
DROP POLICY IF EXISTS "End users can view active sessions for completion" ON public.developer_ramp_sessions;
CREATE POLICY "Ramp session parties can view"
  ON public.developer_ramp_sessions
  FOR SELECT TO authenticated
  USING (
    developer_id = auth.uid()
    OR naijalancers_user_id = auth.uid()
    OR (external_user_id IS NOT NULL AND external_user_id = (auth.jwt() ->> 'external_user_id'))
  );

-- 3. escrow_payments trigger + policy
CREATE OR REPLACE FUNCTION public.prevent_escrow_ownership_change()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NEW.client_id IS DISTINCT FROM OLD.client_id
     OR NEW.expert_id IS DISTINCT FROM OLD.expert_id THEN
    RAISE EXCEPTION 'Cannot change escrow client_id or expert_id after creation';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_prevent_escrow_ownership_change ON public.escrow_payments;
CREATE TRIGGER trg_prevent_escrow_ownership_change
  BEFORE UPDATE ON public.escrow_payments
  FOR EACH ROW EXECUTE FUNCTION public.prevent_escrow_ownership_change();

DROP POLICY IF EXISTS "Escrow UPDATE owner or admin" ON public.escrow_payments;
CREATE POLICY "Escrow UPDATE owner or admin"
  ON public.escrow_payments
  FOR UPDATE TO authenticated
  USING (
    client_id = (SELECT auth.uid())
    OR expert_id = (SELECT auth.uid())
    OR (auth.jwt() ->> 'user_role') = 'admin'
  )
  WITH CHECK (
    client_id = (SELECT auth.uid())
    OR expert_id = (SELECT auth.uid())
    OR (auth.jwt() ->> 'user_role') = 'admin'
  );

-- 4. expert_ratings trigger + policy
CREATE OR REPLACE FUNCTION public.prevent_rating_ownership_change()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NEW.expert_id IS DISTINCT FROM OLD.expert_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Cannot change expert_id or user_id on an expert rating';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_prevent_rating_ownership ON public.expert_ratings;
CREATE TRIGGER trg_prevent_rating_ownership
  BEFORE UPDATE ON public.expert_ratings
  FOR EACH ROW EXECUTE FUNCTION public.prevent_rating_ownership_change();

DROP POLICY IF EXISTS "expert_ratings_update_own_24h" ON public.expert_ratings;
CREATE POLICY "expert_ratings_update_own_24h"
  ON public.expert_ratings
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND created_at > (now() - interval '24 hours'))
  WITH CHECK (user_id = auth.uid() AND created_at > (now() - interval '24 hours'));

-- 5. notifications
DROP POLICY IF EXISTS "notifications_authenticated_insert_v2" ON public.notifications;

-- 6. payment_requests
DROP POLICY IF EXISTS "Anyone can view payment requests by short code" ON public.payment_requests;
CREATE POLICY "Creators view their payment requests"
  ON public.payment_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = creator_user_id);

CREATE OR REPLACE FUNCTION public.get_payment_request_by_short_code(_short_code text)
RETURNS TABLE (
  id uuid, creator_user_id uuid, short_code text, amount numeric,
  note text, status text, expires_at timestamptz, paid_at timestamptz, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, creator_user_id, short_code, amount, note, status, expires_at, paid_at, created_at
  FROM public.payment_requests WHERE short_code = _short_code LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_payment_request_by_short_code(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_payment_request_by_short_code(text) TO anon, authenticated;

-- 7. profiles
DROP POLICY IF EXISTS "Wallet lookup by address" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users view profiles" ON public.profiles;

CREATE POLICY "Authenticated users view profiles (non-sensitive)"
  ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

REVOKE SELECT (wallet_balance, balance_withdrawable, phone_number, whatsapp_number, celo_wallet_address)
  ON public.profiles FROM authenticated;
REVOKE SELECT (wallet_balance, balance_withdrawable, phone_number, whatsapp_number, celo_wallet_address)
  ON public.profiles FROM anon;

CREATE OR REPLACE FUNCTION public.get_my_financial_profile()
RETURNS TABLE (
  wallet_balance numeric, balance_withdrawable numeric,
  phone_number text, whatsapp_number text, celo_wallet_address text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT wallet_balance, balance_withdrawable, phone_number, whatsapp_number, celo_wallet_address
  FROM public.profiles WHERE user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.get_my_financial_profile() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_financial_profile() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_lookup_profile_by_wallet(_wallet text)
RETURNS TABLE (user_id uuid, celo_wallet_address text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id, celo_wallet_address
  FROM public.profiles
  WHERE celo_wallet_address IS NOT NULL AND celo_wallet_address = _wallet
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.admin_lookup_profile_by_wallet(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_lookup_profile_by_wallet(text) TO service_role;

-- 8. support_tickets
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.support_tickets;
CREATE POLICY "Users view own tickets or admins view all"
  ON public.support_tickets
  FOR SELECT TO authenticated
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR public.is_admin_user()
  );

-- 9. wallet_transactions
DROP POLICY IF EXISTS "Transfer function can insert wallet transactions" ON public.wallet_transactions;

-- 10. workrooms & workroom_members
DROP POLICY IF EXISTS "WorkRoom members view" ON public.workrooms;
DROP POLICY IF EXISTS "Owners view own workrooms" ON public.workrooms;
DROP POLICY IF EXISTS "Owners update workrooms" ON public.workrooms;
DROP POLICY IF EXISTS "Users create workrooms" ON public.workrooms;

CREATE POLICY "Owners view own workrooms"
  ON public.workrooms FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Members view their workrooms"
  ON public.workrooms FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workroom_members wm
    WHERE wm.workroom_id = workrooms.id AND wm.user_id = auth.uid()
  ));

CREATE POLICY "Owners update workrooms"
  ON public.workrooms FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users create workrooms"
  ON public.workrooms FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "View workroom members" ON public.workroom_members;
DROP POLICY IF EXISTS "Members view own membership" ON public.workroom_members;
DROP POLICY IF EXISTS "Owners manage members" ON public.workroom_members;
DROP POLICY IF EXISTS "Users join workrooms" ON public.workroom_members;

CREATE POLICY "Members view membership rows of their workrooms"
  ON public.workroom_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.workrooms w
               WHERE w.id = workroom_members.workroom_id AND w.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.workroom_members me
               WHERE me.workroom_id = workroom_members.workroom_id AND me.user_id = auth.uid())
  );

CREATE POLICY "Owners manage workroom members"
  ON public.workroom_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workrooms w
                 WHERE w.id = workroom_members.workroom_id AND w.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workrooms w
                      WHERE w.id = workroom_members.workroom_id AND w.owner_id = auth.uid()));

CREATE POLICY "Users join workrooms as themselves"
  ON public.workroom_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 11. Storage buckets: remove broad listing policies (public URLs still work)
DROP POLICY IF EXISTS "Anyone can view Feed files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view Status files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view gig images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view portfolio files" ON storage.objects;
DROP POLICY IF EXISTS "Portfolio files are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view story files" ON storage.objects;
DROP POLICY IF EXISTS "All users can view stories" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view training files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Good 154b66q_2" ON storage.objects;
DROP POLICY IF EXISTS "admin_proof_all" ON storage.objects;

-- 12. Foreign table out of API-exposed schema
CREATE SCHEMA IF NOT EXISTS integrations;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'stripe_account' AND c.relkind = 'f'
  ) THEN
    EXECUTE 'ALTER FOREIGN TABLE public.stripe_account SET SCHEMA integrations';
  END IF;
END $$;
REVOKE ALL ON SCHEMA integrations FROM anon, authenticated;

-- 13. Function search_path hardening
ALTER FUNCTION public.accept_safepay(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.calculate_comment_engagement(uuid) SET search_path = public;
ALTER FUNCTION public.calculate_nc_amount(numeric, character varying) SET search_path = public;
ALTER FUNCTION public.cleanup_old_telegram_conversations() SET search_path = public;
ALTER FUNCTION public.expire_expert_boosts() SET search_path = public;
ALTER FUNCTION public.generate_verification_token() SET search_path = public;
ALTER FUNCTION public.get_system_setting(character varying) SET search_path = public;
ALTER FUNCTION public.refund_safepay(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.release_safepay(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.update_user_presence_timestamp() SET search_path = public;

-- 14. Revoke EXECUTE from anon on all SECURITY DEFINER functions in public
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true AND p.prokind = 'f'
  LOOP
    IF r.sig LIKE 'public.get_payment_request_by_short_code(%' THEN CONTINUE; END IF;
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', r.sig);
  END LOOP;
END $$;
