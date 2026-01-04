import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface SectionProgress {
  sectionId: string;
  completed: boolean;
  quizPassed: boolean;
  quizScore: number;
  timeSpent: number;
}

export interface CourseProgress {
  courseId: string;
  totalProgress: number;
  sectionsCompleted: number;
  totalSections: number;
  quizzesPassed: number;
  examPassed: boolean;
  examScore: number;
  practicalSubmitted: boolean;
  practicalApproved: boolean;
  certificateEarned: boolean;
  certificateId: string | null;
  lastAccessedAt: string;
  sections: Record<string, SectionProgress>;
}

// Local storage keys
const STORAGE_KEY = 'naijalancers_learning_progress';

// Get local progress for non-authenticated users
function getLocalProgress(): Record<string, any> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveLocalProgress(data: Record<string, any>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    console.warn('Failed to save progress to localStorage');
  }
}

export function useLearningProgress(courseId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Local state for non-authenticated progress
  const [localProgress, setLocalProgress] = useState<Record<string, any>>(() => getLocalProgress());

  // Sync local progress to state
  useEffect(() => {
    const handleStorageChange = () => setLocalProgress(getLocalProgress());
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Fetch user's learning stats from DB (only if authenticated)
  const { data: learningStats, isLoading: statsLoading } = useQuery({
    queryKey: ['learning-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_learning_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch course progress from DB or local storage
  const { data: courseProgress, isLoading: progressLoading, refetch: refetchProgress } = useQuery({
    queryKey: ['course-progress', user?.id, courseId],
    queryFn: async () => {
      // For non-authenticated users, use local storage
      if (!user) {
        if (!courseId) return null;
        const local = getLocalProgress();
        return {
          progress: local[courseId]?.progress || null,
          sectionProgress: local[courseId]?.sectionProgress || [],
          quizAttempts: local[courseId]?.quizAttempts || [],
          examAttempts: local[courseId]?.examAttempts || [],
          practicalSubmission: local[courseId]?.practicalSubmission || null,
          certificate: null,
        };
      }
      
      if (!courseId) return null;
      
      // Fetch from DB for authenticated users
      const { data: progress } = await supabase
        .from('course_progress')
        .select('*')
        .eq('student_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();

      const { data: sectionProgress } = await supabase
        .from('user_section_progress')
        .select('*')
        .eq('user_id', user.id)
        .like('section_id', `${courseId}%`);

      // Use type assertion to avoid deep type inference issues
      const quizAttempts = await supabase
        .from('user_quiz_attempts')
        .select('id, quiz_id, score_percentage, passed, completed_at')
        .eq('user_id', user.id)
        .then(res => (res.data || []) as unknown as Array<{id: string; quiz_id: string; score_percentage: number; passed: boolean; completed_at: string}>);

      const examAttempts = await supabase
        .from('user_exam_attempts')
        .select('id, exam_id, score_percentage, passed, completed_at')
        .eq('user_id', user.id)
        .then(res => (res.data || []) as unknown as Array<{id: string; exam_id: string; score_percentage: number; passed: boolean; completed_at: string}>);

      // Practical submissions - query by task_id pattern (courseId-*)
      const practicalSubmission = await supabase
        .from('practical_task_submissions')
        .select('id, task_id, status, submission_content, file_url')
        .eq('user_id', user.id)
        .like('task_id', `${courseId}%`)
        .maybeSingle()
        .then(res => res.data);

      // Certificates
      const certificate = await supabase
        .from('learning_certificates')
        .select('id, certificate_id, skill_name, skill_level, issued_at, final_exam_score')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle()
        .then(res => res.data);

      return {
        progress,
        sectionProgress: sectionProgress || [],
        quizAttempts: quizAttempts || [],
        examAttempts: examAttempts || [],
        practicalSubmission,
        certificate,
      };
    },
    enabled: !!courseId,
  });

  // Update section progress (works for both auth and non-auth)
  const updateSectionProgress = useMutation({
    mutationFn: async ({ 
      sectionId, 
      timeSpent,
      completed 
    }: { 
      sectionId: string; 
      timeSpent: number;
      completed: boolean;
    }) => {
      if (!courseId) throw new Error('No course ID');

      // For non-authenticated users, save to local storage
      if (!user) {
        const local = getLocalProgress();
        const courseData = local[courseId] || { sectionProgress: [], quizAttempts: [], examAttempts: [] };
        
        const existingIdx = courseData.sectionProgress.findIndex((s: any) => s.section_id === sectionId);
        const existingProgress = existingIdx >= 0 ? courseData.sectionProgress[existingIdx] : null;
        
        const newProgress = {
          section_id: sectionId,
          watch_time_seconds: (existingProgress?.watch_time_seconds || 0) + timeSpent,
          video_watched_percentage: completed ? 100 : (existingProgress?.video_watched_percentage || 0),
          completed_at: completed ? new Date().toISOString() : null,
          quiz_passed: existingProgress?.quiz_passed || false,
        };

        if (existingIdx >= 0) {
          courseData.sectionProgress[existingIdx] = newProgress;
        } else {
          courseData.sectionProgress.push(newProgress);
        }
        
        local[courseId] = courseData;
        saveLocalProgress(local);
        setLocalProgress(local);
        return;
      }

      // For authenticated users, save to DB
      const { data: existing } = await supabase
        .from('user_section_progress')
        .select('id, watch_time_seconds, video_watched_percentage')
        .eq('user_id', user.id)
        .eq('section_id', sectionId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_section_progress')
          .update({
            watch_time_seconds: ((existing.watch_time_seconds as number) || 0) + timeSpent,
            video_watched_percentage: completed ? 100 : (existing.video_watched_percentage as number),
            completed_at: completed ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_section_progress')
          .insert({
            user_id: user.id,
            section_id: sectionId,
            watch_time_seconds: timeSpent,
            video_watched_percentage: completed ? 100 : 0,
            completed_at: completed ? new Date().toISOString() : null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-progress'] });
    },
  });

  // Submit quiz attempt
  const submitQuizAttempt = useMutation({
    mutationFn: async ({ 
      quizId, 
      sectionId,
      answers, 
      score,
      passed 
    }: { 
      quizId: string;
      sectionId: string;
      answers: Record<string, string>;
      score: number;
      passed: boolean;
    }) => {
      if (!courseId) throw new Error('No course ID');

      // For non-authenticated users
      if (!user) {
        const local = getLocalProgress();
        const courseData = local[courseId] || { sectionProgress: [], quizAttempts: [], examAttempts: [] };
        
        courseData.quizAttempts.push({
          quiz_id: quizId,
          answers,
          score,
          passed,
          completed_at: new Date().toISOString(),
        });

        // Update section progress if passed
        if (passed) {
          const existingIdx = courseData.sectionProgress.findIndex((s: any) => s.section_id === sectionId);
          if (existingIdx >= 0) {
            courseData.sectionProgress[existingIdx].quiz_passed = true;
            courseData.sectionProgress[existingIdx].completed_at = new Date().toISOString();
          } else {
            courseData.sectionProgress.push({
              section_id: sectionId,
              quiz_passed: true,
              completed_at: new Date().toISOString(),
            });
          }
        }

        local[courseId] = courseData;
        saveLocalProgress(local);
        setLocalProgress(local);
        return { score, passed };
      }

      // For authenticated users
      const { error } = await supabase
        .from('user_quiz_attempts')
        .insert({
          user_id: user.id,
          quiz_id: quizId,
          answers,
          score_percentage: score,
          passed,
          completed_at: new Date().toISOString(),
        });
      if (error) throw error;

      // Update section progress if passed
      if (passed) {
        const { data: existing } = await supabase
          .from('user_section_progress')
          .select('id')
          .eq('user_id', user.id)
          .eq('section_id', sectionId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('user_section_progress')
            .update({
              quiz_passed: true,
              completed_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('user_section_progress')
            .insert({
              user_id: user.id,
              section_id: sectionId,
              quiz_passed: true,
              completed_at: new Date().toISOString(),
            });
        }
      }

      return { score, passed };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['course-progress'] });
      if (data?.passed) {
        toast({ title: '🎉 Quiz Passed!', description: `You scored ${data.score}%` });
      } else if (data) {
        toast({ 
          title: 'Quiz Not Passed', 
          description: `You scored ${data.score}%. You need 60% to pass.`,
          variant: 'destructive'
        });
      }
    },
  });

  // Submit exam attempt
  const submitExamAttempt = useMutation({
    mutationFn: async ({ 
      examId, 
      answers, 
      score,
      passed 
    }: { 
      examId: string;
      answers: Record<string, string>;
      score: number;
      passed: boolean;
    }) => {
      if (!courseId) throw new Error('No course ID');

      // For non-authenticated users
      if (!user) {
        const local = getLocalProgress();
        const courseData = local[courseId] || { sectionProgress: [], quizAttempts: [], examAttempts: [] };
        
        courseData.examAttempts.push({
          exam_id: examId,
          answers,
          score,
          passed,
          completed_at: new Date().toISOString(),
        });

        if (passed) {
          courseData.progress = {
            ...courseData.progress,
            progress_percentage: 90,
            completed_at: new Date().toISOString(),
          };
        }

        local[courseId] = courseData;
        saveLocalProgress(local);
        setLocalProgress(local);
        return { score, passed };
      }

      // For authenticated users
      const { error } = await supabase
        .from('user_exam_attempts')
        .insert({
          user_id: user.id,
          exam_id: examId,
          answers,
          score_percentage: score,
          passed,
          completed_at: new Date().toISOString(),
        });
      if (error) throw error;

      // Update course progress
      if (passed) {
        const { data: existing } = await supabase
          .from('course_progress')
          .select('id')
          .eq('student_id', user.id)
          .eq('course_id', courseId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('course_progress')
            .update({
              progress_percentage: 90,
              last_accessed_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('course_progress')
            .insert({
              student_id: user.id,
              course_id: courseId,
              progress_percentage: 90,
              last_accessed_at: new Date().toISOString(),
            });
        }
      }

      return { score, passed };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['course-progress'] });
      if (data?.passed) {
        toast({ title: '🎉 Exam Passed!', description: `You scored ${data.score}%! Submit your practical task to earn your certificate.` });
      } else if (data) {
        toast({ 
          title: 'Exam Not Passed', 
          description: `You scored ${data.score}%. You need 70% to pass.`,
          variant: 'destructive'
        });
      }
    },
  });

  // Submit practical task
  const submitPracticalTask = useMutation({
    mutationFn: async ({ 
      taskId, 
      submissionType,
      content,
      fileUrl 
    }: { 
      taskId: string;
      submissionType: string;
      content: string;
      fileUrl?: string;
    }) => {
      if (!courseId) throw new Error('No course ID');

      // For non-authenticated users - encourage sign up
      if (!user) {
        toast({ 
          title: 'Sign Up Required', 
          description: 'Create an account to submit tasks and earn certificates!',
          variant: 'destructive'
        });
        throw new Error('Authentication required for practical tasks');
      }

      const { error } = await supabase
        .from('practical_task_submissions')
        .insert({
          user_id: user.id,
          task_id: taskId,
          submission_type: submissionType,
          submission_content: content,
          file_url: fileUrl,
          status: 'pending',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-progress'] });
      toast({ title: '✅ Task Submitted!', description: 'Your practical task is being reviewed by AI.' });
    },
  });

  // Get combined progress (DB + local for display)
  const getCombinedSectionProgress = useCallback(() => {
    if (user && courseProgress?.sectionProgress) {
      return courseProgress.sectionProgress;
    }
    if (!user && courseId) {
      const local = getLocalProgress();
      return local[courseId]?.sectionProgress || [];
    }
    return [];
  }, [user, courseProgress, courseId]);

  const getExamAttempts = useCallback(() => {
    if (user && courseProgress?.examAttempts) {
      return courseProgress.examAttempts;
    }
    if (!user && courseId) {
      const local = getLocalProgress();
      return local[courseId]?.examAttempts || [];
    }
    return [];
  }, [user, courseProgress, courseId]);

  return {
    learningStats,
    courseProgress,
    isLoading: statsLoading || progressLoading,
    updateSectionProgress,
    submitQuizAttempt,
    submitExamAttempt,
    submitPracticalTask,
    getCombinedSectionProgress,
    getExamAttempts,
    refetchProgress,
    isAuthenticated: !!user,
  };
}