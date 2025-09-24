-- Add privacy setting to stories if not exists (simple approach)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stories' AND column_name = 'privacy_setting'
    ) THEN
        ALTER TABLE public.stories ADD COLUMN privacy_setting TEXT DEFAULT 'public' CHECK (privacy_setting IN ('public', 'connections_only'));
    END IF;
END $$;

-- Create user role enum type safely
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('user', 'admin', 'moderator', 'expert');
    END IF;
END $$;

-- Create user roles table for proper admin management
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'user',
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Add function to check user roles (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_user_role(user_id UUID, check_role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = has_user_role.user_id 
    AND role = check_role
  );
$$;

-- RLS Policies for user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage user roles" ON public.user_roles
FOR ALL USING (public.has_user_role(auth.uid(), 'admin'::user_role));