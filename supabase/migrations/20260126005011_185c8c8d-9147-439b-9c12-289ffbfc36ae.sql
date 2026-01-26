-- Create table for API sales inquiries/contacts
CREATE TABLE IF NOT EXISTS public.api_sales_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_name TEXT,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  use_case TEXT,
  expected_volume TEXT,
  message TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'in_progress', 'closed', 'converted')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_sales_inquiries ENABLE ROW LEVEL SECURITY;

-- Users can create inquiries
CREATE POLICY "Users create inquiries" ON public.api_sales_inquiries 
  FOR INSERT WITH CHECK (true);

-- Users can view their own inquiries
CREATE POLICY "Users view own inquiries" ON public.api_sales_inquiries 
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view and manage all inquiries
CREATE POLICY "Admins view all inquiries" ON public.api_sales_inquiries 
  FOR SELECT USING (public.is_admin_user());

CREATE POLICY "Admins update inquiries" ON public.api_sales_inquiries 
  FOR UPDATE USING (public.is_admin_user());

CREATE POLICY "Admins delete inquiries" ON public.api_sales_inquiries 
  FOR DELETE USING (public.is_admin_user());

-- Add trigger for updated_at
CREATE TRIGGER update_api_sales_inquiries_updated_at
  BEFORE UPDATE ON public.api_sales_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();