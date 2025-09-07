-- Critical Security Fixes - Enable RLS and secure database access

-- 1. Enable RLS on admin_wallet table and create restrictive admin-only policies
ALTER TABLE public.admin_wallet ENABLE ROW LEVEL SECURITY;

-- Create admin role check function with proper security
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND (
      user_id = '00000000-0000-0000-0000-000000000000'::uuid  -- System admin
      OR email LIKE '%@admin.%'  -- Admin email pattern
    )
  );
$$;

-- Admin wallet policies - extremely restrictive
DROP POLICY IF EXISTS "admin_wallet_access" ON public.admin_wallet;

CREATE POLICY "Admin wallet read access"
ON public.admin_wallet
FOR SELECT
TO authenticated
USING (public.is_admin_user());

CREATE POLICY "Admin wallet write access" 
ON public.admin_wallet
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- 2. Enable RLS on referral_campaigns and create proper policies
ALTER TABLE public.referral_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active campaigns visible to authenticated users"
ON public.referral_campaigns
FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Admin can manage campaigns"
ON public.referral_campaigns
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- 3. Fix function search_path issues for existing functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone_number)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', '')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_chat_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chats 
  SET updated_at = now() 
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts 
    SET likes_count = likes_count - 1 
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS trigger  
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts 
    SET comments_count = comments_count + 1 
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts 
    SET comments_count = comments_count - 1 
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_story_views_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.stories 
  SET views_count = views_count + 1 
  WHERE id = NEW.story_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.mask_expert_application_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow full access to the application owner
  IF auth.uid() != NEW.user_id THEN
    -- Mask sensitive data for non-owners
    NEW.email := 'hidden@example.com';
    NEW.phone_number := 'xxx-xxx-xxxx';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_profile_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.profiles
    SET average_rating = (
            SELECT COALESCE(AVG(rating)::numeric(3,2), 0)
            FROM public.expert_ratings
            WHERE expert_id = NEW.expert_id
        ),
        rating_count = (
            SELECT COUNT(*)
            FROM public.expert_ratings
            WHERE expert_id = NEW.expert_id
        )
    WHERE id = NEW.expert_id;
    RETURN NEW;
END;
$$;