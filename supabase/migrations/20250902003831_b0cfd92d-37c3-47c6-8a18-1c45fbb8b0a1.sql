-- Create connection requests table
CREATE TABLE public.connection_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  requested_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(requester_id, requested_id)
);

-- Enable RLS
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own connection requests"
ON public.connection_requests FOR SELECT
USING (auth.uid() = requester_id OR auth.uid() = requested_id);

CREATE POLICY "Users can create connection requests"
ON public.connection_requests FOR INSERT
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update their connection requests"
ON public.connection_requests FOR UPDATE
USING (auth.uid() = requested_id);

-- Add trigger for updated_at
CREATE TRIGGER update_connection_requests_updated_at
BEFORE UPDATE ON public.connection_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add foreign key relationships (optional for better data integrity)
-- Note: We don't add foreign keys directly to auth.users since it's managed by Supabase