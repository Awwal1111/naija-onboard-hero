-- Create storage bucket for chat media
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', false);

-- RLS policies for chat media bucket
-- Users can upload their own media
CREATE POLICY "Users can upload chat media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view media from their chats
CREATE POLICY "Users can view their chat media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-media' AND
  (
    -- User uploaded it
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- User is part of a chat that contains a message with this media
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.chats c ON m.chat_id = c.id
      WHERE m.media_url = storage.objects.name
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  )
);

-- Users can delete their own chat media
CREATE POLICY "Users can delete their chat media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);