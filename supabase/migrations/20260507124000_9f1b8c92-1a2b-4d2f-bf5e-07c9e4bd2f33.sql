-- Add performance-focused indexes for high-traffic Supabase queries
-- These indexes are designed to support frequent filtering on user_id, created_at, status, and provider reference lookups.

DO
$$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'wallet_transactions'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_class WHERE relname = 'idx_wallet_transactions_user_created_at_desc'
    ) THEN
      CREATE INDEX idx_wallet_transactions_user_created_at_desc
      ON public.wallet_transactions(user_id, created_at DESC);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_class WHERE relname = 'idx_wallet_transactions_reference_status'
    ) THEN
      CREATE INDEX idx_wallet_transactions_reference_status
      ON public.wallet_transactions(reference, status);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_class WHERE relname = 'idx_wallet_transactions_kind_status_created_at'
    ) THEN
      CREATE INDEX idx_wallet_transactions_kind_status_created_at
      ON public.wallet_transactions(kind, status, created_at DESC);
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'notifications'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_class WHERE relname = 'idx_notifications_user_type_created_at'
    ) THEN
      CREATE INDEX idx_notifications_user_type_created_at
      ON public.notifications(user_id, type, created_at DESC);
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'profiles'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_class WHERE relname = 'idx_profiles_user_mode_created_at'
    ) THEN
      CREATE INDEX idx_profiles_user_mode_created_at
      ON public.profiles(user_mode, created_at DESC);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_class WHERE relname = 'idx_profiles_email_notifications_created_at'
    ) THEN
      CREATE INDEX idx_profiles_email_notifications_created_at
      ON public.profiles(email_notifications, created_at DESC);
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'quidax_transactions'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_class WHERE relname = 'idx_quidax_transactions_user_reference'
    ) THEN
      CREATE INDEX idx_quidax_transactions_user_reference
      ON public.quidax_transactions(user_id, reference);
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'push_subscriptions'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_class WHERE relname = 'idx_push_subscriptions_user_id'
    ) THEN
      CREATE INDEX idx_push_subscriptions_user_id
      ON public.push_subscriptions(user_id);
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'user_secrets'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_class WHERE relname = 'idx_user_secrets_user_id'
    ) THEN
      CREATE INDEX idx_user_secrets_user_id
      ON public.user_secrets(user_id);
    END IF;
  END IF;
END;
$$;
