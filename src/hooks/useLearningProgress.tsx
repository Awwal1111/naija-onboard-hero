import { useState, useEffect } from 'react';
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

export function useLearningProgress(courseId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's learning stats
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

  // Fetch course progress
  const { data: courseProgress, isLoading: progressLoading } = useQuery({
    queryKey: ['course-progress', user?.id, courseId],
    queryFn: async () => {
      if (!user || !courseId) return null;
      
      const { data: progress } = await supabase
        .from('course_progress')
        .select('*')
        .eq('student_id', user.id)
        .eq('course_id', courseId)
        .single();

      const { data: sectionProgress } = await supabase
        .from('user_section_progress')
        .select('*')
        .eq('user_id', user.id);

      const { data: quizAttempts } = await supabase
        .from('user_quiz_attempts')
        .select('*')
        .eq('user_id', user.id);

      const { data: examAttempts } = await supabase
        .from('user_exam_attempts')
        .select('*')
        .eq('user_id', user.id);

      const { data: practicalSubmission } = await supabase
        .from('practical_task_submissions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const { data: certificate } = await supabase
        .from('learning_certificates')
        .select('*')
        .eq('user_id', user.id)
        .single();

      return {
        progress,
        sectionProgress: sectionProgress || [],
        quizAttempts: quizAttempts || [],
        examAttempts: examAttempts || [],
        practicalSubmission,
        certificate,
      };
    },
    enabled: !!user && !!courseId,
  });

  // Update section progress
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
      if (!user || !courseId) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('user_section_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('section_id', sectionId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('user_section_progress')
          .update({
            watch_time_seconds: (existing.watch_time_seconds || 0) + timeSpent,
            video_watched_percentage: completed ? 100 : existing.video_watched_percentage,
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
      if (!user || !courseId) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_quiz_attempts')
        .insert({
          user_id: user.id,
          quiz_id: quizId,
          answers,
          score,
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
          .single();

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
      if (data.passed) {
        toast({ title: 'Quiz Passed!', description: `You scored ${data.score}%` });
      } else {
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
      if (!user || !courseId) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_exam_attempts')
        .insert({
          user_id: user.id,
          course_id: courseId,
          exam_id: examId,
          answers,
          score,
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
          .single();

        if (existing) {
          await supabase
            .from('course_progress')
            .update({
              progress_percentage: 100,
              completed_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('course_progress')
            .insert({
              student_id: user.id,
              course_id: courseId,
              progress_percentage: 100,
              completed_at: new Date().toISOString(),
            });
        }
      }

      return { score, passed };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['course-progress'] });
      if (data.passed) {
        toast({ title: '🎉 Exam Passed!', description: `You scored ${data.score}%! Submit your practical task to earn your certificate.` });
      } else {
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
      if (!user || !courseId) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('practical_task_submissions')
        .insert({
          user_id: user.id,
          course_id: courseId,
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
      toast({ title: 'Task Submitted!', description: 'Your practical task is being reviewed.' });
    },
  });

  return {
    learningStats,
    courseProgress,
    isLoading: statsLoading || progressLoading,
    updateSectionProgress,
    submitQuizAttempt,
    submitExamAttempt,
    submitPracticalTask,
  };
}
