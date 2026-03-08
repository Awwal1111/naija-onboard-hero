-- Allow chat participants to mark received messages as read
CREATE POLICY "Recipients can mark messages as read" 
ON public.messages 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.chats 
    WHERE chats.id = messages.chat_id 
    AND (chats.user1_id = auth.uid() OR chats.user2_id = auth.uid())
  )
  AND auth.uid() != sender_id
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chats 
    WHERE chats.id = messages.chat_id 
    AND (chats.user1_id = auth.uid() OR chats.user2_id = auth.uid())
  )
  AND auth.uid() != sender_id
);