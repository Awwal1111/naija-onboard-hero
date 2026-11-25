-- Wallet integrity and marketplace settlement hardening.
-- Apply only after reviewing the paired frontend changes in this PR.

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

-- 2) Atomic digital-product purchase. Price is read from the database, not
-- trusted from the browser. Duplicate purchases are idempotent.
CREATE OR REPLACE FUNCTION public.purchase_digital_product(p_product_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_buyer uuid := auth.uid();
  v_product public.digital_products%ROWTYPE;
  v_wallet numeric;
  v_withdrawable numeric;
  v_fee numeric;
  v_seller_amount numeric;
  v_existing uuid;
BEGIN
  IF v_buyer IS NULL THEN
    RETURN jsonb_build_object('success',false,'error','Authentication required');
  END IF;

  SELECT * INTO v_product
  FROM public.digital_products
  WHERE id=p_product_id
  FOR UPDATE;

  IF NOT FOUND OR v_product.status IS DISTINCT FROM 'active' THEN
    RETURN jsonb_build_object('success',false,'error','Product is unavailable');
  END IF;
  IF v_product.user_id=v_buyer THEN
    RETURN jsonb_build_object('success',false,'error','You cannot purchase your own product');
  END IF;
  IF v_product.price IS NULL OR v_product.price<=0 THEN
    RETURN jsonb_build_object('success',false,'error','Product price is invalid');
  END IF;

  SELECT id INTO v_existing
  FROM public.digital_product_purchases
  WHERE product_id=p_product_id AND buyer_id=v_buyer;
  IF FOUND THEN
    INSERT INTO public.product_downloads(product_id,buyer_id)
    VALUES (p_product_id,v_buyer)
    ON CONFLICT (product_id,buyer_id) DO NOTHING;
    RETURN jsonb_build_object('success',true,'already_purchased',true);
  END IF;

  SELECT wallet_balance,balance_withdrawable
  INTO v_wallet,v_withdrawable
  FROM public.profiles
  WHERE user_id=v_buyer
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success',false,'error','Buyer wallet not found');
  END IF;
  IF COALESCE(v_wallet,0)<v_product.price OR COALESCE(v_withdrawable,0)<v_product.price THEN
    RETURN jsonb_build_object('success',false,'error','Insufficient withdrawable NC balance');
  END IF;

  v_fee := ROUND(v_product.price*0.05,2);
  v_seller_amount := v_product.price-v_fee;

  UPDATE public.profiles
  SET wallet_balance=wallet_balance-v_product.price,
      balance_withdrawable=balance_withdrawable-v_product.price,
      updated_at=now()
  WHERE user_id=v_buyer;

  UPDATE public.profiles
  SET wallet_balance=COALESCE(wallet_balance,0)+v_seller_amount,
      balance_withdrawable=COALESCE(balance_withdrawable,0)+v_seller_amount,
      updated_at=now()
  WHERE user_id=v_product.user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product seller wallet not found';
  END IF;

  INSERT INTO public.digital_product_purchases(product_id,buyer_id,amount)
  VALUES (p_product_id,v_buyer,v_product.price);

  INSERT INTO public.product_downloads(product_id,buyer_id)
  VALUES (p_product_id,v_buyer)
  ON CONFLICT (product_id,buyer_id) DO NOTHING;

  UPDATE public.digital_products
  SET download_count=COALESCE(download_count,0)+1,updated_at=now()
  WHERE id=p_product_id;

  INSERT INTO public.wallet_transactions(user_id,kind,amount,status,reference,metadata)
  VALUES
    (v_buyer,'product_purchase',-v_product.price,'completed',
      'Purchase: '||v_product.title,
      jsonb_build_object('product_id',p_product_id,'seller_id',v_product.user_id)),
    (v_product.user_id,'product_sale',v_seller_amount,'completed',
      'Sale: '||v_product.title,
      jsonb_build_object('product_id',p_product_id,'buyer_id',v_buyer,'gross',v_product.price,'platform_fee',v_fee));

  IF v_fee>0 THEN
    PERFORM public.credit_platform_revenue(
      'digital_product_fee',v_fee,v_buyer,p_product_id::text,
      jsonb_build_object('seller_id',v_product.user_id,'gross',v_product.price)
    );
  END IF;

  RETURN jsonb_build_object(
    'success',true,'already_purchased',false,'amount',v_product.price,
    'seller_amount',v_seller_amount,'platform_fee',v_fee
  );
END;
$$;

DROP POLICY IF EXISTS "Users can purchase products" ON public.digital_product_purchases;
REVOKE INSERT ON public.digital_product_purchases FROM anon,authenticated;
REVOKE ALL ON FUNCTION public.purchase_digital_product(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.purchase_digital_product(uuid) TO authenticated;

-- 3) Make the 100:5 NC conversion fixed and owner-only. Browser-supplied
-- conversion rates must never be trusted.
CREATE OR REPLACE FUNCTION public.convert_nc_balance(
  p_user_id uuid,p_input_amount numeric DEFAULT 100,p_output_amount numeric DEFAULT 5
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_non_withdrawable numeric;
  v_wallet numeric;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('success',false,'error','You can only convert your own NC balance');
  END IF;
  IF p_input_amount IS DISTINCT FROM 100::numeric OR p_output_amount IS DISTINCT FROM 5::numeric THEN
    RETURN jsonb_build_object('success',false,'error','The supported conversion is fixed at 100 non-withdrawable NC to 5 withdrawable NC');
  END IF;

  SELECT balance_non_withdrawable,wallet_balance
  INTO v_non_withdrawable,v_wallet
  FROM public.profiles WHERE user_id=p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success',false,'error','Profile not found');
  END IF;
  IF COALESCE(v_non_withdrawable,0)<100 OR COALESCE(v_wallet,0)<100 THEN
    RETURN jsonb_build_object('success',false,'error','Insufficient non-withdrawable NC balance');
  END IF;

  UPDATE public.profiles
  SET balance_non_withdrawable=balance_non_withdrawable-100,
      wallet_balance=wallet_balance-95,
      balance_withdrawable=balance_withdrawable+5,
      updated_at=now()
  WHERE user_id=p_user_id;

  INSERT INTO public.wallet_transactions(user_id,kind,amount,status,reference,metadata)
  VALUES (p_user_id,'nc_conversion',5,'completed',
    'Converted 100 non-withdrawable NC to 5 withdrawable NC',
    jsonb_build_object('converted_from',100,'converted_to',5));

  RETURN jsonb_build_object('success',true,'converted_from',100,'converted_to',5,
    'new_non_withdrawable',v_non_withdrawable-100);
END;
$$;
REVOKE ALL ON FUNCTION public.convert_nc_balance(uuid,numeric,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.convert_nc_balance(uuid,numeric,numeric) TO authenticated;

-- 4) Fix developer API payouts for the live wallet_transactions schema and
-- keep the privileged RPC service-role-only.
CREATE OR REPLACE FUNCTION public.developer_payout_atomic(
  p_developer_id uuid,p_recipient_user_id uuid,p_amount numeric,p_reference text,p_description text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_dev_wallet numeric;
  v_dev_withdrawable numeric;
BEGIN
  IF p_amount IS NULL OR p_amount<=0 THEN
    RETURN jsonb_build_object('ok',false,'error','Amount must be positive');
  END IF;
  IF p_developer_id IS NULL OR p_recipient_user_id IS NULL OR p_developer_id=p_recipient_user_id THEN
    RETURN jsonb_build_object('ok',false,'error','Invalid payout parties');
  END IF;
  IF NULLIF(trim(COALESCE(p_reference,'')),'') IS NULL THEN
    RETURN jsonb_build_object('ok',false,'error','A payout reference is required');
  END IF;

  PERFORM 1 FROM public.profiles
  WHERE user_id IN (p_developer_id,p_recipient_user_id)
  ORDER BY user_id FOR UPDATE;

  SELECT wallet_balance,balance_withdrawable
  INTO v_dev_wallet,v_dev_withdrawable
  FROM public.profiles WHERE user_id=p_developer_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok',false,'error','Developer wallet not found');
  END IF;
  IF COALESCE(v_dev_wallet,0)<p_amount OR COALESCE(v_dev_withdrawable,0)<p_amount THEN
    RETURN jsonb_build_object('ok',false,'error','Insufficient withdrawable balance',
      'wallet_balance',COALESCE(v_dev_wallet,0),'balance_withdrawable',COALESCE(v_dev_withdrawable,0));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id=p_recipient_user_id) THEN
    RETURN jsonb_build_object('ok',false,'error','Recipient not found');
  END IF;

  UPDATE public.profiles
  SET wallet_balance=COALESCE(wallet_balance,0)-p_amount,
      balance_withdrawable=COALESCE(balance_withdrawable,0)-p_amount,updated_at=now()
  WHERE user_id=p_developer_id;

  UPDATE public.profiles
  SET wallet_balance=COALESCE(wallet_balance,0)+p_amount,
      balance_withdrawable=COALESCE(balance_withdrawable,0)+p_amount,updated_at=now()
  WHERE user_id=p_recipient_user_id;

  INSERT INTO public.wallet_transactions(user_id,kind,amount,status,reference,metadata)
  VALUES
    (p_developer_id,'developer_payout',-p_amount,'completed',p_reference,
      jsonb_build_object('recipient_user_id',p_recipient_user_id,'description',p_description)),
    (p_recipient_user_id,'developer_credit',p_amount,'completed',p_reference,
      jsonb_build_object('developer_id',p_developer_id,'description',p_description));

  RETURN jsonb_build_object('ok',true,'reference',p_reference,
    'recipient_user_id',p_recipient_user_id,'amount',p_amount,
    'developer_balance_after',v_dev_wallet-p_amount);
END;
$$;
REVOKE ALL ON FUNCTION public.developer_payout_atomic(uuid,uuid,numeric,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.developer_payout_atomic(uuid,uuid,numeric,text,text) TO service_role;

-- 5) Milestone release must be authenticated, buyer-approved, and atomic.
CREATE OR REPLACE FUNCTION public.release_gig_milestone(p_milestone_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_m public.project_milestones%ROWTYPE;
  v_order public.gig_orders%ROWTYPE;
  v_seller_amt numeric;
  v_fee_share numeric;
  v_partner_share numeric := 0;
  v_partner record;
  v_remaining integer;
  v_milestone_total numeric;
  v_released_total numeric;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('success',false,'error','Authentication required');
  END IF;

  SELECT * INTO v_m FROM public.project_milestones WHERE id=p_milestone_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Milestone not found'); END IF;
  IF v_m.order_id IS NULL THEN
    RETURN jsonb_build_object('success',false,'error','This release function only supports gig-order milestones');
  END IF;
  IF v_m.status<>'approved' THEN
    RETURN jsonb_build_object('success',false,'error','The buyer must approve the milestone before release');
  END IF;

  SELECT * INTO v_order FROM public.gig_orders WHERE id=v_m.order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Order not found'); END IF;
  IF v_order.buyer_id IS DISTINCT FROM v_actor THEN
    RETURN jsonb_build_object('success',false,'error','Only the buyer can release this milestone');
  END IF;
  IF v_order.status IN ('completed','cancelled') THEN
    RETURN jsonb_build_object('success',false,'error','This order is already closed');
  END IF;

  SELECT COALESCE(SUM(amount),0),
         COALESCE(SUM(amount) FILTER (WHERE status='released'),0)
  INTO v_milestone_total,v_released_total
  FROM public.project_milestones
  WHERE order_id=v_order.id;

  IF ROUND(v_milestone_total,2)<>ROUND(v_order.amount,2) THEN
    RETURN jsonb_build_object('success',false,'error','Milestone amounts must add up to the full escrowed order amount before release');
  END IF;
  IF v_released_total+v_m.amount>v_order.amount THEN
    RETURN jsonb_build_object('success',false,'error','Milestone release would exceed the order escrow');
  END IF;

  SELECT p.id,p.partner_cut_pct,p.platform_fee_pct INTO v_partner
  FROM public.profiles pr
  JOIN public.partners p ON p.id=pr.partner_id AND p.is_active IS TRUE
  WHERE pr.user_id=v_order.seller_id FOR UPDATE OF p;

  IF FOUND THEN
    v_partner_share:=ROUND(v_m.amount*v_partner.partner_cut_pct/100.0,2);
    v_fee_share:=ROUND(v_m.amount*v_partner.platform_fee_pct/100.0,2);
  ELSE
    v_fee_share:=ROUND((v_m.amount/NULLIF(v_order.amount,0))*COALESCE(v_order.platform_fee,0),2);
  END IF;
  v_seller_amt := v_m.amount-COALESCE(v_partner_share,0)-COALESCE(v_fee_share,0);
  IF v_seller_amt<0 THEN RAISE EXCEPTION 'Milestone fee exceeds milestone amount'; END IF;

  UPDATE public.profiles
  SET balance_withdrawable=COALESCE(balance_withdrawable,0)+v_seller_amt,
      wallet_balance=COALESCE(wallet_balance,0)+v_seller_amt,updated_at=now()
  WHERE user_id=v_order.seller_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Seller profile not found'; END IF;

  INSERT INTO public.wallet_transactions(user_id,kind,amount,status,reference,metadata)
  VALUES (v_order.seller_id,'milestone_payout',v_seller_amt,'completed',
    'Milestone released: '||v_m.title,
    jsonb_build_object('order_id',v_order.id,'milestone_id',p_milestone_id,'platform_fee',v_fee_share));

  IF v_partner_share>0 THEN
    UPDATE public.partners SET total_earned=total_earned+v_partner_share WHERE id=v_partner.id;
    INSERT INTO public.partner_payout_logs(
      partner_id,gig_id,amount,type,deal_type,reference_id,
      gross_amount,commission_amount,platform_fee_amount,notes
    ) VALUES (v_partner.id,v_order.gig_id,v_partner_share,'commission_earned','gig_milestone',
      p_milestone_id,v_m.amount,v_partner_share,v_fee_share,'Released gig milestone commission');
  END IF;

  IF v_fee_share>0 THEN
    PERFORM public.credit_platform_revenue('gig_milestone_fee',v_fee_share,v_order.buyer_id,
      p_milestone_id::text,jsonb_build_object('order_id',v_order.id,'seller_id',v_order.seller_id,
        'partner_id',v_partner.id,'partner_commission',v_partner_share));
  END IF;

  UPDATE public.project_milestones SET status='released',released_at=now()
  WHERE id=p_milestone_id;

  SELECT COUNT(*) INTO v_remaining FROM public.project_milestones
  WHERE order_id=v_order.id AND status<>'released';

  IF v_remaining=0 THEN
    UPDATE public.gig_orders SET status='completed',completed_at=now(),updated_at=now()
    WHERE id=v_order.id;
  END IF;

  RETURN jsonb_build_object('success',true,'remaining',v_remaining,'seller_amount',v_seller_amt,'platform_fee',v_fee_share);
END;
$$;
REVOKE ALL ON FUNCTION public.release_gig_milestone(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.release_gig_milestone(uuid) TO authenticated;

-- 6) Prevent the full-order payout path from paying a second time when an
-- order contains milestones. Those orders must be settled milestone-by-milestone.
CREATE OR REPLACE FUNCTION public.complete_gig_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_order public.gig_orders%ROWTYPE;
  v_partner record;
  v_partner_share numeric := 0;
  v_platform_share numeric := 0;
  v_seller_amount numeric := 0;
BEGIN
  IF v_actor IS NULL THEN RETURN jsonb_build_object('success',false,'error','Authentication required'); END IF;

  SELECT * INTO v_order FROM public.gig_orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Order not found'); END IF;
  IF v_order.buyer_id IS DISTINCT FROM v_actor THEN
    RETURN jsonb_build_object('success',false,'error','Only the buyer can complete the order');
  END IF;
  IF v_order.status NOT IN ('delivered','revision_requested','in_progress','accepted') THEN
    RETURN jsonb_build_object('success',false,'error','Order cannot be completed in current state');
  END IF;
  IF EXISTS (SELECT 1 FROM public.project_milestones WHERE order_id=p_order_id) THEN
    RETURN jsonb_build_object('success',false,'error','This order uses milestones. Approve and release each milestone separately.');
  END IF;

  SELECT p.id,p.partner_cut_pct,p.platform_fee_pct INTO v_partner
  FROM public.profiles pr
  JOIN public.partners p ON p.id=pr.partner_id AND p.is_active IS TRUE
  WHERE pr.user_id=v_order.seller_id FOR UPDATE OF p;

  IF FOUND THEN
    v_partner_share:=ROUND(v_order.amount*v_partner.partner_cut_pct/100.0,2);
    v_platform_share:=ROUND(v_order.amount*v_partner.platform_fee_pct/100.0,2);
  ELSE
    v_platform_share:=COALESCE(v_order.platform_fee,0);
  END IF;
  v_seller_amount:=v_order.amount-v_partner_share-v_platform_share;
  IF v_seller_amount<0 THEN RAISE EXCEPTION 'Partner and platform fees exceed gig gross amount'; END IF;

  UPDATE public.profiles
  SET balance_withdrawable=COALESCE(balance_withdrawable,0)+v_seller_amount,
      wallet_balance=COALESCE(wallet_balance,0)+v_seller_amount,updated_at=now()
  WHERE user_id=v_order.seller_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Seller profile not found'; END IF;

  UPDATE public.gig_orders SET status='completed',completed_at=now(),updated_at=now()
  WHERE id=p_order_id;

  INSERT INTO public.wallet_transactions(user_id,kind,amount,status,reference,metadata)
  VALUES (v_order.seller_id,'gig_order_payout',v_seller_amount,'completed',
    'Gig order completed: '||v_order.title,
    jsonb_build_object('order_id',p_order_id,'gross',v_order.amount,
      'partner_commission',v_partner_share,'platform_fee',v_platform_share));

  IF v_partner_share>0 THEN
    UPDATE public.partners SET total_earned=total_earned+v_partner_share WHERE id=v_partner.id;
    INSERT INTO public.partner_payout_logs(
      partner_id,gig_id,amount,type,deal_type,reference_id,
      gross_amount,commission_amount,platform_fee_amount,notes
    ) VALUES (v_partner.id,p_order_id,v_partner_share,'commission_earned','gig_order',
      p_order_id,v_order.amount,v_partner_share,v_platform_share,'Completed gig commission');
  END IF;

  PERFORM public.credit_platform_revenue('gig_order_fee',v_platform_share,v_order.buyer_id,
    p_order_id::text,jsonb_build_object('seller_id',v_order.seller_id,'gross',v_order.amount,
      'partner_id',v_partner.id,'partner_commission',v_partner_share));

  RETURN jsonb_build_object('success',true,'seller_amount',v_seller_amount,
    'partner_commission',v_partner_share,'platform_fee',v_platform_share);
END;
$$;
REVOKE ALL ON FUNCTION public.complete_gig_order(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.complete_gig_order(uuid) TO authenticated;


-- 7) Permit seller deliverable submissions while preventing either party from
-- editing milestone amounts or marking funds released without the payout RPC.
DROP POLICY IF EXISTS "Sellers can update their own milestone submissions" ON public.project_milestones;
CREATE POLICY "Sellers can update their own milestone submissions"
ON public.project_milestones FOR UPDATE TO authenticated
USING (
  (order_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.gig_orders o WHERE o.id=project_milestones.order_id AND o.seller_id=auth.uid()
  ))
  OR
  (safepay_transaction_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.safepay_transactions s WHERE s.id=project_milestones.safepay_transaction_id AND s.seller_id=auth.uid()
  ))
)
WITH CHECK (
  (order_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.gig_orders o WHERE o.id=project_milestones.order_id AND o.seller_id=auth.uid()
  ))
  OR
  (safepay_transaction_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.safepay_transactions s WHERE s.id=project_milestones.safepay_transaction_id AND s.seller_id=auth.uid()
  ))
);

CREATE OR REPLACE FUNCTION public.guard_project_milestone_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_buyer uuid;
  v_seller uuid;
  v_actor uuid := auth.uid();
  v_order_amount numeric;
  v_existing_total numeric;
BEGIN
  IF current_user NOT IN ('anon','authenticated') THEN
    RETURN NEW;
  END IF;
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501';
  END IF;

  IF TG_OP='INSERT' THEN
    IF NEW.order_id IS NOT NULL THEN
      SELECT buyer_id,seller_id,amount INTO v_buyer,v_seller,v_order_amount
      FROM public.gig_orders WHERE id=NEW.order_id;
    ELSIF NEW.safepay_transaction_id IS NOT NULL THEN
      SELECT buyer_id,seller_id,amount INTO v_buyer,v_seller,v_order_amount
      FROM public.safepay_transactions WHERE id=NEW.safepay_transaction_id;
    END IF;
    IF v_buyer IS DISTINCT FROM v_actor THEN
      RAISE EXCEPTION 'Only the buyer can create milestones' USING ERRCODE='42501';
    END IF;
    IF NEW.amount<=0 THEN RAISE EXCEPTION 'Milestone amount must be positive'; END IF;
    IF NEW.order_id IS NOT NULL THEN
      SELECT COALESCE(SUM(amount),0) INTO v_existing_total
      FROM public.project_milestones WHERE order_id=NEW.order_id;
      IF v_existing_total+NEW.amount>v_order_amount THEN
        RAISE EXCEPTION 'Milestone amounts cannot exceed the order amount';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.order_id IS NOT NULL THEN
    SELECT buyer_id,seller_id INTO v_buyer,v_seller
    FROM public.gig_orders WHERE id=OLD.order_id;
  ELSIF OLD.safepay_transaction_id IS NOT NULL THEN
    SELECT buyer_id,seller_id INTO v_buyer,v_seller
    FROM public.safepay_transactions WHERE id=OLD.safepay_transaction_id;
  END IF;

  IF v_actor IS DISTINCT FROM v_buyer AND v_actor IS DISTINCT FROM v_seller THEN
    RAISE EXCEPTION 'Only milestone participants can update milestones' USING ERRCODE='42501';
  END IF;

  IF NEW.order_id IS DISTINCT FROM OLD.order_id
    OR NEW.safepay_transaction_id IS DISTINCT FROM OLD.safepay_transaction_id
    OR NEW.amount IS DISTINCT FROM OLD.amount
    OR NEW.title IS DISTINCT FROM OLD.title
    OR NEW.description IS DISTINCT FROM OLD.description
    OR NEW.due_date IS DISTINCT FROM OLD.due_date
    OR NEW.order_index IS DISTINCT FROM OLD.order_index
    OR NEW.max_revisions IS DISTINCT FROM OLD.max_revisions
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR NEW.released_at IS DISTINCT FROM OLD.released_at
  THEN
    RAISE EXCEPTION 'Milestone scope and amount cannot be changed after creation' USING ERRCODE='42501';
  END IF;

  IF v_actor=v_buyer THEN
    IF NEW.deliverable_urls IS DISTINCT FROM OLD.deliverable_urls
      OR NEW.freelancer_notes IS DISTINCT FROM OLD.freelancer_notes
      OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
    THEN
      RAISE EXCEPTION 'Only the freelancer can submit deliverables' USING ERRCODE='42501';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status
      AND NOT (OLD.status='submitted' AND NEW.status IN ('approved','revision_requested'))
    THEN
      RAISE EXCEPTION 'Buyer can only approve or request a revision after submission' USING ERRCODE='42501';
    END IF;
    IF NEW.status='revision_requested' THEN
      IF NEW.revision_count<>OLD.revision_count+1 THEN
        RAISE EXCEPTION 'Revision count must increase by exactly one';
      END IF;
    ELSIF NEW.revision_count IS DISTINCT FROM OLD.revision_count THEN
      RAISE EXCEPTION 'Revision count can only change when requesting a revision';
    END IF;
  ELSE
    IF NEW.client_feedback IS DISTINCT FROM OLD.client_feedback
      OR NEW.revision_count IS DISTINCT FROM OLD.revision_count
    THEN
      RAISE EXCEPTION 'Only the buyer can provide feedback or manage revisions' USING ERRCODE='42501';
    END IF;
    IF (NEW.deliverable_urls IS DISTINCT FROM OLD.deliverable_urls
      OR NEW.freelancer_notes IS DISTINCT FROM OLD.freelancer_notes
      OR NEW.completed_at IS DISTINCT FROM OLD.completed_at)
      AND NOT (OLD.status IN ('pending','in_progress','revision_requested','submitted') AND NEW.status='submitted')
    THEN
      RAISE EXCEPTION 'Freelancer can only submit deliverables for a pending or revised milestone' USING ERRCODE='42501';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status
      AND NOT (OLD.status IN ('pending','in_progress','revision_requested') AND NEW.status='submitted')
    THEN
      RAISE EXCEPTION 'Freelancer can only submit a pending or revised milestone' USING ERRCODE='42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_project_milestone_changes ON public.project_milestones;
CREATE TRIGGER trg_guard_project_milestone_changes
BEFORE INSERT OR UPDATE ON public.project_milestones
FOR EACH ROW EXECUTE FUNCTION public.guard_project_milestone_changes();
