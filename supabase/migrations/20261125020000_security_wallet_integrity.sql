-- Wallet integrity and marketplace settlement hardening.
-- Apply only after reviewing the paired frontend changes in this PR.

-- Profile-sensitive-field guard is intentionally staged in supabase/pending until
-- all existing browser-side wallet/profile writers are moved to trusted RPCs.

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
  v_existing_amount numeric;
  v_existing_metadata jsonb;
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

  PERFORM pg_advisory_xact_lock(hashtextextended('developer_payout:'||p_developer_id::text||':'||p_reference,0));
  SELECT amount,metadata INTO v_existing_amount,v_existing_metadata
  FROM public.wallet_transactions
  WHERE user_id=p_developer_id AND kind='developer_payout'
    AND reference=p_reference AND status='completed'
  LIMIT 1;
  IF FOUND THEN
    IF ABS(v_existing_amount)<>p_amount
      OR v_existing_metadata->>'recipient_user_id' IS DISTINCT FROM p_recipient_user_id::text THEN
      RETURN jsonb_build_object('ok',false,'error','Payout reference has already been used for different details');
    END IF;
    SELECT wallet_balance INTO v_dev_wallet FROM public.profiles WHERE user_id=p_developer_id;
    RETURN jsonb_build_object('ok',true,'already_processed',true,'reference',p_reference,
      'recipient_user_id',p_recipient_user_id,'amount',p_amount,'developer_balance_after',v_dev_wallet);
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
  IF v_order.status NOT IN ('accepted','in_progress','delivered','revision_requested') THEN
    RETURN jsonb_build_object('success',false,'error','The order must be accepted or in progress before a milestone can be released');
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
    v_partner_share:=ROUND(v_m.amount*COALESCE(v_partner.partner_cut_pct,0)/100.0,2);
    v_fee_share:=ROUND(v_m.amount*COALESCE(v_partner.platform_fee_pct,0)/100.0,2);
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
  IF v_order.status<>'delivered' THEN
    RETURN jsonb_build_object('success',false,'error','The seller must mark the order delivered before the buyer can release payment');
  END IF;
  IF EXISTS (SELECT 1 FROM public.project_milestones WHERE order_id=p_order_id) THEN
    RETURN jsonb_build_object('success',false,'error','This order uses milestones. Approve and release each milestone separately.');
  END IF;

  SELECT p.id,p.partner_cut_pct,p.platform_fee_pct INTO v_partner
  FROM public.profiles pr
  JOIN public.partners p ON p.id=pr.partner_id AND p.is_active IS TRUE
  WHERE pr.user_id=v_order.seller_id FOR UPDATE OF p;

  IF FOUND THEN
    v_partner_share:=ROUND(v_order.amount*COALESCE(v_partner.partner_cut_pct,0)/100.0,2);
    v_platform_share:=ROUND(v_order.amount*COALESCE(v_partner.platform_fee_pct,0)/100.0,2);
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


-- 8) Wallet history is append-only for client sessions. Trusted SECURITY
-- DEFINER functions and service-role Edge Functions retain their writes.
DROP POLICY IF EXISTS "Wallet update by owner" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Wallet delete by owner" ON public.wallet_transactions;
REVOKE UPDATE,DELETE ON public.wallet_transactions FROM anon,authenticated;


-- 9) Close SafePay SECURITY DEFINER authorization gaps.
CREATE OR REPLACE FUNCTION public.propose_safepay(p_buyer_id uuid,p_seller_id uuid,p_amount integer)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  v_actor uuid:=auth.uid();
  v_balance numeric;
  v_wallet numeric;
  v_id uuid;
BEGIN
  IF v_actor IS NULL OR v_actor IS DISTINCT FROM p_buyer_id THEN
    RETURN jsonb_build_object('success',false,'error','You can only create SafePay from your own account');
  END IF;
  IF p_amount IS NULL OR p_amount<=0 OR p_seller_id IS NULL OR p_buyer_id=p_seller_id THEN
    RETURN jsonb_build_object('success',false,'error','Invalid SafePay details');
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE user_id=p_seller_id) THEN
    RETURN jsonb_build_object('success',false,'error','Seller account not found');
  END IF;

  SELECT balance_withdrawable,wallet_balance INTO v_balance,v_wallet
  FROM public.profiles WHERE user_id=p_buyer_id FOR UPDATE;
  IF NOT FOUND OR COALESCE(v_balance,0)<p_amount OR COALESCE(v_wallet,0)<p_amount THEN
    RETURN jsonb_build_object('success',false,'error','Insufficient withdrawable NC balance');
  END IF;

  UPDATE public.profiles
  SET wallet_balance=COALESCE(wallet_balance,0)-p_amount,
      balance_withdrawable=balance_withdrawable-p_amount,updated_at=now()
  WHERE user_id=p_buyer_id;

  INSERT INTO public.safepay_transactions(buyer_id,seller_id,amount,status)
  VALUES(p_buyer_id,p_seller_id,p_amount,'proposed')
  RETURNING id INTO v_id;

  INSERT INTO public.user_wallets(user_id,balance,escrow_hold)
  VALUES(p_buyer_id,0,p_amount)
  ON CONFLICT(user_id) DO UPDATE
    SET escrow_hold=COALESCE(public.user_wallets.escrow_hold,0)+EXCLUDED.escrow_hold,
        updated_at=now();

  INSERT INTO public.wallet_transactions(user_id,safepay_id,kind,amount,status,reference,metadata)
  VALUES(p_buyer_id,v_id,'escrow_hold',-p_amount,'completed','SafePay funds locked',
    jsonb_build_object('seller_id',p_seller_id));

  RETURN jsonb_build_object('success',true,'safepay_id',v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_safepay(p_safepay_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  v_actor uuid:=auth.uid();
  v_tx public.safepay_transactions%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_tx FROM public.safepay_transactions WHERE id=p_safepay_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SafePay not found'; END IF;
  IF v_actor IS DISTINCT FROM v_tx.seller_id THEN RAISE EXCEPTION 'Only the seller can accept this SafePay'; END IF;
  IF v_tx.status<>'proposed' THEN RAISE EXCEPTION 'SafePay must be in proposed state'; END IF;
  UPDATE public.safepay_transactions SET status='active',updated_at=now() WHERE id=p_safepay_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_safepay_proposal(p_safepay_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  v_actor uuid:=auth.uid();
  v_tx public.safepay_transactions%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_tx FROM public.safepay_transactions WHERE id=p_safepay_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SafePay not found'; END IF;
  IF v_actor IS DISTINCT FROM v_tx.buyer_id THEN RAISE EXCEPTION 'Only the buyer can cancel a proposed SafePay'; END IF;
  IF v_tx.status<>'proposed' THEN RAISE EXCEPTION 'Only proposed SafePay can be cancelled'; END IF;

  UPDATE public.user_wallets
  SET escrow_hold=GREATEST(0,COALESCE(escrow_hold,0)-v_tx.amount),updated_at=now()
  WHERE user_id=v_tx.buyer_id;

  UPDATE public.profiles
  SET wallet_balance=COALESCE(wallet_balance,0)+v_tx.amount,
      balance_withdrawable=balance_withdrawable+v_tx.amount,updated_at=now()
  WHERE user_id=v_tx.buyer_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Buyer profile not found for refund'; END IF;

  INSERT INTO public.wallet_transactions(user_id,safepay_id,kind,amount,status,reference)
  VALUES(v_tx.buyer_id,p_safepay_id,'refund',v_tx.amount,'completed','SafePay cancelled - refund');

  UPDATE public.safepay_transactions
  SET status='cancelled',cancelled_at=now(),updated_at=now()
  WHERE id=p_safepay_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_safepay_complete(p_safepay_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  v_actor uuid:=auth.uid();
  v_tx public.safepay_transactions%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_tx FROM public.safepay_transactions WHERE id=p_safepay_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SafePay not found'; END IF;
  IF v_actor IS DISTINCT FROM v_tx.seller_id THEN RAISE EXCEPTION 'Only the seller can mark complete'; END IF;
  IF v_tx.status<>'active' THEN RAISE EXCEPTION 'SafePay must be active'; END IF;
  UPDATE public.safepay_transactions
  SET status='complete',completed_at=now(),updated_at=now()
  WHERE id=p_safepay_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_safepay_funds(p_safepay_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  v_actor uuid:=auth.uid();
  v_tx public.safepay_transactions%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_tx FROM public.safepay_transactions WHERE id=p_safepay_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SafePay not found'; END IF;
  IF v_actor IS DISTINCT FROM v_tx.buyer_id THEN RAISE EXCEPTION 'Only the buyer can release funds'; END IF;
  IF v_tx.status<>'complete' THEN RAISE EXCEPTION 'SafePay must be completed first'; END IF;

  UPDATE public.user_wallets
  SET escrow_hold=GREATEST(0,COALESCE(escrow_hold,0)-v_tx.amount),updated_at=now()
  WHERE user_id=v_tx.buyer_id;

  UPDATE public.profiles
  SET wallet_balance=COALESCE(wallet_balance,0)+v_tx.amount,
      balance_withdrawable=balance_withdrawable+v_tx.amount,updated_at=now()
  WHERE user_id=v_tx.seller_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Seller profile not found'; END IF;

  INSERT INTO public.wallet_transactions(user_id,safepay_id,kind,amount,status,reference)
  VALUES(v_tx.seller_id,p_safepay_id,'payment_received',v_tx.amount,'completed','SafePay payment received');

  UPDATE public.safepay_transactions
  SET status='released',released_at=now(),updated_at=now()
  WHERE id=p_safepay_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.file_dispute_safepay(p_safepay_id uuid,p_reason text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  v_actor uuid:=auth.uid();
  v_tx public.safepay_transactions%ROWTYPE;
  v_chat_id uuid;
  v_message record;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NULLIF(trim(COALESCE(p_reason,'')),'') IS NULL THEN RAISE EXCEPTION 'A dispute reason is required'; END IF;
  SELECT * INTO v_tx FROM public.safepay_transactions WHERE id=p_safepay_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SafePay transaction not found'; END IF;
  IF v_actor IS DISTINCT FROM v_tx.buyer_id THEN RAISE EXCEPTION 'Only the buyer can file this dispute'; END IF;
  IF v_tx.status<>'complete' THEN RAISE EXCEPTION 'Only completed SafePay can be disputed'; END IF;

  SELECT id INTO v_chat_id FROM public.chats
  WHERE (user1_id=v_tx.buyer_id AND user2_id=v_tx.seller_id)
     OR (user1_id=v_tx.seller_id AND user2_id=v_tx.buyer_id)
  LIMIT 1;

  IF v_chat_id IS NOT NULL THEN
    FOR v_message IN
      SELECT sender_id,content,created_at FROM public.messages
      WHERE chat_id=v_chat_id ORDER BY created_at ASC
    LOOP
      INSERT INTO public.disputed_chat_snapshots(safepay_id,sender_id,message_text,created_at,snapshot_created_at)
      VALUES(p_safepay_id,v_message.sender_id,v_message.content,v_message.created_at,now());
    END LOOP;
  END IF;

  UPDATE public.safepay_transactions
  SET status='disputed',dispute_reason=trim(p_reason),disputed_at=now(),updated_at=now()
  WHERE id=p_safepay_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.raise_safepay_dispute(
  p_safepay_id uuid,p_reason text,p_details text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  v_actor uuid:=auth.uid();
  v_tx public.safepay_transactions%ROWTYPE;
  v_dispute_id uuid;
  v_counterparty uuid;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NULLIF(trim(COALESCE(p_reason,'')),'') IS NULL THEN RAISE EXCEPTION 'Reason is required'; END IF;
  SELECT * INTO v_tx FROM public.safepay_transactions WHERE id=p_safepay_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SafePay not found'; END IF;
  IF v_actor IS DISTINCT FROM v_tx.buyer_id AND v_actor IS DISTINCT FROM v_tx.seller_id THEN
    RAISE EXCEPTION 'Not a party to this SafePay';
  END IF;
  IF v_tx.status NOT IN ('active','complete') THEN
    RAISE EXCEPTION 'Cannot dispute SafePay in % status',v_tx.status;
  END IF;
  v_counterparty:=CASE WHEN v_actor=v_tx.buyer_id THEN v_tx.seller_id ELSE v_tx.buyer_id END;

  UPDATE public.safepay_transactions
  SET status='disputed',dispute_reason=p_reason,updated_at=now()
  WHERE id=p_safepay_id;

  INSERT INTO public.transaction_disputes(
    user_id,transaction_id,dispute_reason,dispute_details,dispute_type,safepay_id,counterparty_id,status
  ) VALUES(v_actor,p_safepay_id,p_reason,p_details,'safepay',p_safepay_id,v_counterparty,'pending')
  RETURNING id INTO v_dispute_id;

  INSERT INTO public.notifications(user_id,type,title,message,data)
  VALUES(v_counterparty,'safepay_disputed','SafePay dispute raised',
    'The other party raised a dispute. Funds are locked pending admin review.',
    jsonb_build_object('safepay_id',p_safepay_id,'dispute_id',v_dispute_id));

  RETURN v_dispute_id;
END;
$$;

-- Gig cancellation is party-only; unauthenticated NULL comparisons must not pass.
CREATE OR REPLACE FUNCTION public.cancel_gig_order(p_order_id uuid,p_reason text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  v_actor uuid:=auth.uid();
  v_order public.gig_orders%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN RETURN jsonb_build_object('success',false,'error','Authentication required'); END IF;
  SELECT * INTO v_order FROM public.gig_orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Order not found'); END IF;
  IF v_actor IS DISTINCT FROM v_order.buyer_id AND v_actor IS DISTINCT FROM v_order.seller_id THEN
    RETURN jsonb_build_object('success',false,'error','Not authorized');
  END IF;
  IF v_order.status NOT IN ('pending','accepted') THEN
    RETURN jsonb_build_object('success',false,'error','Order cannot be cancelled now. Please open a dispute.');
  END IF;
  IF EXISTS(SELECT 1 FROM public.project_milestones WHERE order_id=p_order_id AND status='released') THEN
    RETURN jsonb_build_object('success',false,'error','A milestone has already been paid. Open a dispute instead of cancelling the full order.');
  END IF;

  UPDATE public.profiles
  SET balance_withdrawable=balance_withdrawable+v_order.amount,
      wallet_balance=COALESCE(wallet_balance,0)+v_order.amount,updated_at=now()
  WHERE user_id=v_order.buyer_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Buyer profile not found for refund'; END IF;

  UPDATE public.gig_orders
  SET status='cancelled',cancelled_at=now(),cancellation_reason=NULLIF(trim(COALESCE(p_reason,'')),''),
      updated_at=now()
  WHERE id=p_order_id;

  INSERT INTO public.wallet_transactions(user_id,kind,amount,status,reference,metadata)
  VALUES(v_order.buyer_id,'gig_order_refund',v_order.amount,'completed',
    'Gig order refunded: '||v_order.title,jsonb_build_object('order_id',p_order_id,'reason',p_reason));

  RETURN jsonb_build_object('success',true);
END;
$$;

-- 10) Fix developer escrow ledger writes: the live table uses kind/reference/
-- metadata (not the obsolete type/description columns).
CREATE OR REPLACE FUNCTION public.fund_developer_escrow(p_developer_id uuid,p_escrow_id text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  v_escrow public.developer_escrows%ROWTYPE;
  v_balance numeric;
  v_ref text;
  v_funded_at timestamptz:=now();
BEGIN
  SELECT * INTO v_escrow FROM public.developer_escrows
  WHERE escrow_id=p_escrow_id AND developer_id=p_developer_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','Escrow not found'); END IF;
  IF v_escrow.status<>'pending' THEN
    RETURN jsonb_build_object('ok',false,'error','Cannot fund escrow with status: '||v_escrow.status);
  END IF;

  SELECT wallet_balance INTO v_balance FROM public.profiles WHERE user_id=p_developer_id FOR UPDATE;
  IF NOT FOUND OR COALESCE(v_balance,0)<v_escrow.amount THEN
    RETURN jsonb_build_object('ok',false,'error','Insufficient developer NC balance',
      'required',v_escrow.amount,'balance',COALESCE(v_balance,0));
  END IF;

  UPDATE public.profiles SET wallet_balance=COALESCE(wallet_balance,0)-v_escrow.amount,updated_at=now()
  WHERE user_id=p_developer_id;
  UPDATE public.developer_escrows
  SET status='funded',funded_at=v_funded_at,held_amount=v_escrow.amount,
      auto_release_at=v_funded_at+make_interval(days=>v_escrow.inspection_period_days)
  WHERE escrow_id=p_escrow_id AND developer_id=p_developer_id;

  v_ref:='esc_fund_'||v_escrow.escrow_id;
  INSERT INTO public.wallet_transactions(user_id,amount,kind,status,reference,metadata)
  VALUES(p_developer_id,-v_escrow.amount,'developer_escrow_fund','completed',v_ref,
    jsonb_build_object('escrow_id',v_escrow.escrow_id));

  RETURN jsonb_build_object('ok',true,'escrow_id',v_escrow.escrow_id,'amount',v_escrow.amount,
    'funded_at',v_funded_at,'auto_release_at',v_funded_at+make_interval(days=>v_escrow.inspection_period_days));
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_developer_escrow(
  p_developer_id uuid,p_escrow_id text,p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  v_escrow public.developer_escrows%ROWTYPE;
  v_ref text;
BEGIN
  SELECT * INTO v_escrow FROM public.developer_escrows
  WHERE escrow_id=p_escrow_id AND developer_id=p_developer_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','Escrow not found'); END IF;
  IF v_escrow.status NOT IN ('pending','funded','disputed') THEN
    RETURN jsonb_build_object('ok',false,'error','Cannot refund escrow with status: '||v_escrow.status);
  END IF;

  IF v_escrow.status IN ('funded','disputed') AND COALESCE(v_escrow.held_amount,0)>0 THEN
    UPDATE public.profiles
    SET wallet_balance=COALESCE(wallet_balance,0)+v_escrow.held_amount,updated_at=now()
    WHERE user_id=p_developer_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Developer profile not found for refund'; END IF;
    v_ref:='esc_ref_'||v_escrow.escrow_id;
    INSERT INTO public.wallet_transactions(user_id,amount,kind,status,reference,metadata)
    VALUES(p_developer_id,v_escrow.held_amount,'developer_escrow_refund','completed',v_ref,
      jsonb_build_object('escrow_id',v_escrow.escrow_id,'reason',p_reason));
  END IF;

  UPDATE public.developer_escrows
  SET status='refunded',refunded_at=now(),refund_reason=p_reason
  WHERE escrow_id=p_escrow_id AND developer_id=p_developer_id;

  RETURN jsonb_build_object('ok',true,'escrow_id',v_escrow.escrow_id,
    'amount',v_escrow.held_amount,'refunded_at',now());
END;
$$;

CREATE OR REPLACE FUNCTION public.release_developer_escrow(p_developer_id uuid,p_escrow_id text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  v_escrow public.developer_escrows%ROWTYPE;
  v_payee uuid;
  v_ref text;
BEGIN
  SELECT * INTO v_escrow FROM public.developer_escrows
  WHERE escrow_id=p_escrow_id AND developer_id=p_developer_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','Escrow not found'); END IF;
  IF v_escrow.status NOT IN ('funded','disputed') THEN
    RETURN jsonb_build_object('ok',false,'error','Cannot release escrow with status: '||v_escrow.status);
  END IF;

  v_payee:=v_escrow.payee_user_id;
  IF v_payee IS NULL AND v_escrow.payee_email IS NOT NULL THEN
    SELECT p.user_id INTO v_payee FROM auth.users u JOIN public.profiles p ON p.user_id=u.id WHERE lower(u.email)=lower(v_escrow.payee_email) LIMIT 1;
  END IF;
  IF v_payee IS NULL THEN RETURN jsonb_build_object('ok',false,'error','Payee user not found'); END IF;

  UPDATE public.profiles
  SET wallet_balance=COALESCE(wallet_balance,0)+v_escrow.held_amount,updated_at=now()
  WHERE user_id=v_payee;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payee profile not found'; END IF;

  UPDATE public.developer_escrows
  SET status='released',released_at=now(),payee_user_id=v_payee,
      payout_reference='esc_rel_'||v_escrow.escrow_id
  WHERE escrow_id=p_escrow_id AND developer_id=p_developer_id;

  v_ref:='esc_rel_'||v_escrow.escrow_id;
  INSERT INTO public.wallet_transactions(user_id,amount,kind,status,reference,metadata)
  VALUES(v_payee,v_escrow.held_amount,'developer_escrow_release','completed',v_ref,
    jsonb_build_object('escrow_id',v_escrow.escrow_id,'developer_id',p_developer_id));

  RETURN jsonb_build_object('ok',true,'escrow_id',v_escrow.escrow_id,
    'amount',v_escrow.held_amount,'payee_user_id',v_payee,'released_at',now());
END;
$$;

-- Tighten execution grants for the corrected RPCs.
REVOKE ALL ON FUNCTION public.propose_safepay(uuid,uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.propose_safepay(uuid,uuid,integer) TO authenticated;
REVOKE ALL ON FUNCTION public.accept_safepay(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.accept_safepay(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.cancel_safepay_proposal(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cancel_safepay_proposal(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.mark_safepay_complete(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.mark_safepay_complete(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.release_safepay_funds(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.release_safepay_funds(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.file_dispute_safepay(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.file_dispute_safepay(uuid,text) TO authenticated;
REVOKE ALL ON FUNCTION public.raise_safepay_dispute(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.raise_safepay_dispute(uuid,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.cancel_gig_order(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cancel_gig_order(uuid,text) TO authenticated;
REVOKE ALL ON FUNCTION public.auto_release_safepay() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.auto_release_safepay() TO service_role;
REVOKE ALL ON FUNCTION public.fund_developer_escrow(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fund_developer_escrow(uuid,text) TO service_role;
REVOKE ALL ON FUNCTION public.refund_developer_escrow(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.refund_developer_escrow(uuid,text,text) TO service_role;
REVOKE ALL ON FUNCTION public.release_developer_escrow(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.release_developer_escrow(uuid,text) TO service_role;
REVOKE ALL ON FUNCTION public.admin_resolve_safepay_dispute(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_resolve_safepay_dispute(uuid,text,text) TO authenticated;


-- 11) Harden gig checkout against mismatched seller IDs and divergent wallet
-- columns. Both balances must cover the escrow debit.
CREATE OR REPLACE FUNCTION public.place_gig_order(
  p_gig_id uuid,p_seller_id uuid,p_title text,p_description text,
  p_amount numeric,p_delivery_days integer,p_tier text DEFAULT NULL,p_milestones jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  v_buyer uuid:=auth.uid();
  v_balance numeric;
  v_wallet numeric;
  v_gig_seller uuid;
  v_order_id uuid;
  v_platform_fee numeric;
  v_deadline timestamptz;
  v_ms_sum numeric:=0;
  v_ms jsonb;
  v_idx integer:=0;
BEGIN
  IF v_buyer IS NULL THEN
    RETURN jsonb_build_object('success',false,'error','Not authenticated');
  END IF;
  IF p_seller_id IS NULL OR v_buyer=p_seller_id THEN
    RETURN jsonb_build_object('success',false,'error','Invalid seller');
  END IF;
  IF p_amount IS NULL OR p_amount<=0 OR NULLIF(trim(COALESCE(p_title,'')),'') IS NULL THEN
    RETURN jsonb_build_object('success',false,'error','Invalid order details');
  END IF;
  IF p_delivery_days IS NULL OR p_delivery_days<1 OR p_delivery_days>365 THEN
    RETURN jsonb_build_object('success',false,'error','Delivery period must be between 1 and 365 days');
  END IF;

  SELECT user_id INTO v_gig_seller
  FROM public.jobs_services
  WHERE id=p_gig_id AND status='active'
  FOR SHARE;
  IF NOT FOUND OR v_gig_seller IS DISTINCT FROM p_seller_id THEN
    RETURN jsonb_build_object('success',false,'error','Gig is unavailable or seller does not match the gig owner');
  END IF;

  IF p_milestones IS NOT NULL AND jsonb_typeof(p_milestones)<>'array' THEN
    RETURN jsonb_build_object('success',false,'error','Milestones must be an array');
  END IF;
  IF p_milestones IS NOT NULL AND jsonb_array_length(p_milestones)>0 THEN
    IF jsonb_array_length(p_milestones)>50 THEN
      RETURN jsonb_build_object('success',false,'error','A maximum of 50 milestones is allowed');
    END IF;
    FOR v_ms IN SELECT * FROM jsonb_array_elements(p_milestones) LOOP
      IF COALESCE(NULLIF(v_ms->>'amount','')::numeric,0)<=0 THEN
        RETURN jsonb_build_object('success',false,'error','Every milestone must have a positive amount');
      END IF;
      v_ms_sum:=v_ms_sum+(v_ms->>'amount')::numeric;
    END LOOP;
    IF ROUND(v_ms_sum,2)<>ROUND(p_amount,2) THEN
      RETURN jsonb_build_object('success',false,'error','Milestones total must equal order amount');
    END IF;
  END IF;

  SELECT balance_withdrawable,wallet_balance INTO v_balance,v_wallet
  FROM public.profiles WHERE user_id=v_buyer FOR UPDATE;
  IF NOT FOUND OR COALESCE(v_balance,0)<p_amount OR COALESCE(v_wallet,0)<p_amount THEN
    RETURN jsonb_build_object('success',false,'error','Insufficient available NC balance');
  END IF;

  v_platform_fee:=ROUND(p_amount*0.05,2);
  v_deadline:=now()+make_interval(days=>p_delivery_days);

  UPDATE public.profiles
  SET balance_withdrawable=balance_withdrawable-p_amount,
      wallet_balance=COALESCE(wallet_balance,0)-p_amount,updated_at=now()
  WHERE user_id=v_buyer;

  INSERT INTO public.gig_orders(
    gig_id,buyer_id,seller_id,title,description,amount,platform_fee,status,delivery_deadline,buyer_notes
  ) VALUES(
    p_gig_id,v_buyer,p_seller_id,
    CASE WHEN p_tier IS NULL OR p_tier='' THEN trim(p_title) ELSE upper(p_tier)||' • '||trim(p_title) END,
    p_description,p_amount,v_platform_fee,'pending',v_deadline,p_description
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.wallet_transactions(user_id,kind,amount,status,reference,metadata)
  VALUES(v_buyer,'gig_order_hold',-p_amount,'completed',
    'Gig order escrow: '||trim(p_title),
    jsonb_build_object('order_id',v_order_id,'gig_id',p_gig_id,'seller_id',p_seller_id,'tier',p_tier));

  IF p_milestones IS NOT NULL AND jsonb_array_length(p_milestones)>0 THEN
    FOR v_ms IN SELECT * FROM jsonb_array_elements(p_milestones) LOOP
      v_idx:=v_idx+1;
      INSERT INTO public.project_milestones(order_id,title,description,amount,due_date,status,order_index)
      VALUES(v_order_id,COALESCE(NULLIF(v_ms->>'title',''),'Milestone '||v_idx),
        v_ms->>'description',(v_ms->>'amount')::numeric,
        NULLIF(v_ms->>'due_date','')::timestamptz,'pending',v_idx);
    END LOOP;
  END IF;

  RETURN jsonb_build_object('success',true,'order_id',v_order_id);
END;
$$;
REVOKE ALL ON FUNCTION public.place_gig_order(uuid,uuid,text,text,numeric,integer,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.place_gig_order(uuid,uuid,text,text,numeric,integer,text,jsonb) TO authenticated;


-- Auto-release and buyer-initiated release both lock the SafePay row. SKIP
-- LOCKED prevents a scheduled payout racing a manual buyer release.
CREATE OR REPLACE FUNCTION public.auto_release_safepay()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  v_tx record;
BEGIN
  FOR v_tx IN
    SELECT id,buyer_id,seller_id,amount
    FROM public.safepay_transactions
    WHERE status='complete' AND auto_release_at<=now()
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.user_wallets
    SET escrow_hold=GREATEST(0,COALESCE(escrow_hold,0)-v_tx.amount),updated_at=now()
    WHERE user_id=v_tx.buyer_id;

    UPDATE public.profiles
    SET wallet_balance=COALESCE(wallet_balance,0)+v_tx.amount,
        balance_withdrawable=balance_withdrawable+v_tx.amount,updated_at=now()
    WHERE user_id=v_tx.seller_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Seller profile not found for SafePay auto-release'; END IF;

    INSERT INTO public.wallet_transactions(user_id,safepay_id,kind,amount,status,reference)
    VALUES(v_tx.seller_id,v_tx.id,'payment_received',v_tx.amount,'completed','SafePay auto-released');

    UPDATE public.safepay_transactions
    SET status='released',released_at=now(),updated_at=now()
    WHERE id=v_tx.id;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.auto_release_safepay() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.auto_release_safepay() TO service_role;


-- Resolve developer payout email addresses against auth.users (profiles has no email column).
CREATE OR REPLACE FUNCTION public.resolve_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
  SELECT id FROM auth.users
  WHERE lower(email)=lower(trim(COALESCE(p_email,'')))
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.resolve_user_id_by_email(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_user_id_by_email(text) TO service_role;


-- Keep seller dashboards and existing buyer entitlements working when a
-- product is no longer publicly active.
DROP POLICY IF EXISTS "Sellers can view their own digital products" ON public.digital_products;
CREATE POLICY "Sellers can view their own digital products"
ON public.digital_products FOR SELECT TO authenticated
USING (auth.uid()=user_id);

DROP POLICY IF EXISTS "Buyers can view purchased digital products" ON public.digital_products;
CREATE POLICY "Buyers can view purchased digital products"
ON public.digital_products FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.digital_product_purchases purchase
  WHERE purchase.product_id=digital_products.id AND purchase.buyer_id=auth.uid()
));


-- Break the reciprocal RLS lookup between digital_products and
-- digital_product_purchases with narrow SECURITY DEFINER predicates.
CREATE OR REPLACE FUNCTION public.can_view_purchased_digital_product(p_product_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.digital_product_purchases
    WHERE product_id=p_product_id AND buyer_id=auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.is_digital_product_owner(p_product_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.digital_products
    WHERE id=p_product_id AND user_id=auth.uid()
  )
$$;

REVOKE ALL ON FUNCTION public.can_view_purchased_digital_product(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_view_purchased_digital_product(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.is_digital_product_owner(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_digital_product_owner(uuid) TO authenticated;

DROP POLICY IF EXISTS "Buyers can view purchased digital products" ON public.digital_products;
CREATE POLICY "Buyers can view purchased digital products"
ON public.digital_products FOR SELECT TO authenticated
USING (public.can_view_purchased_digital_product(id));

DROP POLICY IF EXISTS "Product owners can view purchases" ON public.digital_product_purchases;
CREATE POLICY "Product owners can view purchases"
ON public.digital_product_purchases FOR SELECT TO authenticated
USING (public.is_digital_product_owner(product_id));


-- 12) Developer charge sessions are paid by the authenticated session user.
-- Use the current wallet ledger schema and keep the debit/credit atomic.
CREATE OR REPLACE FUNCTION public.developer_charge_consume_atomic(
  p_session_id text,p_payer_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  v_session public.developer_charge_sessions%ROWTYPE;
  v_wallet numeric;
  v_withdrawable numeric;
  v_non_withdrawable numeric;
  v_developer_wallet numeric;
  v_ref text;
  v_deduct_withdrawable numeric;
  v_deduct_non_withdrawable numeric;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_payer_user_id THEN
    RETURN jsonb_build_object('ok',false,'error','You can only pay from your own account');
  END IF;
  SELECT * INTO v_session FROM public.developer_charge_sessions
  WHERE session_id=p_session_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','Session not found'); END IF;
  IF v_session.status<>'pending' THEN
    RETURN jsonb_build_object('ok',false,'error','Session already '||v_session.status);
  END IF;
  IF v_session.expires_at<now() THEN
    UPDATE public.developer_charge_sessions SET status='expired',updated_at=now() WHERE id=v_session.id;
    RETURN jsonb_build_object('ok',false,'error','Session expired');
  END IF;
  IF v_session.developer_id=p_payer_user_id THEN
    RETURN jsonb_build_object('ok',false,'error','Cannot pay yourself');
  END IF;
  IF v_session.amount IS NULL OR v_session.amount<=0 THEN
    RETURN jsonb_build_object('ok',false,'error','Invalid charge amount');
  END IF;

  PERFORM 1 FROM public.profiles
  WHERE user_id IN (p_payer_user_id,v_session.developer_id)
  ORDER BY user_id FOR UPDATE;

  SELECT wallet_balance,balance_withdrawable,balance_non_withdrawable
  INTO v_wallet,v_withdrawable,v_non_withdrawable
  FROM public.profiles WHERE user_id=p_payer_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','Payer wallet not found'); END IF;
  IF COALESCE(v_wallet,0)<v_session.amount
    OR COALESCE(v_withdrawable,0)+COALESCE(v_non_withdrawable,0)<v_session.amount THEN
    RETURN jsonb_build_object('ok',false,'error','Insufficient available balance');
  END IF;
  SELECT wallet_balance INTO v_developer_wallet
  FROM public.profiles WHERE user_id=v_session.developer_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','Developer wallet missing'); END IF;

  v_deduct_withdrawable:=LEAST(COALESCE(v_withdrawable,0),v_session.amount);
  v_deduct_non_withdrawable:=v_session.amount-v_deduct_withdrawable;
  v_ref:='dev_charge_'||v_session.session_id;

  UPDATE public.profiles SET
    wallet_balance=COALESCE(wallet_balance,0)-v_session.amount,
    balance_withdrawable=COALESCE(balance_withdrawable,0)-v_deduct_withdrawable,
    balance_non_withdrawable=COALESCE(balance_non_withdrawable,0)-v_deduct_non_withdrawable,
    updated_at=now()
  WHERE user_id=p_payer_user_id;

  UPDATE public.profiles SET
    wallet_balance=COALESCE(wallet_balance,0)+v_session.amount,
    balance_withdrawable=COALESCE(balance_withdrawable,0)+v_session.amount,
    updated_at=now()
  WHERE user_id=v_session.developer_id;

  INSERT INTO public.wallet_transactions(user_id,currency,kind,amount,status,reference,metadata)
  VALUES
    (p_payer_user_id,'NC','developer_charge',-v_session.amount,'completed',v_ref,
      jsonb_build_object('developer_id',v_session.developer_id,'description',v_session.description)),
    (v_session.developer_id,'NC','developer_charge_received',v_session.amount,'completed',v_ref,
      jsonb_build_object('payer_user_id',p_payer_user_id,'description',v_session.description));

  UPDATE public.developer_charge_sessions
  SET status='completed',payer_user_id=p_payer_user_id,reference=v_ref,
      completed_at=now(),updated_at=now()
  WHERE id=v_session.id;

  RETURN jsonb_build_object('ok',true,'reference',v_ref,'amount',v_session.amount,
    'developer_id',v_session.developer_id,'payer_balance_after',v_wallet-v_session.amount);
END;
$$;
REVOKE ALL ON FUNCTION public.developer_charge_consume_atomic(text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.developer_charge_consume_atomic(text,uuid) TO authenticated;

-- 13) Mini-app payments are self-funded; mini-app payouts can only be initiated
-- by that mini-app's registered developer.
CREATE OR REPLACE FUNCTION public.process_mini_app_payment(
  p_user_id uuid,p_mini_app_id uuid,p_amount numeric,p_description text,p_tx_ref text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  v_actor uuid:=auth.uid();
  v_wallet numeric;
  v_withdrawable numeric;
  v_non_withdrawable numeric;
  v_developer_id uuid;
  v_rate numeric;
  v_developer_amount numeric;
  v_commission numeric;
  v_deduct_withdrawable numeric;
  v_deduct_non_withdrawable numeric;
  v_app_name text;
BEGIN
  IF v_actor IS NULL OR v_actor IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('success',false,'error','You can only pay from your own account');
  END IF;
  IF p_amount IS NULL OR p_amount<=0 OR NULLIF(trim(COALESCE(p_tx_ref,'')),'') IS NULL THEN
    RETURN jsonb_build_object('success',false,'error','Invalid payment details');
  END IF;

  SELECT developer_id,commission_rate,app_name INTO v_developer_id,v_rate,v_app_name
  FROM public.mini_apps WHERE id=p_mini_app_id AND status='approved' FOR SHARE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Mini app is not approved or available'); END IF;
  IF v_developer_id=p_user_id THEN
    RETURN jsonb_build_object('success',false,'error','You cannot pay your own mini app');
  END IF;

  PERFORM 1 FROM public.profiles
  WHERE user_id IN (p_user_id,v_developer_id)
  ORDER BY user_id FOR UPDATE;

  SELECT wallet_balance,balance_withdrawable,balance_non_withdrawable
  INTO v_wallet,v_withdrawable,v_non_withdrawable
  FROM public.profiles WHERE user_id=p_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','User wallet not found'); END IF;
  IF COALESCE(v_wallet,0)<p_amount
    OR COALESCE(v_withdrawable,0)+COALESCE(v_non_withdrawable,0)<p_amount THEN
    RETURN jsonb_build_object('success',false,'error','Insufficient balance');
  END IF;

  v_rate:=COALESCE(v_rate,0.10);
  IF v_rate<0 OR v_rate>1 THEN RAISE EXCEPTION 'Mini-app commission rate is invalid'; END IF;
  v_commission:=ROUND(p_amount*v_rate,2);
  v_developer_amount:=p_amount-v_commission;
  v_deduct_withdrawable:=LEAST(COALESCE(v_withdrawable,0),p_amount);
  v_deduct_non_withdrawable:=p_amount-v_deduct_withdrawable;

  UPDATE public.profiles SET
    wallet_balance=COALESCE(wallet_balance,0)-p_amount,
    balance_withdrawable=COALESCE(balance_withdrawable,0)-v_deduct_withdrawable,
    balance_non_withdrawable=COALESCE(balance_non_withdrawable,0)-v_deduct_non_withdrawable,
    updated_at=now()
  WHERE user_id=p_user_id;

  UPDATE public.profiles SET
    wallet_balance=COALESCE(wallet_balance,0)+v_developer_amount,
    balance_withdrawable=COALESCE(balance_withdrawable,0)+v_developer_amount,
    updated_at=now()
  WHERE user_id=v_developer_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mini-app developer wallet not found'; END IF;

  UPDATE public.admin_wallet SET balance=balance+v_commission,updated_at=now() WHERE id=1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Platform commission wallet is unavailable'; END IF;

  INSERT INTO public.mini_app_transactions(
    mini_app_id,user_id,amount,description,tx_ref,status,
    developer_amount,commission_amount,developer_credited
  ) VALUES(p_mini_app_id,p_user_id,p_amount,p_description,p_tx_ref,'completed',
    v_developer_amount,v_commission,true);

  UPDATE public.mini_apps SET total_earnings=COALESCE(total_earnings,0)+v_developer_amount,updated_at=now()
  WHERE id=p_mini_app_id;

  INSERT INTO public.wallet_transactions(user_id,currency,kind,amount,status,reference,metadata)
  VALUES
    (p_user_id,'NC','mini_app_payment',-p_amount,'completed',p_tx_ref,
      jsonb_build_object('mini_app_id',p_mini_app_id,'description',p_description)),
    (v_developer_id,'NC','mini_app_earning',v_developer_amount,'completed',p_tx_ref,
      jsonb_build_object('mini_app_id',p_mini_app_id,'description',p_description));

  RETURN jsonb_build_object('success',true,'tx_ref',p_tx_ref,
    'developer_amount',v_developer_amount,'commission_amount',v_commission);
END;
$$;
REVOKE ALL ON FUNCTION public.process_mini_app_payment(uuid,uuid,numeric,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.process_mini_app_payment(uuid,uuid,numeric,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.process_mini_app_payout(
  p_mini_app_id uuid,p_user_id uuid,p_amount numeric,p_description text,p_tx_ref text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  v_actor uuid:=auth.uid();
  v_developer_id uuid;
  v_wallet numeric;
  v_withdrawable numeric;
  v_app_name text;
BEGIN
  IF p_user_id IS NULL OR p_amount IS NULL OR p_amount<=0
    OR NULLIF(trim(COALESCE(p_tx_ref,'')),'') IS NULL THEN
    RETURN jsonb_build_object('success',false,'error','Invalid payout details');
  END IF;

  SELECT developer_id,app_name INTO v_developer_id,v_app_name
  FROM public.mini_apps WHERE id=p_mini_app_id AND status='approved' FOR SHARE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Mini app is not approved or available'); END IF;
  IF COALESCE(auth.role(),'')<>'service_role' AND v_actor IS DISTINCT FROM v_developer_id THEN
    RETURN jsonb_build_object('success',false,'error','Only a trusted developer payout service can issue mini-app payouts');
  END IF;

  PERFORM 1 FROM public.profiles
  WHERE user_id IN (v_developer_id,p_user_id)
  ORDER BY user_id FOR UPDATE;

  SELECT wallet_balance,balance_withdrawable INTO v_wallet,v_withdrawable
  FROM public.profiles WHERE user_id=v_developer_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Developer wallet not found'); END IF;
  IF COALESCE(v_wallet,0)<p_amount OR COALESCE(v_withdrawable,0)<p_amount THEN
    RETURN jsonb_build_object('success',false,'error','Insufficient withdrawable balance');
  END IF;

  UPDATE public.profiles SET
    wallet_balance=COALESCE(wallet_balance,0)-p_amount,
    balance_withdrawable=COALESCE(balance_withdrawable,0)-p_amount,
    updated_at=now()
  WHERE user_id=v_developer_id;

  UPDATE public.profiles SET
    wallet_balance=COALESCE(wallet_balance,0)+p_amount,
    balance_withdrawable=COALESCE(balance_withdrawable,0)+p_amount,
    updated_at=now()
  WHERE user_id=p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payout recipient not found'; END IF;

  INSERT INTO public.mini_app_transactions(
    mini_app_id,user_id,amount,description,tx_ref,status,
    developer_amount,commission_amount,developer_credited,charge_type
  ) VALUES(p_mini_app_id,p_user_id,p_amount,p_description,p_tx_ref,'completed',
    -p_amount,0,true,'payout');

  INSERT INTO public.wallet_transactions(user_id,currency,kind,amount,status,reference,metadata)
  VALUES
    (v_developer_id,'NC','mini_app_payout',-p_amount,'completed',p_tx_ref,
      jsonb_build_object('mini_app_id',p_mini_app_id,'recipient_user_id',p_user_id,'description',p_description)),
    (p_user_id,'NC','mini_app_payout_received',p_amount,'completed',p_tx_ref,
      jsonb_build_object('mini_app_id',p_mini_app_id,'developer_id',v_developer_id,'description',p_description));

  RETURN jsonb_build_object('success',true,'tx_ref',p_tx_ref,'amount',p_amount);
END;
$$;
REVOKE ALL ON FUNCTION public.process_mini_app_payout(uuid,uuid,numeric,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.process_mini_app_payout(uuid,uuid,numeric,text,text) TO service_role;

-- 14) Course enrollment must check both wallet totals before debiting.
CREATE OR REPLACE FUNCTION public.enroll_in_course(p_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  v_user uuid:=auth.uid();
  v_course public.courses%ROWTYPE;
  v_withdrawable numeric;
  v_wallet numeric;
  v_fee numeric;
  v_instructor numeric;
  v_enrollment_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_course FROM public.courses WHERE id=p_course_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Course not found'; END IF;
  IF v_course.is_demo THEN RAISE EXCEPTION 'Demo courses cannot be purchased'; END IF;
  IF v_course.price IS NULL OR v_course.price<=0 THEN RAISE EXCEPTION 'Course price is invalid'; END IF;
  IF v_course.status<>'active'::public.course_status OR v_course.moderation_status<>'approved' THEN
    RAISE EXCEPTION 'This course is not available for enrollment';
  END IF;
  IF COALESCE(jsonb_array_length(v_course.course_urls),0)<1 THEN
    RAISE EXCEPTION 'This course has no lessons yet and cannot be purchased';
  END IF;
  IF v_course.user_id=v_user THEN RAISE EXCEPTION 'You cannot enroll in your own course'; END IF;
  IF EXISTS(SELECT 1 FROM public.course_enrollments WHERE course_id=p_course_id AND student_id=v_user) THEN
    RAISE EXCEPTION 'You are already enrolled in this course';
  END IF;

  SELECT balance_withdrawable,wallet_balance INTO v_withdrawable,v_wallet
  FROM public.profiles WHERE user_id=v_user FOR UPDATE;
  IF NOT FOUND OR COALESCE(v_withdrawable,0)<v_course.price OR COALESCE(v_wallet,0)<v_course.price THEN
    RAISE EXCEPTION 'Insufficient available NC balance';
  END IF;

  v_fee:=ROUND(v_course.price*0.05,2);
  v_instructor:=v_course.price-v_fee;

  UPDATE public.profiles SET
    balance_withdrawable=COALESCE(balance_withdrawable,0)-v_course.price,
    wallet_balance=COALESCE(wallet_balance,0)-v_course.price,updated_at=now()
  WHERE user_id=v_user;

  INSERT INTO public.course_enrollments(course_id,student_id,amount,escrow_status,platform_fee,instructor_amount,release_due_at)
  VALUES(p_course_id,v_user,v_course.price,'held',v_fee,v_instructor,now()+interval '7 days')
  RETURNING id INTO v_enrollment_id;

  INSERT INTO public.course_progress(course_id,student_id)
  VALUES(p_course_id,v_user) ON CONFLICT DO NOTHING;

  UPDATE public.courses SET enrollment_count=COALESCE(enrollment_count,0)+1 WHERE id=p_course_id;

  INSERT INTO public.wallet_transactions(user_id,currency,kind,amount,status,reference,metadata)
  VALUES(v_user,'NC','course_enrollment',-v_course.price,'completed',
    'Enrollment (escrow): '||v_course.title,
    jsonb_build_object('course_id',p_course_id,'enrollment_id',v_enrollment_id));

  INSERT INTO public.notifications(user_id,title,message,type)
  VALUES(v_course.user_id,'New course enrollment',
    'A student enrolled in "'||v_course.title||'". Funds are held in escrow for 7 days.','course');

  RETURN jsonb_build_object('enrollment_id',v_enrollment_id,'amount',v_course.price,'escrow_status','held');
END;
$$;
REVOKE ALL ON FUNCTION public.enroll_in_course(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.enroll_in_course(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.refund_course_enrollment(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.refund_course_enrollment(uuid,text) TO authenticated;

-- Automatic course escrow release is a scheduled/service operation. Individual
-- student/admin release can be handled by a separately authorized path.
REVOKE ALL ON FUNCTION public.release_course_escrow(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.release_course_escrow(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.process_ivorypay_deposit(uuid,text,numeric,numeric,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.process_ivorypay_deposit(uuid,text,numeric,numeric,text,text) TO service_role;


-- 15) Admin role RPCs must fail closed when get_user_admin_role() returns NULL.
-- Only super_admin may grant the admin role; admins may grant/revoke moderators.
CREATE OR REPLACE FUNCTION public.grant_admin_role(
  target_user_id uuid,target_role public.user_role DEFAULT 'moderator'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  caller_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success',false,'error','Authentication required');
  END IF;
  caller_role:=public.get_user_admin_role();
  IF caller_role IS NULL THEN
    RETURN jsonb_build_object('success',false,'error','Admin access required');
  END IF;
  IF target_user_id IS NULL THEN
    RETURN jsonb_build_object('success',false,'error','Target user is required');
  END IF;
  IF target_role='super_admin' THEN
    RETURN jsonb_build_object('success',false,'error','Cannot grant super_admin role');
  END IF;
  IF target_role='admin' AND caller_role<>'super_admin' THEN
    RETURN jsonb_build_object('success',false,'error','Only super admins can grant admin role');
  END IF;
  IF target_role='moderator' AND caller_role NOT IN ('super_admin','admin') THEN
    RETURN jsonb_build_object('success',false,'error','Only admins can grant moderator role');
  END IF;
  INSERT INTO public.user_roles(user_id,role,granted_by)
  VALUES(target_user_id,target_role,auth.uid())
  ON CONFLICT(user_id,role) DO NOTHING;
  RETURN jsonb_build_object('success',true);
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_admin_role(
  target_user_id uuid,target_role public.user_role
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  caller_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success',false,'error','Authentication required');
  END IF;
  caller_role:=public.get_user_admin_role();
  IF caller_role IS NULL THEN
    RETURN jsonb_build_object('success',false,'error','Admin access required');
  END IF;
  IF target_role='super_admin' THEN
    RETURN jsonb_build_object('success',false,'error','Cannot revoke super_admin role');
  END IF;
  IF target_user_id=auth.uid() THEN
    RETURN jsonb_build_object('success',false,'error','Cannot revoke your own role');
  END IF;
  IF target_role='admin' AND caller_role<>'super_admin' THEN
    RETURN jsonb_build_object('success',false,'error','Only super admins can revoke admin role');
  END IF;
  IF target_role='moderator' AND caller_role NOT IN ('super_admin','admin') THEN
    RETURN jsonb_build_object('success',false,'error','Only admins can revoke moderator role');
  END IF;
  DELETE FROM public.user_roles WHERE user_id=target_user_id AND role=target_role;
  RETURN jsonb_build_object('success',true);
END;
$$;

-- Legacy one-argument grant is service-role-only; browser admin setup now calls
-- the role-aware two-argument RPC.
CREATE OR REPLACE FUNCTION public.grant_admin_role(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
  IF COALESCE(auth.role(),'')<>'service_role' THEN
    RAISE EXCEPTION 'Use the role-aware admin grant flow';
  END IF;
  INSERT INTO public.user_roles(user_id,role,granted_by)
  VALUES(target_user_id,'admin',NULL)
  ON CONFLICT(user_id,role) DO NOTHING;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_admin_role(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.grant_admin_role(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.grant_admin_role(uuid,public.user_role) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.grant_admin_role(uuid,public.user_role) TO authenticated;
REVOKE ALL ON FUNCTION public.revoke_admin_role(uuid,public.user_role) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.revoke_admin_role(uuid,public.user_role) TO authenticated;

-- 16) Fundraising release is a one-time admin settlement.
CREATE OR REPLACE FUNCTION public.admin_release_fundraising_funds(
  p_fundraising_id uuid,p_admin_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
  v_actor uuid:=auth.uid();
  v_amount numeric;
  v_owner uuid;
  v_held boolean;
  v_released_at timestamptz;
  v_admin_balance numeric;
BEGIN
  IF v_actor IS NULL OR NOT public.is_admin_user() THEN
    RETURN jsonb_build_object('success',false,'error','Admin authentication required');
  END IF;

  SELECT raised_amount,user_id,funds_held_by_admin,funds_released_at
  INTO v_amount,v_owner,v_held,v_released_at
  FROM public.fundraisings WHERE id=p_fundraising_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Fundraising campaign not found'); END IF;
  IF v_held IS DISTINCT FROM TRUE OR v_released_at IS NOT NULL THEN
    RETURN jsonb_build_object('success',false,'error','Funds have already been released or are not held by admin');
  END IF;
  IF v_amount IS NULL OR v_amount<=0 THEN
    RETURN jsonb_build_object('success',false,'error','There are no funds to release');
  END IF;

  SELECT balance INTO v_admin_balance FROM public.admin_wallet WHERE id=1 FOR UPDATE;
  IF NOT FOUND OR COALESCE(v_admin_balance,0)<v_amount THEN
    RETURN jsonb_build_object('success',false,'error','Insufficient admin funds');
  END IF;
  PERFORM 1 FROM public.profiles WHERE user_id=v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campaign owner wallet not found'; END IF;

  UPDATE public.admin_wallet SET balance=balance-v_amount,updated_at=now() WHERE id=1;
  UPDATE public.profiles
  SET wallet_balance=COALESCE(wallet_balance,0)+v_amount,
      balance_withdrawable=COALESCE(balance_withdrawable,0)+v_amount,updated_at=now()
  WHERE user_id=v_owner;
  UPDATE public.fundraisings
  SET funds_held_by_admin=false,funds_released_at=now()
  WHERE id=p_fundraising_id;

  INSERT INTO public.wallet_transactions(user_id,currency,kind,amount,status,reference,metadata)
  VALUES(v_owner,'NC','fundraising_release',v_amount,'completed',
    'Fundraising funds released by admin',
    jsonb_build_object('fundraising_id',p_fundraising_id,'released_by',v_actor));

  RETURN jsonb_build_object('success',true,'amount',v_amount);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_release_fundraising_funds(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_release_fundraising_funds(uuid,uuid) TO authenticated;
