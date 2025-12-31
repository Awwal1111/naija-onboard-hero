-- Create table to store telegram conversation history for smarter AI context
CREATE TABLE IF NOT EXISTS public.telegram_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_telegram_conversations_user_id ON public.telegram_conversations(telegram_user_id);
CREATE INDEX idx_telegram_conversations_created_at ON public.telegram_conversations(created_at DESC);

-- Enable RLS
ALTER TABLE public.telegram_conversations ENABLE ROW LEVEL SECURITY;

-- Service role can manage all conversations
CREATE POLICY "Service role can manage telegram conversations"
ON public.telegram_conversations
FOR ALL
USING (true)
WITH CHECK (true);

-- Clean up old messages (keep last 50 per user) - Function to be called periodically
CREATE OR REPLACE FUNCTION cleanup_old_telegram_conversations()
RETURNS void AS $$
BEGIN
  DELETE FROM public.telegram_conversations
  WHERE id IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY telegram_user_id ORDER BY created_at DESC) as rn
      FROM public.telegram_conversations
    ) ranked
    WHERE ranked.rn > 50
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;