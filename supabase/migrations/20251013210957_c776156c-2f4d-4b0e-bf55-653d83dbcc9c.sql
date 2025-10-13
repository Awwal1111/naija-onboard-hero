-- Create enum for digital product categories
CREATE TYPE public.digital_product_category AS ENUM ('document', 'ebook', 'pdf', 'template', 'audio', 'video', 'other');

-- Create enum for course status
CREATE TYPE public.course_status AS ENUM ('draft', 'active', 'inactive');

-- Create enum for fundraising status
CREATE TYPE public.fundraising_status AS ENUM ('pending', 'approved', 'rejected', 'completed', 'cancelled');

-- Create enum for emergency status
CREATE TYPE public.emergency_status AS ENUM ('pending', 'approved', 'rejected', 'disbursed');

-- Digital Products table
CREATE TABLE public.digital_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category public.digital_product_category NOT NULL,
  price NUMERIC NOT NULL CHECK (price >= 0),
  file_url TEXT,
  preview_url TEXT,
  download_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Courses table
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC NOT NULL CHECK (price >= 0),
  course_urls JSONB NOT NULL DEFAULT '[]',
  thumbnail_url TEXT,
  enrollment_count INTEGER DEFAULT 0,
  status public.course_status DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fundraisings table
CREATE TABLE public.fundraisings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  goal_amount NUMERIC NOT NULL CHECK (goal_amount > 0),
  raised_amount NUMERIC DEFAULT 0 CHECK (raised_amount >= 0),
  status public.fundraising_status DEFAULT 'pending',
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Emergency Requests table
CREATE TABLE public.emergency_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  amount_requested NUMERIC NOT NULL CHECK (amount_requested > 0),
  status public.emergency_status DEFAULT 'pending',
  admin_notes TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  disbursed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Digital Product Purchases table
CREATE TABLE public.digital_product_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.digital_products(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, buyer_id)
);

-- Course Enrollments table
CREATE TABLE public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, student_id)
);

-- Fundraising Contributions table
CREATE TABLE public.fundraising_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fundraising_id UUID NOT NULL REFERENCES public.fundraisings(id) ON DELETE CASCADE,
  contributor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Donations table (to admin wallet)
CREATE TABLE public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.digital_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fundraisings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_product_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fundraising_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Digital Products
CREATE POLICY "Anyone can view active digital products" ON public.digital_products
  FOR SELECT USING (status = 'active');

CREATE POLICY "Users can create their own digital products" ON public.digital_products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own digital products" ON public.digital_products
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all digital products" ON public.digital_products
  FOR SELECT USING (is_admin_user());

-- RLS Policies for Courses
CREATE POLICY "Anyone can view active courses" ON public.courses
  FOR SELECT USING (status = 'active');

CREATE POLICY "Users can create their own courses" ON public.courses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own courses" ON public.courses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all courses" ON public.courses
  FOR SELECT USING (is_admin_user());

-- RLS Policies for Fundraisings
CREATE POLICY "Anyone can view approved fundraisings" ON public.fundraisings
  FOR SELECT USING (status = 'approved' OR auth.uid() = user_id);

CREATE POLICY "Users can create fundraising requests" ON public.fundraisings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all fundraisings" ON public.fundraisings
  FOR SELECT USING (is_admin_user());

CREATE POLICY "Admins can update fundraisings" ON public.fundraisings
  FOR UPDATE USING (is_admin_user());

-- RLS Policies for Emergency Requests
CREATE POLICY "Users can view their own emergency requests" ON public.emergency_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create emergency requests" ON public.emergency_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all emergency requests" ON public.emergency_requests
  FOR SELECT USING (is_admin_user());

CREATE POLICY "Admins can update emergency requests" ON public.emergency_requests
  FOR UPDATE USING (is_admin_user());

-- RLS Policies for Digital Product Purchases
CREATE POLICY "Users can view their own purchases" ON public.digital_product_purchases
  FOR SELECT USING (auth.uid() = buyer_id);

CREATE POLICY "Users can purchase products" ON public.digital_product_purchases
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Product owners can view purchases" ON public.digital_product_purchases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.digital_products
      WHERE id = product_id AND user_id = auth.uid()
    )
  );

-- RLS Policies for Course Enrollments
CREATE POLICY "Users can view their own enrollments" ON public.course_enrollments
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Users can enroll in courses" ON public.course_enrollments
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Course owners can view enrollments" ON public.course_enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE id = course_id AND user_id = auth.uid()
    )
  );

-- RLS Policies for Fundraising Contributions
CREATE POLICY "Anyone can view fundraising contributions" ON public.fundraising_contributions
  FOR SELECT USING (true);

CREATE POLICY "Users can contribute to fundraisings" ON public.fundraising_contributions
  FOR INSERT WITH CHECK (auth.uid() = contributor_id);

-- RLS Policies for Donations
CREATE POLICY "Admins can view all donations" ON public.donations
  FOR SELECT USING (is_admin_user());

CREATE POLICY "Users can view their own donations" ON public.donations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create donations" ON public.donations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_digital_products_user_id ON public.digital_products(user_id);
CREATE INDEX idx_digital_products_status ON public.digital_products(status);
CREATE INDEX idx_courses_user_id ON public.courses(user_id);
CREATE INDEX idx_courses_status ON public.courses(status);
CREATE INDEX idx_fundraisings_status ON public.fundraisings(status);
CREATE INDEX idx_fundraisings_user_id ON public.fundraisings(user_id);
CREATE INDEX idx_emergency_requests_status ON public.emergency_requests(status);
CREATE INDEX idx_emergency_requests_user_id ON public.emergency_requests(user_id);

-- Triggers for updated_at
CREATE TRIGGER update_digital_products_updated_at BEFORE UPDATE ON public.digital_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fundraisings_updated_at BEFORE UPDATE ON public.fundraisings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_emergency_requests_updated_at BEFORE UPDATE ON public.emergency_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();