-- Create gig orders table for order/contract management
CREATE TABLE public.gig_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gig_id UUID NOT NULL REFERENCES public.jobs_services(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL,
  platform_fee NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'delivered', 'revision_requested', 'completed', 'cancelled', 'disputed')),
  delivery_deadline TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  buyer_notes TEXT,
  seller_notes TEXT,
  delivery_files TEXT[],
  revision_count INTEGER DEFAULT 0,
  max_revisions INTEGER DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order messages for communication within an order
CREATE TABLE public.gig_order_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.gig_orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  attachments TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order milestones for larger projects
CREATE TABLE public.gig_order_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.gig_orders(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gig_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gig_order_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gig_order_milestones ENABLE ROW LEVEL SECURITY;

-- RLS policies for gig_orders
CREATE POLICY "Users can view their own orders"
ON public.gig_orders FOR SELECT
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Buyers can create orders"
ON public.gig_orders FOR INSERT
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Order participants can update"
ON public.gig_orders FOR UPDATE
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- RLS policies for order messages
CREATE POLICY "Order participants can view messages"
ON public.gig_order_messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.gig_orders 
  WHERE id = order_id AND (buyer_id = auth.uid() OR seller_id = auth.uid())
));

CREATE POLICY "Order participants can send messages"
ON public.gig_order_messages FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.gig_orders 
  WHERE id = order_id AND (buyer_id = auth.uid() OR seller_id = auth.uid())
));

-- RLS policies for milestones
CREATE POLICY "Order participants can view milestones"
ON public.gig_order_milestones FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.gig_orders 
  WHERE id = order_id AND (buyer_id = auth.uid() OR seller_id = auth.uid())
));

CREATE POLICY "Sellers can manage milestones"
ON public.gig_order_milestones FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.gig_orders 
  WHERE id = order_id AND seller_id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_gig_orders_updated_at
BEFORE UPDATE ON public.gig_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_gig_orders_buyer ON public.gig_orders(buyer_id);
CREATE INDEX idx_gig_orders_seller ON public.gig_orders(seller_id);
CREATE INDEX idx_gig_orders_status ON public.gig_orders(status);
CREATE INDEX idx_gig_order_messages_order ON public.gig_order_messages(order_id);