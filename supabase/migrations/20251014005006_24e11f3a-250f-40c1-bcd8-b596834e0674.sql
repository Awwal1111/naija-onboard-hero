-- Fix existing connections count by recalculating from actual data
UPDATE public.profiles p
SET connections_count = (
  SELECT COUNT(*)
  FROM public.connections c
  WHERE c.user1_id = p.user_id OR c.user2_id = p.user_id
)
WHERE EXISTS (
  SELECT 1
  FROM public.connections c
  WHERE c.user1_id = p.user_id OR c.user2_id = p.user_id
);