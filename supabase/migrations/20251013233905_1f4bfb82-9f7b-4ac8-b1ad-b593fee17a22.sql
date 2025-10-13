-- Insert example data - FINAL FIX with proper array syntax
DO $$
DECLARE
  valid_user_id uuid;
BEGIN
  SELECT user_id INTO valid_user_id FROM profiles LIMIT 1;
  
  ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
  ALTER TABLE digital_products DISABLE ROW LEVEL SECURITY;
  ALTER TABLE fundraisings DISABLE ROW LEVEL SECURITY;
  ALTER TABLE job_posts DISABLE ROW LEVEL SECURITY;
  
  INSERT INTO courses (user_id, title, description, price, status, level, duration_hours, course_urls, learning_objectives, curriculum, average_rating, review_count, enrollment_count) VALUES
  (valid_user_id, 'Web Development Bootcamp', 'Master web development with React and Node.js', 15000, 'active', 'beginner', 120, '["https://example.com/v1"]', '["Build websites"]', '["Intro", "React"]', 4.8, 156, 1200),
  (valid_user_id, 'Digital Marketing', 'Learn SEO and social media marketing', 12000, 'active', 'intermediate', 80, '["https://example.com/v2"]', '["Master SEO"]', '["SEO", "Ads"]', 4.7, 98, 850);
  
  INSERT INTO digital_products (user_id, title, description, price, status, category, file_url, average_rating, review_count, download_count) VALUES
  (valid_user_id, 'Business Proposal Template', 'Professional proposal template', 5000, 'active', 'template', 'https://example.com/doc', 4.6, 45, 320),
  (valid_user_id, 'Content Calendar 2025', 'Social media content calendar', 3500, 'active', 'template', 'https://example.com/cal', 4.8, 78, 560);
  
  INSERT INTO fundraisings (user_id, title, description, goal_amount, raised_amount, status, category, backer_count, approved_at) VALUES
  (valid_user_id, 'Health Center Construction', 'Build a health center for the community', 5000000, 2350000, 'approved', 'medical', 156, NOW()),
  (valid_user_id, 'Education Scholarship Fund', 'Support students with scholarships', 2000000, 890000, 'approved', 'education', 203, NOW());
  
  INSERT INTO job_posts (user_id, title, description, budget_min, budget_max, status, required_skills) VALUES
  (valid_user_id, 'Full-Stack Developer', 'Build web applications with React', 150000, 300000, 'open', ARRAY['React', 'Node.js']),
  (valid_user_id, 'Marketing Specialist', 'Manage social media campaigns', 80000, 150000, 'open', ARRAY['SEO', 'Social Media']);
  
  ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
  ALTER TABLE digital_products ENABLE ROW LEVEL SECURITY;
  ALTER TABLE fundraisings ENABLE ROW LEVEL SECURITY;
  ALTER TABLE job_posts ENABLE ROW LEVEL SECURITY;
END $$;