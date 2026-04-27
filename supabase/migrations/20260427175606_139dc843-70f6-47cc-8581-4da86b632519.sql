-- Project completions table for chat-based mutual confirmation
-- (escrow + gig_orders are tracked in their own tables; this is for informal chat work)
CREATE TABLE public.project_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  freelancer_id UUID NOT NULL,
  title TEXT,
  description TEXT,
  amount NUMERIC DEFAULT 0,
  client_confirmed BOOLEAN NOT NULL DEFAULT false,
  freelancer_confirmed BOOLEAN NOT NULL DEFAULT false,
  client_confirmed_at TIMESTAMPTZ,
  freelancer_confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  initiated_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT project_completions_distinct_parties CHECK (client_id <> freelancer_id)
);

CREATE INDEX idx_project_completions_client ON public.project_completions(client_id);
CREATE INDEX idx_project_completions_freelancer ON public.project_completions(freelancer_id);
CREATE INDEX idx_project_completions_chat ON public.project_completions(chat_id);
CREATE INDEX idx_project_completions_completed ON public.project_completions(completed_at) WHERE completed_at IS NOT NULL;

ALTER TABLE public.project_completions ENABLE ROW LEVEL SECURITY;

-- Either party can view their projects
CREATE POLICY "Parties can view their project completions"
  ON public.project_completions FOR SELECT
  USING (auth.uid() = client_id OR auth.uid() = freelancer_id);

-- Either party can initiate
CREATE POLICY "Parties can create project completions"
  ON public.project_completions FOR INSERT
  WITH CHECK (auth.uid() = initiated_by AND (auth.uid() = client_id OR auth.uid() = freelancer_id));

-- Either party can update (to confirm their side) — RPC enforces logic
CREATE POLICY "Parties can update their project completions"
  ON public.project_completions FOR UPDATE
  USING (auth.uid() = client_id OR auth.uid() = freelancer_id);

-- Auto-update updated_at
CREATE TRIGGER update_project_completions_updated_at
  BEFORE UPDATE ON public.project_completions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-set completed_at when both parties confirm
CREATE OR REPLACE FUNCTION public.set_project_completed_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.client_confirmed AND NEW.freelancer_confirmed AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_project_completions_set_completed
  BEFORE INSERT OR UPDATE ON public.project_completions
  FOR EACH ROW EXECUTE FUNCTION public.set_project_completed_at();

-- RPC: confirm a project completion (one side at a time)
CREATE OR REPLACE FUNCTION public.confirm_project_completion(p_completion_id UUID)
RETURNS public.project_completions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.project_completions;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_row FROM public.project_completions WHERE id = p_completion_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project completion not found';
  END IF;

  IF v_uid = v_row.client_id THEN
    UPDATE public.project_completions
       SET client_confirmed = true, client_confirmed_at = COALESCE(client_confirmed_at, now())
     WHERE id = p_completion_id
     RETURNING * INTO v_row;
  ELSIF v_uid = v_row.freelancer_id THEN
    UPDATE public.project_completions
       SET freelancer_confirmed = true, freelancer_confirmed_at = COALESCE(freelancer_confirmed_at, now())
     WHERE id = p_completion_id
     RETURNING * INTO v_row;
  ELSE
    RAISE EXCEPTION 'Not a party to this project';
  END IF;

  RETURN v_row;
END;
$$;

-- RPC: aggregated completed collaborations for a user's profile
-- Unions: released escrow_payments, completed gig_orders, mutually-confirmed project_completions
CREATE OR REPLACE FUNCTION public.get_user_collaborations(p_user_id UUID)
RETURNS TABLE (
  partner_id UUID,
  source TEXT,
  project_count BIGINT,
  total_amount NUMERIC,
  last_completed_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH unioned AS (
    -- Released escrow (client paid expert)
    SELECT
      CASE WHEN p_user_id = client_id THEN expert_id ELSE client_id END AS partner_id,
      'escrow'::TEXT AS source,
      amount,
      released_at AS completed_at
    FROM public.escrow_payments
    WHERE status = 'released'
      AND released_at IS NOT NULL
      AND (client_id = p_user_id OR expert_id = p_user_id)

    UNION ALL

    -- Completed gig orders
    SELECT
      CASE WHEN p_user_id = buyer_id THEN seller_id ELSE buyer_id END AS partner_id,
      'gig_order'::TEXT AS source,
      amount,
      completed_at
    FROM public.gig_orders
    WHERE status = 'completed'
      AND completed_at IS NOT NULL
      AND (buyer_id = p_user_id OR seller_id = p_user_id)

    UNION ALL

    -- Chat-based mutual confirmations
    SELECT
      CASE WHEN p_user_id = client_id THEN freelancer_id ELSE client_id END AS partner_id,
      'chat'::TEXT AS source,
      amount,
      completed_at
    FROM public.project_completions
    WHERE completed_at IS NOT NULL
      AND (client_id = p_user_id OR freelancer_id = p_user_id)
  )
  SELECT
    partner_id,
    string_agg(DISTINCT source, ',' ORDER BY source) AS source,
    COUNT(*)::BIGINT AS project_count,
    COALESCE(SUM(amount), 0) AS total_amount,
    MAX(completed_at) AS last_completed_at
  FROM unioned
  WHERE partner_id IS NOT NULL
  GROUP BY partner_id
  ORDER BY MAX(completed_at) DESC NULLS LAST
  LIMIT 100;
$$;