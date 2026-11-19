-- A user can have one push subscription per device/browser, not one globally.
ALTER TABLE public.push_subscriptions
DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_user_endpoint
ON public.push_subscriptions(user_id, endpoint);
