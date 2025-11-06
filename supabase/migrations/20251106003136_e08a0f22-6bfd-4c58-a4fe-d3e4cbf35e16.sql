-- Add reply functionality columns to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reply_to_content TEXT,
ADD COLUMN IF NOT EXISTS reply_to_sender UUID;

-- Create index for better query performance on replies
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON public.messages(reply_to_id);