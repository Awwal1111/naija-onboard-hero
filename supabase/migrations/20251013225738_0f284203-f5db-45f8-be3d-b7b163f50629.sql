-- Job improvements: Add application tracking and deadlines
ALTER TABLE job_posts 
ADD COLUMN IF NOT EXISTS application_deadline timestamp with time zone,
ADD COLUMN IF NOT EXISTS is_remote boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS experience_level text CHECK (experience_level IN ('entry', 'intermediate', 'senior', 'expert')),
ADD COLUMN IF NOT EXISTS views_count integer DEFAULT 0;

-- Create job applications table with better tracking
CREATE TABLE IF NOT EXISTS job_post_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_post_id uuid NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  cover_letter text,
  resume_url text,
  expected_salary numeric,
  availability_date date,
  portfolio_urls jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'shortlisted', 'rejected', 'accepted')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(job_post_id, applicant_id)
);

ALTER TABLE job_post_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicants can view own applications"
ON job_post_applications FOR SELECT
USING (auth.uid() = applicant_id);

CREATE POLICY "Applicants can create applications"
ON job_post_applications FOR INSERT
WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Job posters can view applications for their jobs"
ON job_post_applications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM job_posts 
    WHERE job_posts.id = job_post_applications.job_post_id 
    AND job_posts.user_id = auth.uid()
  )
);

CREATE POLICY "Job posters can update application status"
ON job_post_applications FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM job_posts 
    WHERE job_posts.id = job_post_applications.job_post_id 
    AND job_posts.user_id = auth.uid()
  )
);

-- Digital products: Add reviews and ratings
CREATE TABLE IF NOT EXISTS product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES digital_products(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  is_verified_purchase boolean DEFAULT false,
  helpful_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(product_id, reviewer_id)
);

ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product reviews"
ON product_reviews FOR SELECT
USING (true);

CREATE POLICY "Buyers can create reviews"
ON product_reviews FOR INSERT
WITH CHECK (
  auth.uid() = reviewer_id AND
  EXISTS (
    SELECT 1 FROM digital_product_purchases
    WHERE product_id = product_reviews.product_id
    AND buyer_id = auth.uid()
  )
);

CREATE POLICY "Reviewers can update own reviews"
ON product_reviews FOR UPDATE
USING (auth.uid() = reviewer_id);

-- Add rating fields to digital_products
ALTER TABLE digital_products
ADD COLUMN IF NOT EXISTS average_rating numeric(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;

-- Fundraising improvements: Add updates and transparency
CREATE TABLE IF NOT EXISTS fundraising_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fundraising_id uuid NOT NULL REFERENCES fundraisings(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE fundraising_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view fundraising updates"
ON fundraising_updates FOR SELECT
USING (true);

CREATE POLICY "Campaign creators can add updates"
ON fundraising_updates FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM fundraisings
    WHERE fundraisings.id = fundraising_updates.fundraising_id
    AND fundraisings.user_id = auth.uid()
  )
);

-- Add transparency fields to fundraisings
ALTER TABLE fundraisings
ADD COLUMN IF NOT EXISTS backer_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS deadline timestamp with time zone,
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;

-- Course improvements: Add ratings and curriculum
CREATE TABLE IF NOT EXISTS course_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(course_id, student_id)
);

ALTER TABLE course_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view course reviews"
ON course_reviews FOR SELECT
USING (true);

CREATE POLICY "Enrolled students can create reviews"
ON course_reviews FOR INSERT
WITH CHECK (
  auth.uid() = student_id AND
  EXISTS (
    SELECT 1 FROM course_enrollments
    WHERE course_id = course_reviews.course_id
    AND student_id = auth.uid()
  )
);

-- Add rating fields to courses
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS average_rating numeric(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS duration_hours integer,
ADD COLUMN IF NOT EXISTS level text CHECK (level IN ('beginner', 'intermediate', 'advanced'));

-- Create saved jobs table
CREATE TABLE IF NOT EXISTS saved_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  job_post_id uuid NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, job_post_id)
);

ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their saved jobs"
ON saved_jobs FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Function to update product ratings
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE digital_products
  SET 
    average_rating = (
      SELECT COALESCE(AVG(rating)::numeric(3,2), 0)
      FROM product_reviews
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
    ),
    review_count = (
      SELECT COUNT(*)
      FROM product_reviews
      WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
    )
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_product_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON product_reviews
FOR EACH ROW EXECUTE FUNCTION update_product_rating();

-- Function to update course ratings
CREATE OR REPLACE FUNCTION update_course_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE courses
  SET 
    average_rating = (
      SELECT COALESCE(AVG(rating)::numeric(3,2), 0)
      FROM course_reviews
      WHERE course_id = COALESCE(NEW.course_id, OLD.course_id)
    ),
    review_count = (
      SELECT COUNT(*)
      FROM course_reviews
      WHERE course_id = COALESCE(NEW.course_id, OLD.course_id)
    )
  WHERE id = COALESCE(NEW.course_id, OLD.course_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_course_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON course_reviews
FOR EACH ROW EXECUTE FUNCTION update_course_rating();

-- Function to update fundraising backer count
CREATE OR REPLACE FUNCTION update_fundraising_backers()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE fundraisings
  SET backer_count = (
    SELECT COUNT(DISTINCT contributor_id)
    FROM fundraising_contributions
    WHERE fundraising_id = COALESCE(NEW.fundraising_id, OLD.fundraising_id)
  )
  WHERE id = COALESCE(NEW.fundraising_id, OLD.fundraising_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_fundraising_backers_trigger
AFTER INSERT OR DELETE ON fundraising_contributions
FOR EACH ROW EXECUTE FUNCTION update_fundraising_backers();