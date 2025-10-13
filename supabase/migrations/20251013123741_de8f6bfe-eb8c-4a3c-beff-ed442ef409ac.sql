-- Fix refresh_admin_stats function to use correct column name
CREATE OR REPLACE FUNCTION public.refresh_admin_stats()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_stat_date DATE := CURRENT_DATE;
  v_total_users INTEGER;
  v_active_users INTEGER;
  v_total_experts INTEGER;
  v_total_posts INTEGER;
  v_total_jobs INTEGER;
  v_total_revenue NUMERIC;
  v_pending_applications INTEGER;
  v_new_signups INTEGER;
  v_total_wallet_balance NUMERIC;
  v_total_transactions INTEGER;
BEGIN
  -- Calculate statistics
  SELECT COUNT(*) INTO v_total_users FROM public.profiles;
  
  SELECT COUNT(*) INTO v_active_users 
  FROM public.profiles 
  WHERE created_at > NOW() - INTERVAL '30 days';
  
  SELECT COUNT(*) INTO v_total_experts 
  FROM public.profiles 
  WHERE is_expert = true;
  
  SELECT COUNT(*) INTO v_total_posts FROM public.posts;
  
  SELECT COUNT(*) INTO v_total_jobs FROM public.job_posts;
  
  -- Fixed: Use 'kind' instead of 'transaction_type'
  SELECT COALESCE(SUM(amount), 0) INTO v_total_revenue
  FROM public.wallet_transactions
  WHERE kind IN ('deposit', 'payment_received');
  
  SELECT COUNT(*) INTO v_pending_applications
  FROM public.expert_applications
  WHERE status = 'pending';
  
  SELECT COUNT(*) INTO v_new_signups
  FROM public.profiles
  WHERE created_at > NOW() - INTERVAL '7 days';
  
  SELECT COALESCE(SUM(wallet_balance), 0) INTO v_total_wallet_balance
  FROM public.profiles;
  
  SELECT COUNT(*) INTO v_total_transactions
  FROM public.wallet_transactions;
  
  -- Insert or update stats
  INSERT INTO public.admin_stats (
    stat_date, total_users, active_users, total_experts,
    total_posts, total_jobs, total_revenue, pending_applications,
    new_signups, total_wallet_balance, total_transactions, updated_at
  ) VALUES (
    v_stat_date, v_total_users, v_active_users, v_total_experts,
    v_total_posts, v_total_jobs, v_total_revenue, v_pending_applications,
    v_new_signups, v_total_wallet_balance, v_total_transactions, NOW()
  )
  ON CONFLICT (stat_date)
  DO UPDATE SET
    total_users = EXCLUDED.total_users,
    active_users = EXCLUDED.active_users,
    total_experts = EXCLUDED.total_experts,
    total_posts = EXCLUDED.total_posts,
    total_jobs = EXCLUDED.total_jobs,
    total_revenue = EXCLUDED.total_revenue,
    pending_applications = EXCLUDED.pending_applications,
    new_signups = EXCLUDED.new_signups,
    total_wallet_balance = EXCLUDED.total_wallet_balance,
    total_transactions = EXCLUDED.total_transactions,
    updated_at = NOW();
END;
$function$;