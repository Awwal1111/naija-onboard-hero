-- Fix foreign key relationship between posts and profiles
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

-- Create storage bucket for chat uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-uploads', 'chat-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Chat uploads policies
CREATE POLICY "Users can upload their own chat files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'chat-uploads' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view chat files they have access to" ON storage.objects
FOR SELECT USING (
  bucket_id = 'chat-uploads' AND 
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (
      SELECT 1 FROM public.chats 
      WHERE (user1_id = auth.uid() OR user2_id = auth.uid()) AND
      id::text = (storage.foldername(name))[2]
    )
  )
);

CREATE POLICY "Users can delete their own chat files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'chat-uploads' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add media_url and media_type columns to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS media_url text,
ADD COLUMN IF NOT EXISTS media_type text;