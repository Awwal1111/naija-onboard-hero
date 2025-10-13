-- Comprehensive improvements for job_posts
ALTER TABLE job_posts
ADD COLUMN IF NOT EXISTS company_size text CHECK (company_size IN ('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+')),
ADD COLUMN IF NOT EXISTS industry text,
ADD COLUMN IF NOT EXISTS requirements text,
ADD COLUMN IF NOT EXISTS responsibilities text,
ADD COLUMN IF NOT EXISTS benefits jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS qualifications jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS application_instructions text,
ADD COLUMN IF NOT EXISTS salary_currency text DEFAULT 'NGN',
ADD COLUMN IF NOT EXISTS salary_period text CHECK (salary_period IN ('hourly', 'daily', 'weekly', 'monthly', 'yearly', 'project')),
ADD COLUMN IF NOT EXISTS is_negotiable boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS work_schedule text,
ADD COLUMN IF NOT EXISTS contact_email text,
ADD COLUMN IF NOT EXISTS contact_phone text,
ADD COLUMN IF NOT EXISTS company_website text,
ADD COLUMN IF NOT EXISTS company_logo_url text;

-- Comprehensive improvements for digital_products
ALTER TABLE digital_products
ADD COLUMN IF NOT EXISTS detailed_description text,
ADD COLUMN IF NOT EXISTS features jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS requirements text,
ADD COLUMN IF NOT EXISTS compatibility text,
ADD COLUMN IF NOT EXISTS version text,
ADD COLUMN IF NOT EXISTS license_type text CHECK (license_type IN ('personal', 'commercial', 'extended', 'unlimited')),
ADD COLUMN IF NOT EXISTS file_size text,
ADD COLUMN IF NOT EXISTS file_format text,
ADD COLUMN IF NOT EXISTS demo_url text,
ADD COLUMN IF NOT EXISTS update_history jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS refund_policy text,
ADD COLUMN IF NOT EXISTS support_included boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS instant_download boolean DEFAULT true;

-- Comprehensive improvements for courses
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS curriculum jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS prerequisites text,
ADD COLUMN IF NOT EXISTS learning_objectives jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS target_audience text,
ADD COLUMN IF NOT EXISTS certificate_included boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS language text DEFAULT 'English',
ADD COLUMN IF NOT EXISTS subtitle_languages jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS materials_included jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS instructor_name text,
ADD COLUMN IF NOT EXISTS instructor_bio text,
ADD COLUMN IF NOT EXISTS instructor_credentials text,
ADD COLUMN IF NOT EXISTS course_category text,
ADD COLUMN IF NOT EXISTS lifetime_access boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS money_back_guarantee boolean DEFAULT false;