
CREATE TABLE IF NOT EXISTS public.developer_ramp_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id uuid NOT NULL,
  session_id text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('buy','sell')),
  token text NOT NULL DEFAULT 'usdt',
  fiat_amount numeric,
  token_amount numeric,
  external_user_id text,
  external_user_email text,
  metadata jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','failed','expired','cancelled')),
  naijalancers_user_id uuid,
  reference text,
  redirect_url text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '2 hours'),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_developer_ramp_sessions_dev ON public.developer_ramp_sessions(developer_id);
CREATE INDEX IF NOT EXISTS idx_developer_ramp_sessions_session_id ON public.developer_ramp_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_developer_ramp_sessions_status ON public.developer_ramp_sessions(status);

ALTER TABLE public.developer_ramp_sessions ENABLE ROW LEVEL SECURITY;

-- Developers can read their own ramp sessions
CREATE POLICY "Developers can view own ramp sessions"
ON public.developer_ramp_sessions
FOR SELECT
TO authenticated
USING (developer_id = auth.uid());

-- Authenticated end-users (the one completing the ramp) can read a session by session_id
-- via the hosted page. Public read of pending/in_progress is needed for the page to load.
CREATE POLICY "End users can view active sessions for completion"
ON public.developer_ramp_sessions
FOR SELECT
TO authenticated
USING (status IN ('pending','in_progress') AND expires_at > now());

-- Trigger to update updated_at
CREATE TRIGGER trg_developer_ramp_sessions_updated
BEFORE UPDATE ON public.developer_ramp_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
