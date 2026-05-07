-- Create task queue for offloading heavy background workflows from Supabase functions
CREATE TABLE IF NOT EXISTS public.task_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  locked_at TIMESTAMP WITH TIME ZONE,
  locked_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_queue_status_created_at
  ON public.task_queue(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_queue_task_type_status
  ON public.task_queue(task_type, status);

CREATE INDEX IF NOT EXISTS idx_task_queue_locked_at
  ON public.task_queue(locked_at);
