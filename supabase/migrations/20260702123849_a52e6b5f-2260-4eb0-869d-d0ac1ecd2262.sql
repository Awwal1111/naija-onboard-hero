
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON public.messages (chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_chat_sender_unread ON public.messages (chat_id, sender_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_posts_status_created ON public.posts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON public.post_reactions (post_id);
CREATE INDEX IF NOT EXISTS idx_post_views_post_user ON public.post_views (post_id, user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_tx_user_created ON public.crypto_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_created ON public.wallet_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_services_status_created ON public.jobs_services (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_earnings_desc ON public.profiles (total_earnings DESC) WHERE total_earnings > 0;
CREATE INDEX IF NOT EXISTS idx_profiles_earnings_rating ON public.profiles (total_earnings DESC, rating_count) WHERE total_earnings > 0 AND rating_count > 0;
