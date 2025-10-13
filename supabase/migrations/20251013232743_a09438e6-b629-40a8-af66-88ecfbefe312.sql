-- Fix missing foreign key relationships and update example data ownership

-- Add foreign keys if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'digital_products_user_id_fkey'
  ) THEN
    ALTER TABLE public.digital_products
    ADD CONSTRAINT digital_products_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fundraisings_user_id_fkey'
  ) THEN
    ALTER TABLE public.fundraisings
    ADD CONSTRAINT fundraisings_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'emergency_requests_user_id_fkey'
  ) THEN
    ALTER TABLE public.emergency_requests
    ADD CONSTRAINT emergency_requests_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'courses_user_id_fkey'
  ) THEN
    ALTER TABLE public.courses
    ADD CONSTRAINT courses_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'job_posts_user_id_fkey'
  ) THEN
    ALTER TABLE public.job_posts
    ADD CONSTRAINT job_posts_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update all example data to be owned by the admin user (cat701450@gmail.com)
UPDATE public.digital_products
SET user_id = (SELECT id FROM auth.users WHERE LOWER(email) = 'cat701450@gmail.com')
WHERE title IN (
  'Professional Business Proposal Template',
  'Social Media Content Calendar 2025',
  'Complete Brand Identity Kit'
);

UPDATE public.courses
SET user_id = (SELECT id FROM auth.users WHERE LOWER(email) = 'cat701450@gmail.com')
WHERE title IN (
  'Complete Web Development Bootcamp',
  'Digital Marketing Mastery',
  'Graphic Design Fundamentals'
);

UPDATE public.fundraisings
SET user_id = (SELECT id FROM auth.users WHERE LOWER(email) = 'cat701450@gmail.com')
WHERE title IN (
  'Community Health Center Construction',
  'Youth Education Scholarship Fund',
  'Small Business Recovery Fund'
);

UPDATE public.job_posts
SET user_id = (SELECT id FROM auth.users WHERE LOWER(email) = 'cat701450@gmail.com')
WHERE title IN (
  'Senior Full-Stack Developer',
  'Digital Marketing Specialist',
  'UI/UX Designer'
);