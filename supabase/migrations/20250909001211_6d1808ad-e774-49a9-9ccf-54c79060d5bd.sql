-- First, clean up orphaned posts (posts without corresponding profiles)
DELETE FROM public.posts 
WHERE user_id NOT IN (SELECT user_id FROM public.profiles);

-- Now we can safely add the foreign key constraint
ALTER TABLE public.posts 
ADD CONSTRAINT posts_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Ensure RLS policies are working correctly for posts visibility
DROP POLICY IF EXISTS "Users can view posts based on visibility" ON public.posts;

CREATE POLICY "Users can view posts based on visibility" ON public.posts
FOR SELECT USING (
  status = 'active' AND 
  (
    visibility = 'public' OR 
    user_id = auth.uid() OR 
    (visibility = 'connections' AND users_are_connected(auth.uid(), user_id))
  )
);

-- Create storage bucket for chat uploads (only if it doesn't exist)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-uploads', 'chat-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Add media_url and media_type columns to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS media_url text,
ADD COLUMN IF NOT EXISTS media_type text;