
-- Update is_admin_user to also include super_admin
CREATE OR REPLACE FUNCTION public.is_admin_user()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$;

-- Function to check if user has at least moderator access
CREATE OR REPLACE FUNCTION public.has_admin_access()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'moderator')
  );
$$;

-- Function to get user's highest admin role
CREATE OR REPLACE FUNCTION public.get_user_admin_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT 
      CASE 
        WHEN role = 'super_admin' THEN 'super_admin'
        WHEN role = 'admin' THEN 'admin'
        WHEN role = 'moderator' THEN 'moderator'
        ELSE NULL
      END
    FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'moderator')
    ORDER BY 
      CASE role 
        WHEN 'super_admin' THEN 1 
        WHEN 'admin' THEN 2 
        WHEN 'moderator' THEN 3 
      END
    LIMIT 1),
    'none'
  );
$$;

-- Grant admin role function
CREATE OR REPLACE FUNCTION public.grant_admin_role(target_user_id uuid, target_role user_role DEFAULT 'moderator')
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  caller_role text;
BEGIN
  caller_role := get_user_admin_role();
  
  IF target_role = 'super_admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot grant super_admin role');
  END IF;
  
  IF target_role = 'admin' AND caller_role != 'super_admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only super admins can grant admin role');
  END IF;
  
  IF target_role = 'moderator' AND caller_role NOT IN ('super_admin', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can grant moderator role');
  END IF;
  
  INSERT INTO public.user_roles (user_id, role, granted_by)
  VALUES (target_user_id, target_role, auth.uid())
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Revoke admin role function  
CREATE OR REPLACE FUNCTION public.revoke_admin_role(target_user_id uuid, target_role user_role)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  caller_role text;
BEGIN
  caller_role := get_user_admin_role();
  
  IF target_role = 'super_admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot revoke super_admin role');
  END IF;
  
  IF target_user_id = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot revoke your own role');
  END IF;
  
  IF target_role = 'admin' AND caller_role != 'super_admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only super admins can revoke admin role');
  END IF;
  
  IF target_role = 'moderator' AND caller_role NOT IN ('super_admin', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only admins can revoke moderator role');
  END IF;
  
  DELETE FROM public.user_roles 
  WHERE user_id = target_user_id AND role = target_role;
  
  RETURN jsonb_build_object('success', true);
END;
$$;
