-- Update the admin function to include the current user ID as admin
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT auth.uid() IN (
    '00000000-0000-0000-0000-000000000000'::uuid,  -- Default admin
    '75aaab45-e969-409c-a7c5-69e5de43df39'::uuid,  -- Kabiru (expert applicant)
    '783c22af-94e5-4082-b1e2-157a66e0f67f'::uuid   -- Current user (Awwal) as admin
  )
$function$;