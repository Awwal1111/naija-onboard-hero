-- Update the is_admin_user function to only include gulajusurajo@gmail.com
DROP FUNCTION IF EXISTS public.is_admin_user() CASCADE;

CREATE OR REPLACE FUNCTION public.is_admin_user()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND email = 'gulajusurajo@gmail.com'
  )
$function$;