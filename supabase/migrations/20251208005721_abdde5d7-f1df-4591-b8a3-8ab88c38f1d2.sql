-- Add unique constraint for class_participants to allow upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'class_participants_class_user_unique'
  ) THEN
    ALTER TABLE public.class_participants 
    ADD CONSTRAINT class_participants_class_user_unique UNIQUE (class_id, user_id);
  END IF;
END $$;