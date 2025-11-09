-- Create call_history table to track all calls
CREATE TABLE public.call_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL CHECK (call_type IN ('voice', 'video')),
  status TEXT NOT NULL CHECK (status IN ('initiated', 'ringing', 'accepted', 'rejected', 'missed', 'ended', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own call history (either as caller or receiver)
CREATE POLICY "Users can view their own call history"
ON public.call_history
FOR SELECT
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Users can insert their own calls
CREATE POLICY "Users can create calls"
ON public.call_history
FOR INSERT
WITH CHECK (auth.uid() = caller_id);

-- Users can update their own calls
CREATE POLICY "Users can update their own calls"
ON public.call_history
FOR UPDATE
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Create index for faster queries
CREATE INDEX idx_call_history_caller ON public.call_history(caller_id);
CREATE INDEX idx_call_history_receiver ON public.call_history(receiver_id);
CREATE INDEX idx_call_history_created_at ON public.call_history(created_at DESC);

-- Enable realtime for call_history table
ALTER TABLE public.call_history REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_history;