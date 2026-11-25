-- Contract negotiation, immutable revision snapshots, and atomic escrow funding.
-- Safe to apply once: all DDL is idempotent and RPCs enforce party authorization.

ALTER TABLE public.hire_contracts
  ADD COLUMN IF NOT EXISTS revision_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS change_request text;

CREATE TABLE IF NOT EXISTS public.hire_contract_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.hire_contracts(id) ON DELETE CASCADE,
  revision_number integer NOT NULL,
  title text NOT NULL,
  scope text NOT NULL,
  contract_type text NOT NULL CHECK (contract_type IN ('fixed','hourly')),
  total_amount numeric NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  hourly_rate numeric CHECK (hourly_rate IS NULL OR hourly_rate >= 0),
  weekly_cap_hours numeric CHECK (weekly_cap_hours IS NULL OR weekly_cap_hours BETWEEN 1 AND 168),
  deposit_amount numeric NOT NULL DEFAULT 0 CHECK (deposit_amount >= 0),
  deadline timestamptz,
  change_request text,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contract_id, revision_number)
);

ALTER TABLE public.hire_contract_revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hire_contract_revisions FROM anon, authenticated;
GRANT SELECT ON public.hire_contract_revisions TO authenticated;
DROP POLICY IF EXISTS "Contract parties view revisions" ON public.hire_contract_revisions;
CREATE POLICY "Contract parties view revisions" ON public.hire_contract_revisions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.hire_contracts c
    WHERE c.id = contract_id AND auth.uid() IN (c.client_id, c.expert_id)
  ));

CREATE OR REPLACE FUNCTION public.request_hire_contract_changes(p_contract_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_c public.hire_contracts%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN RETURN jsonb_build_object('success',false,'error','Not authenticated'); END IF;
  IF length(trim(coalesce(p_reason,''))) < 5 THEN
    RETURN jsonb_build_object('success',false,'error','Please explain the requested changes');
  END IF;

  SELECT * INTO v_c FROM public.hire_contracts WHERE id=p_contract_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Contract not found'); END IF;
  IF v_actor IS DISTINCT FROM v_c.expert_id THEN
    RETURN jsonb_build_object('success',false,'error','Only the expert can request changes');
  END IF;
  IF v_c.status NOT IN ('pending_expert_signature','pending_client_signature')
     OR v_c.expert_signed_at IS NOT NULL OR coalesce(v_c.escrow_held,0) > 0 THEN
    RETURN jsonb_build_object('success',false,'error','This contract can no longer be revised');
  END IF;

  INSERT INTO public.hire_contract_revisions(
    contract_id,revision_number,title,scope,contract_type,total_amount,hourly_rate,
    weekly_cap_hours,deposit_amount,deadline,change_request,actor_id
  ) VALUES (
    v_c.id,coalesce(v_c.revision_number,1),v_c.title,v_c.scope,v_c.contract_type,
    coalesce(v_c.total_amount,0),v_c.hourly_rate,v_c.weekly_cap_hours,
    coalesce(v_c.deposit_amount,0),v_c.deadline,trim(p_reason),v_actor
  )
  ON CONFLICT (contract_id,revision_number) DO UPDATE
    SET change_request=EXCLUDED.change_request,actor_id=EXCLUDED.actor_id,created_at=now();

  UPDATE public.hire_contracts
  SET status='changes_requested',change_request=trim(p_reason),
      client_signature=NULL,expert_signature=NULL,client_signed_at=NULL,expert_signed_at=NULL,
      pdf_url=NULL,updated_at=now()
  WHERE id=p_contract_id;

  INSERT INTO public.hire_contract_events(contract_id,actor_id,event_type,payload)
  VALUES (p_contract_id,v_actor,'changes_requested',
    jsonb_build_object('reason',trim(p_reason),'revision_number',coalesce(v_c.revision_number,1)));
  RETURN jsonb_build_object('success',true);
END;
$$;

CREATE OR REPLACE FUNCTION public.revise_hire_contract(
  p_contract_id uuid,p_title text,p_scope text,p_contract_type text,
  p_total_amount numeric,p_hourly_rate numeric,p_weekly_cap_hours numeric,
  p_deposit_amount numeric,p_deadline timestamptz
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_c public.hire_contracts%ROWTYPE;
  v_next integer;
BEGIN
  IF v_actor IS NULL THEN RETURN jsonb_build_object('success',false,'error','Not authenticated'); END IF;
  SELECT * INTO v_c FROM public.hire_contracts WHERE id=p_contract_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Contract not found'); END IF;
  IF v_actor IS DISTINCT FROM v_c.client_id THEN
    RETURN jsonb_build_object('success',false,'error','Only the client can revise this contract');
  END IF;
  IF v_c.status<>'changes_requested' OR coalesce(v_c.escrow_held,0)>0 THEN
    RETURN jsonb_build_object('success',false,'error','The expert must request changes before revision');
  END IF;
  IF length(trim(coalesce(p_title,'')))=0 OR length(trim(coalesce(p_scope,'')))=0
     OR p_contract_type NOT IN ('fixed','hourly') THEN
    RETURN jsonb_build_object('success',false,'error','Invalid contract details');
  END IF;
  IF p_contract_type='fixed' AND coalesce(p_total_amount,0)<=0 THEN
    RETURN jsonb_build_object('success',false,'error','Fixed contracts require a positive total amount');
  END IF;
  IF p_contract_type='hourly' AND (
      coalesce(p_hourly_rate,0)<=0 OR coalesce(p_weekly_cap_hours,0) NOT BETWEEN 1 AND 168
      OR coalesce(p_deposit_amount,0)<=0
  ) THEN
    RETURN jsonb_build_object('success',false,'error','Hourly contracts require a positive rate, deposit, and weekly cap between 1 and 168 hours');
  END IF;

  v_next:=coalesce(v_c.revision_number,1)+1;
  UPDATE public.hire_contracts SET
    title=trim(p_title),scope=trim(p_scope),contract_type=p_contract_type,
    total_amount=CASE WHEN p_contract_type='fixed' THEN p_total_amount ELSE 0 END,
    hourly_rate=CASE WHEN p_contract_type='hourly' THEN p_hourly_rate ELSE NULL END,
    weekly_cap_hours=CASE WHEN p_contract_type='hourly' THEN p_weekly_cap_hours ELSE NULL END,
    deposit_amount=CASE WHEN p_contract_type='hourly' THEN p_deposit_amount ELSE 0 END,
    deadline=p_deadline,revision_number=v_next,change_request=NULL,
    status='pending_expert_signature',client_signature=NULL,expert_signature=NULL,
    client_signed_at=NULL,expert_signed_at=NULL,pdf_url=NULL,updated_at=now()
  WHERE id=p_contract_id;

  INSERT INTO public.hire_contract_events(contract_id,actor_id,event_type,payload)
  VALUES (p_contract_id,v_actor,'revised',jsonb_build_object('revision_number',v_next));
  RETURN jsonb_build_object('success',true,'revision_number',v_next);
END;
$$;

-- Final signature and escrow debit are one database transaction. Both wallet
-- totals must cover the debit; this avoids creating negative balances where
-- historical profile totals are inconsistent.
CREATE OR REPLACE FUNCTION public.sign_hire_contract(p_contract_id uuid,p_signature text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_c public.hire_contracts%ROWTYPE;
  v_hold numeric;
  v_wallet numeric;
  v_withdrawable numeric;
  v_fee numeric;
  v_other_signed boolean;
BEGIN
  IF v_actor IS NULL THEN RETURN jsonb_build_object('success',false,'error','Not authenticated'); END IF;
  IF length(trim(coalesce(p_signature,'')))<2 THEN
    RETURN jsonb_build_object('success',false,'error','A valid signature is required');
  END IF;

  SELECT * INTO v_c FROM public.hire_contracts WHERE id=p_contract_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Contract not found'); END IF;
  IF v_actor NOT IN (v_c.client_id,v_c.expert_id) THEN
    RETURN jsonb_build_object('success',false,'error','Not a party to this contract');
  END IF;
  IF v_c.status NOT IN ('pending_expert_signature','pending_client_signature') THEN
    RETURN jsonb_build_object('success',false,'error','Contract not awaiting signature');
  END IF;
  IF (v_actor=v_c.client_id AND v_c.client_signed_at IS NOT NULL)
     OR (v_actor=v_c.expert_id AND v_c.expert_signed_at IS NOT NULL) THEN
    RETURN jsonb_build_object('success',false,'error','You have already signed this revision');
  END IF;

  v_other_signed := CASE WHEN v_actor=v_c.client_id
    THEN v_c.expert_signed_at IS NOT NULL ELSE v_c.client_signed_at IS NOT NULL END;
  v_hold := CASE WHEN v_c.contract_type='fixed'
    THEN coalesce(v_c.total_amount,0) ELSE coalesce(v_c.deposit_amount,0) END;

  IF v_other_signed AND v_hold>0 THEN
    SELECT coalesce(p.wallet_balance,0),coalesce(p.balance_withdrawable,0)
      INTO v_wallet,v_withdrawable
    FROM public.profiles p WHERE p.user_id=v_c.client_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Client wallet not found'); END IF;
    IF v_withdrawable<v_hold OR v_wallet<v_hold THEN
      RETURN jsonb_build_object('success',false,'error','Insufficient available NC balance for escrow');
    END IF;
  END IF;

  IF v_actor=v_c.client_id THEN
    UPDATE public.hire_contracts SET client_signature=trim(p_signature),client_signed_at=now(),updated_at=now()
    WHERE id=p_contract_id;
  ELSE
    UPDATE public.hire_contracts SET expert_signature=trim(p_signature),expert_signed_at=now(),updated_at=now()
    WHERE id=p_contract_id;
  END IF;

  IF v_other_signed THEN
    IF v_hold>0 THEN
      v_fee:=round(v_hold*0.05,2);
      UPDATE public.profiles SET
        balance_withdrawable=coalesce(balance_withdrawable,0)-v_hold,
        wallet_balance=coalesce(wallet_balance,0)-v_hold,updated_at=now()
      WHERE user_id=v_c.client_id;
      INSERT INTO public.wallet_transactions(user_id,kind,amount,status,reference,metadata)
      VALUES (v_c.client_id,'hire_contract_escrow',-v_hold,'completed',
        'Hire contract escrow: '||v_c.title,
        jsonb_build_object('contract_id',p_contract_id,'expert_id',v_c.expert_id,'revision_number',coalesce(v_c.revision_number,1)));
      UPDATE public.hire_contracts SET escrow_held=v_hold,platform_fee=v_fee,status='active',updated_at=now()
      WHERE id=p_contract_id;
    ELSE
      UPDATE public.hire_contracts SET status='active',updated_at=now() WHERE id=p_contract_id;
    END IF;
  END IF;

  INSERT INTO public.hire_contract_events(contract_id,actor_id,event_type,payload)
  VALUES (p_contract_id,v_actor,'signed',
    jsonb_build_object('role',CASE WHEN v_actor=v_c.client_id THEN 'client' ELSE 'expert' END,
      'revision_number',coalesce(v_c.revision_number,1)));
  RETURN jsonb_build_object('success',true,'funded',v_other_signed AND v_hold>0,'escrow_held',CASE WHEN v_other_signed THEN v_hold ELSE 0 END);
END;
$$;

REVOKE ALL ON FUNCTION public.request_hire_contract_changes(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.request_hire_contract_changes(uuid,text) TO authenticated;
REVOKE ALL ON FUNCTION public.revise_hire_contract(uuid,text,text,text,numeric,numeric,numeric,numeric,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.revise_hire_contract(uuid,text,text,text,numeric,numeric,numeric,numeric,timestamptz) TO authenticated;
REVOKE ALL ON FUNCTION public.sign_hire_contract(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.sign_hire_contract(uuid,text) TO authenticated;
