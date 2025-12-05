-- Ensure REPLICA IDENTITY FULL for proper realtime change tracking
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE connection_requests REPLICA IDENTITY FULL;
ALTER TABLE post_comments REPLICA IDENTITY FULL;
ALTER TABLE post_likes REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- Add tables to realtime publication (ignore if already exists)
DO $$ 
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE wallet_transactions;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE job_post_applications;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- Set REPLICA IDENTITY for newly added tables
ALTER TABLE wallet_transactions REPLICA IDENTITY FULL;
ALTER TABLE job_post_applications REPLICA IDENTITY FULL;