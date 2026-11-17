CREATE OR REPLACE FUNCTION public.refresh_admin_stats() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.admin_stats (stat_date,total_users,active_users,total_experts,total_posts,total_jobs,total_revenue,pending_applications,new_signups,total_wallet_balance,total_transactions,updated_at)
  VALUES (CURRENT_DATE,
    (SELECT COUNT(*) FROM profiles),
    (SELECT COUNT(*) FROM profiles WHERE created_at > NOW()-INTERVAL '30 days'),
    (SELECT COUNT(*) FROM profiles WHERE is_expert),
    (SELECT COUNT(*) FROM posts),
    (SELECT COUNT(*) FROM job_posts),
    (SELECT COALESCE(SUM(amount),0) FROM platform_revenue),
    (SELECT COUNT(*) FROM expert_applications WHERE status='pending'),
    (SELECT COUNT(*) FROM profiles WHERE created_at > NOW()-INTERVAL '7 days'),
    (SELECT COALESCE(SUM(wallet_balance),0) FROM profiles),
    (SELECT COUNT(*) FROM wallet_transactions), NOW())
  ON CONFLICT (stat_date) DO UPDATE SET total_users=EXCLUDED.total_users,active_users=EXCLUDED.active_users,total_experts=EXCLUDED.total_experts,total_posts=EXCLUDED.total_posts,total_jobs=EXCLUDED.total_jobs,total_revenue=EXCLUDED.total_revenue,pending_applications=EXCLUDED.pending_applications,new_signups=EXCLUDED.new_signups,total_wallet_balance=EXCLUDED.total_wallet_balance,total_transactions=EXCLUDED.total_transactions,updated_at=NOW();
END $$;

DELETE FROM public.wallet_transactions WHERE kind='deposit' AND amount=100000 AND reference IS NULL AND metadata IS NULL;
UPDATE public.profiles SET wallet_balance=0 WHERE wallet_balance=1000000;
SELECT public.refresh_admin_stats();