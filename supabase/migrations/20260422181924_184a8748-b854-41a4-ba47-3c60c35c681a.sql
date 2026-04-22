-- Fix expert_classes visibility: allow viewing past/ended classes for "Past" tab, and let experts see all of their own classes
DROP POLICY IF EXISTS "Anyone can view published classes" ON public.expert_classes;

CREATE POLICY "Anyone can view scheduled live or ended classes"
ON public.expert_classes
FOR SELECT
USING (status = ANY (ARRAY['scheduled'::text, 'live'::text, 'ended'::text]));

CREATE POLICY "Experts can view all their own classes"
ON public.expert_classes
FOR SELECT
USING (auth.uid() = expert_id);

-- Auto-fail stale IvoryPay deposit_pending rows older than 30 min so the wallet history is clean
UPDATE public.wallet_transactions
SET status = 'failed',
    kind = 'deposit_failed',
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('auto_expired', true, 'reason', 'No payment received within 30 minutes')
WHERE kind = 'deposit_pending'
  AND status = 'pending'
  AND created_at < now() - interval '30 minutes';