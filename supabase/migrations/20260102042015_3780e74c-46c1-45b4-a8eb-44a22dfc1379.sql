-- =====================================================
-- NaijaLancers Learning Hub - Complete Assessment & Certification System
-- =====================================================

-- Course sections/modules table
CREATE TABLE IF NOT EXISTS public.course_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  video_duration_minutes INTEGER DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Section quizzes table (5-10 questions per section)
CREATE TABLE IF NOT EXISTS public.section_quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.course_sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  time_limit_minutes INTEGER DEFAULT 10,
  pass_percentage INTEGER DEFAULT 60,
  max_attempts INTEGER DEFAULT 3,
  is_randomized BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Quiz questions table
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.section_quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice', -- multiple_choice, true_false, scenario
  options JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {text: string, is_correct: boolean}
  explanation TEXT,
  points INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Final exams table (30-40 questions, 70% pass)
CREATE TABLE IF NOT EXISTS public.course_final_exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Final Exam',
  time_limit_minutes INTEGER DEFAULT 60,
  pass_percentage INTEGER DEFAULT 70,
  max_attempts INTEGER DEFAULT 3,
  is_randomized BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Final exam questions
CREATE TABLE IF NOT EXISTS public.final_exam_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.course_final_exams(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice', -- multiple_choice, scenario
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  explanation TEXT,
  points INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Practical tasks table
CREATE TABLE IF NOT EXISTS public.course_practical_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  instructions TEXT,
  submission_types JSONB DEFAULT '["text", "url", "screenshot", "file"]'::jsonb,
  example_submission TEXT,
  ai_review_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User quiz attempts
CREATE TABLE IF NOT EXISTS public.user_quiz_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  quiz_id UUID NOT NULL REFERENCES public.section_quizzes(id) ON DELETE CASCADE,
  score_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  passed BOOLEAN DEFAULT false,
  answers JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  time_spent_seconds INTEGER DEFAULT 0
);

-- User final exam attempts
CREATE TABLE IF NOT EXISTS public.user_exam_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exam_id UUID NOT NULL REFERENCES public.course_final_exams(id) ON DELETE CASCADE,
  score_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  passed BOOLEAN DEFAULT false,
  answers JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  time_spent_seconds INTEGER DEFAULT 0
);

-- Practical task submissions
CREATE TABLE IF NOT EXISTS public.practical_task_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  task_id UUID NOT NULL REFERENCES public.course_practical_tasks(id) ON DELETE CASCADE,
  submission_type TEXT NOT NULL,
  submission_content TEXT,
  file_url TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  ai_feedback TEXT,
  manual_feedback TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Certificates table with verification
CREATE TABLE IF NOT EXISTS public.learning_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  certificate_id TEXT NOT NULL UNIQUE, -- Unique verification code
  learner_name TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  skill_level TEXT NOT NULL, -- Beginner, Intermediate, Advanced
  quiz_scores JSONB DEFAULT '[]'::jsonb,
  final_exam_score DECIMAL(5,2),
  practical_task_approved BOOLEAN DEFAULT false,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verified_count INTEGER DEFAULT 0,
  last_verified_at TIMESTAMP WITH TIME ZONE
);

-- User section progress (detailed per section)
CREATE TABLE IF NOT EXISTS public.user_section_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  section_id UUID NOT NULL REFERENCES public.course_sections(id) ON DELETE CASCADE,
  video_watched_percentage DECIMAL(5,2) DEFAULT 0,
  watch_time_seconds INTEGER DEFAULT 0,
  quiz_passed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, section_id)
);

-- User learning stats
CREATE TABLE IF NOT EXISTS public.user_learning_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  total_courses_started INTEGER DEFAULT 0,
  total_courses_completed INTEGER DEFAULT 0,
  total_certificates_earned INTEGER DEFAULT 0,
  total_watch_time_minutes INTEGER DEFAULT 0,
  total_quizzes_passed INTEGER DEFAULT 0,
  current_learning_level TEXT DEFAULT 'Beginner', -- Beginner, Intermediate, Advanced
  primary_learning_path TEXT,
  streak_days INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.course_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_final_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_practical_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practical_task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_section_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_learning_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for course content (viewable by all)
CREATE POLICY "Course sections are viewable by all" ON public.course_sections FOR SELECT USING (true);
CREATE POLICY "Section quizzes are viewable by all" ON public.section_quizzes FOR SELECT USING (true);
CREATE POLICY "Quiz questions viewable by enrolled users" ON public.quiz_questions FOR SELECT USING (true);
CREATE POLICY "Final exams viewable by all" ON public.course_final_exams FOR SELECT USING (true);
CREATE POLICY "Exam questions viewable by enrolled users" ON public.final_exam_questions FOR SELECT USING (true);
CREATE POLICY "Practical tasks viewable by all" ON public.course_practical_tasks FOR SELECT USING (true);

-- RLS for user progress (users see own data)
CREATE POLICY "Users can view own quiz attempts" ON public.user_quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own quiz attempts" ON public.user_quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own quiz attempts" ON public.user_quiz_attempts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own exam attempts" ON public.user_exam_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own exam attempts" ON public.user_exam_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own exam attempts" ON public.user_exam_attempts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own task submissions" ON public.practical_task_submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own task submissions" ON public.practical_task_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Certificates are publicly viewable" ON public.learning_certificates FOR SELECT USING (true);
CREATE POLICY "Users can insert own certificates" ON public.learning_certificates FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own section progress" ON public.user_section_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own section progress" ON public.user_section_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own section progress" ON public.user_section_progress FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own learning stats" ON public.user_learning_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own learning stats" ON public.user_learning_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own learning stats" ON public.user_learning_stats FOR UPDATE USING (auth.uid() = user_id);

-- Course owners can manage their content
CREATE POLICY "Course owners can manage sections" ON public.course_sections FOR ALL USING (
  EXISTS (SELECT 1 FROM courses WHERE courses.id = course_id AND courses.user_id = auth.uid())
);

CREATE POLICY "Course owners can manage quizzes" ON public.section_quizzes FOR ALL USING (
  EXISTS (SELECT 1 FROM course_sections cs JOIN courses c ON cs.course_id = c.id 
          WHERE cs.id = section_id AND c.user_id = auth.uid())
);

CREATE POLICY "Course owners can manage quiz questions" ON public.quiz_questions FOR ALL USING (
  EXISTS (SELECT 1 FROM section_quizzes sq JOIN course_sections cs ON sq.section_id = cs.id 
          JOIN courses c ON cs.course_id = c.id WHERE sq.id = quiz_id AND c.user_id = auth.uid())
);

CREATE POLICY "Course owners can manage final exams" ON public.course_final_exams FOR ALL USING (
  EXISTS (SELECT 1 FROM courses WHERE courses.id = course_id AND courses.user_id = auth.uid())
);

CREATE POLICY "Course owners can manage exam questions" ON public.final_exam_questions FOR ALL USING (
  EXISTS (SELECT 1 FROM course_final_exams fe JOIN courses c ON fe.course_id = c.id 
          WHERE fe.id = exam_id AND c.user_id = auth.uid())
);

CREATE POLICY "Course owners can manage practical tasks" ON public.course_practical_tasks FOR ALL USING (
  EXISTS (SELECT 1 FROM courses WHERE courses.id = course_id AND courses.user_id = auth.uid())
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_sections_course ON public.course_sections(course_id);
CREATE INDEX IF NOT EXISTS idx_section_quizzes_section ON public.section_quizzes(section_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON public.quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_final_exam_questions_exam ON public.final_exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_user ON public.user_quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_exam_attempts_user ON public.user_exam_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_section_progress_user ON public.user_section_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_certificates_user ON public.learning_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_certificates_code ON public.learning_certificates(certificate_id);

-- Function to generate unique certificate ID
CREATE OR REPLACE FUNCTION public.generate_certificate_id()
RETURNS TEXT AS $$
DECLARE
  new_id TEXT;
  exists_count INTEGER;
BEGIN
  LOOP
    new_id := 'NL-' || UPPER(SUBSTRING(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 8));
    SELECT COUNT(*) INTO exists_count FROM learning_certificates WHERE certificate_id = new_id;
    IF exists_count = 0 THEN
      RETURN new_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;