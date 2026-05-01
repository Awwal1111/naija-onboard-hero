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
    SELECT
      CASE WHEN client_id = p_user_id THEN expert_id ELSE client_id END AS partner_id,
      'escrow'::text AS source,
      COALESCE(amount, 0)::numeric AS amount,
      COALESCE(released_at, created_at) AS completed_at
    FROM public.escrow_payments
    WHERE status = 'released'
      AND (client_id = p_user_id OR expert_id = p_user_id)

    UNION ALL
    SELECT
      CASE WHEN buyer_id = p_user_id THEN seller_id ELSE buyer_id END AS partner_id,
      'gig_order'::text,
      COALESCE(amount, 0)::numeric,
      COALESCE(completed_at, updated_at, created_at)
    FROM public.gig_orders
    WHERE status = 'completed'
      AND (buyer_id = p_user_id OR seller_id = p_user_id)

    UNION ALL
    SELECT
      CASE WHEN client_id = p_user_id THEN freelancer_id ELSE client_id END AS partner_id,
      'chat'::text,
      COALESCE(amount, 0)::numeric,
      completed_at
    FROM public.project_completions
    WHERE completed_at IS NOT NULL
      AND (client_id = p_user_id OR freelancer_id = p_user_id)

    UNION ALL
    SELECT
      CASE WHEN w.owner_id = p_user_id THEN m.user_id ELSE w.owner_id END AS partner_id,
      'workroom'::text,
      COALESCE(w.spent_budget, w.total_budget, 0)::numeric,
      COALESCE(w.updated_at, w.created_at)
    FROM public.workrooms w
    JOIN public.workroom_members m ON m.workroom_id = w.id AND m.role <> 'owner'
    WHERE w.status = 'completed'
      AND (w.owner_id = p_user_id OR m.user_id = p_user_id)

    UNION ALL
    SELECT
      CASE WHEN w.owner_id = p_user_id THEN e.user_id ELSE w.owner_id END AS partner_id,
      'hourly'::text,
      COALESCE((e.duration_minutes::numeric / 60.0) * COALESCE(e.hourly_rate, 0), 0),
      COALESCE(e.approved_at, e.ended_at, e.created_at)
    FROM public.work_diary_entries e
    JOIN public.workrooms w ON w.id = e.workroom_id
    WHERE e.payment_status = 'paid'
      AND (w.owner_id = p_user_id OR e.user_id = p_user_id)
  )
  SELECT
    partner_id,
    string_agg(DISTINCT source, ',' ORDER BY source) AS source,
    COUNT(*)::bigint AS project_count,
    SUM(amount)::numeric AS total_amount,
    MAX(completed_at) AS last_completed_at
  FROM unioned
  WHERE partner_id IS NOT NULL AND partner_id <> p_user_id
  GROUP BY partner_id
  ORDER BY MAX(completed_at) DESC NULLS LAST;
$$;