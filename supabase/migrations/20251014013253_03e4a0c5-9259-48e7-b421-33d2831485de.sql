-- Enable realtime for safepay_transactions table
ALTER TABLE public.safepay_transactions REPLICA IDENTITY FULL;

-- Add the table to the realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'safepay_transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.safepay_transactions;
  END IF;
END $$;