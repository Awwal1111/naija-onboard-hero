-- Mini Apps marketplace table
CREATE TABLE IF NOT EXISTS public.mini_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID NOT NULL REFERENCES public.profiles(user_id),
  app_name TEXT NOT NULL,
  app_description TEXT NOT NULL,
  app_icon_url TEXT,
  app_url TEXT NOT NULL,
  category TEXT DEFAULT 'utility',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  admin_notes TEXT,
  sdk_app_id TEXT UNIQUE DEFAULT ('njl_app_' || replace(gen_random_uuid()::text, '-', '')),
  is_featured BOOLEAN DEFAULT false,
  install_count INTEGER DEFAULT 0,
  rating NUMERIC(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by UUID
);

-- RLS
ALTER TABLE public.mini_apps ENABLE ROW LEVEL SECURITY;

-- Anyone can view approved mini apps
CREATE POLICY "Anyone can view approved mini apps" ON public.mini_apps
  FOR SELECT USING (status = 'approved' OR developer_id = auth.uid());

-- Developers can insert their own apps
CREATE POLICY "Developers can submit mini apps" ON public.mini_apps
  FOR INSERT WITH CHECK (developer_id = auth.uid());

-- Developers can update their own pending apps
CREATE POLICY "Developers can update own apps" ON public.mini_apps
  FOR UPDATE USING (developer_id = auth.uid() AND status = 'pending');

-- Admins can do everything
CREATE POLICY "Admins can manage all mini apps" ON public.mini_apps
  FOR ALL USING (public.is_admin_user());

-- Mini app SDK transactions (postMessage payment records)
CREATE TABLE IF NOT EXISTS public.mini_app_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mini_app_id UUID NOT NULL REFERENCES public.mini_apps(id),
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'completed',
  tx_ref TEXT UNIQUE DEFAULT ('njl_tx_' || replace(gen_random_uuid()::text, '-', '')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.mini_app_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own mini app transactions" ON public.mini_app_transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert mini app transactions" ON public.mini_app_transactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Index for quick lookup
CREATE INDEX idx_mini_apps_status ON public.mini_apps(status);
CREATE INDEX idx_mini_apps_developer ON public.mini_apps(developer_id);
CREATE INDEX idx_mini_app_transactions_user ON public.mini_app_transactions(user_id);