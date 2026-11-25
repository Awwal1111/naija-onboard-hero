-- Harden hire contract cancellation and signing RPCs.
-- The marketplace security migration separately hardens gig cancellation.
-- These guards are idempotent so this migration is safe after either version
-- of the contract-signing function.

DO $$
DECLARE
  v_def text;
  v_new text;
BEGIN
  SELECT pg_get_functiondef('public.cancel_hire_contract(uuid,text)'::regprocedure) INTO v_def;
  IF position('v_actor IS NULL' in v_def)=0 THEN
    v_new := replace(v_def,
      'IF v_actor NOT IN (v_c.client_id, v_c.expert_id) THEN',
      'IF v_actor IS NULL OR v_actor NOT IN (v_c.client_id, v_c.expert_id) THEN');
    IF v_new=v_def THEN RAISE EXCEPTION 'Could not harden cancel_hire_contract authorization guard'; END IF;
    EXECUTE v_new;
  END IF;

  SELECT pg_get_functiondef('public.sign_hire_contract(uuid,text)'::regprocedure) INTO v_def;
  IF position('Authentication required' in v_def)=0 THEN
    v_new := replace(v_def,
      'BEGIN
  SELECT * INTO v_c FROM hire_contracts WHERE id = p_contract_id FOR UPDATE;',
      'BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object(''success'', false, ''error'', ''Authentication required'');
  END IF;
  IF length(trim(coalesce(p_signature, ''''))) < 2 THEN
    RETURN jsonb_build_object(''success'', false, ''error'', ''A valid signature is required'');
  END IF;
  SELECT * INTO v_c FROM hire_contracts WHERE id = p_contract_id FOR UPDATE;');
    IF v_new=v_def THEN RAISE EXCEPTION 'Could not harden sign_hire_contract authentication/signature validation'; END IF;
    v_def := v_new;
  END IF;
  IF position('v_actor IS NULL' in v_def)=0 THEN
    v_new := replace(v_def,
      'IF v_actor NOT IN (v_c.client_id, v_c.expert_id) THEN',
      'IF v_actor IS NULL OR v_actor NOT IN (v_c.client_id, v_c.expert_id) THEN');
    IF v_new=v_def THEN RAISE EXCEPTION 'Could not harden sign_hire_contract party authorization'; END IF;
    v_def := v_new;
  END IF;
  EXECUTE v_def;
END $$;

REVOKE ALL ON FUNCTION public.cancel_hire_contract(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cancel_hire_contract(uuid,text) TO authenticated;
REVOKE ALL ON FUNCTION public.sign_hire_contract(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.sign_hire_contract(uuid,text) TO authenticated;
REVOKE ALL ON FUNCTION public.complete_hire_contract(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.complete_hire_contract(uuid) TO authenticated;
