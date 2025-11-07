-- Create function to get suspicious users (high transaction volume, unusual patterns)
CREATE OR REPLACE FUNCTION public.get_suspicious_users()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  transaction_count bigint,
  total_amount numeric,
  last_activity timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.full_name,
    COALESCE(au.email, 'N/A') as email,
    COUNT(wt.id) as transaction_count,
    SUM(ABS(wt.amount)) as total_amount,
    MAX(wt.created_at) as last_activity
  FROM profiles p
  LEFT JOIN auth.users au ON au.id = p.user_id
  LEFT JOIN wallet_transactions wt ON wt.user_id = p.user_id
  WHERE wt.created_at > NOW() - INTERVAL '7 days'
  GROUP BY p.user_id, p.full_name, au.email
  HAVING COUNT(wt.id) > 20 OR SUM(ABS(wt.amount)) > 50000
  ORDER BY transaction_count DESC
  LIMIT 10;
$$;