import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, CheckCircle, Lock, Clock, Award, FileText, Trophy, Sparkles, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { learningCourses, LearningCourse, CourseSection } from '@/lib/learningCourses';
import { useLearningProgress } from '@/hooks/useLearningProgress';
import { SectionQuiz } from './SectionQuiz';
import { PracticalTaskSubmission } from './PracticalTaskSubmission';
import { FinalExam } from './FinalExam';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export function CoursePlayer() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showExam, setShowExam] = useState(false);
  const [showPractical, setShowPractical] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);
  const timerRef = useRef<NodeJS.Timeout>();

  const course = learningCourses.find(c => c.id === courseId);
  const { 
    courseProgress, 
    updateSectionProgress, 
    getCombinedSectionProgress,
    getExamAttempts,
    isLoading,
    isAuthenticated 
  } = useLearningProgress(courseId);

  useEffect(() => {
    // Start timer when component mounts
    timerRef.current = setInterval(() => {
      setTimeSpent(prev => prev + 1);
      setTotalTimeSpent(prev => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Auto-save progress periodically
  useEffect(() => {
    const saveInterval = setInterval(() => {
      if (course && timeSpent >= 30) {
        const sectionId = course.sections[currentSectionIndex]?.id;
        if (sectionId) {
          updateSectionProgress.mutate({
            sectionId,
            timeSpent,
            completed: false,
          });
          setTimeSpent(0);
        }
      }
    }, 30000); // Save every 30 seconds

    return () => clearInterval(saveInterval);
  }, [course, currentSectionIndex, timeSpent]);

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Course Not Found</h2>
          <p className="text-muted-foreground mb-4">This course doesn't exist or has been removed.</p>
          <Button onClick={() => navigate('/learn')}>Back to Learn Hub</Button>
        </Card>
      </div>
    );
  }

  const currentSection = course.sections[currentSectionIndex];
  const totalSections = course.sections.length;
  
  // Calculate progress from combined sources
  const sectionProgressData = getCombinedSectionProgress();
  const completedSections = sectionProgressData.filter((s: any) => s.quiz_passed).length;
  const overallProgress = Math.min((completedSections / totalSections) * 100, 100);
  
  // Check exam status
  const examAttempts = getExamAttempts();
  const examPassed = examAttempts.some((e: any) => e.passed);
  
  // Check practical status
  const practicalSubmitted = courseProgress?.practicalSubmission?.status !== undefined;
  const practicalApproved = courseProgress?.practicalSubmission?.status === 'approved';
  
  // Certificate eligibility
  const certificateEligible = completedSections === totalSections && examPassed && practicalApproved;
  const hasCertificate = !!courseProgress?.certificate;

  const isSectionUnlocked = (index: number) => {
    if (index === 0) return true;
    const prevSection = course.sections[index - 1];
    const prevProgress = sectionProgressData.find((s: any) => s.section_id === prevSection?.id);
    return prevProgress?.quiz_passed || false;
  };

  const isSectionCompleted = (sectionId: string) => {
    return sectionProgressData.find((s: any) => s.section_id === sectionId)?.quiz_passed || false;
  };

  const handleSectionComplete = () => {
    // Save current progress before showing quiz
    if (currentSection) {
      updateSectionProgress.mutate({
        sectionId: currentSection.id,
        timeSpent,
        completed: true,
      });
      setTimeSpent(0);
    }
    setShowQuiz(true);
  };

  const handleQuizComplete = (passed: boolean) => {
    setShowQuiz(false);
    if (passed && currentSectionIndex < totalSections - 1) {
      // Move to next section
      setCurrentSectionIndex(prev => prev + 1);
    } else if (passed && currentSectionIndex === totalSections - 1) {
      // All sections complete - show exam or practical
      if (!examPassed) {
        setShowExam(true);
      } else {
        setShowPractical(true);
      }
    }
  };

  const handleExamComplete = (passed: boolean) => {
    setShowExam(false);
    if (passed) {
      setShowPractical(true);
    }
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (match) {
      const videoId = match[1];
      const timeMatch = url.match(/[&?]t=(\d+)s?/);
      const startTime = timeMatch ? `&start=${timeMatch[1]}` : '';
      return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1${startTime}`;
    }
    return url;
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (showQuiz && currentSection) {
    return (
      <SectionQuiz
        courseId={course.id}
        section={currentSection}
        onComplete={handleQuizComplete}
        onBack={() => setShowQuiz(false)}
      />
    );
  }

  if (showExam) {
    return (
      <FinalExam
        course={course}
        onComplete={handleExamComplete}
        onBack={() => setShowExam(false)}
      />
    );
  }

  if (showPractical) {
    return (
      <PracticalTaskSubmission
        course={course}
        onBack={() => setShowPractical(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/learn')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold truncate">{course.title}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className={cn(
                "text-xs",
                course.level === 'Beginner' && "bg-green-500/10 text-green-600 border-green-500/30",
                course.level === 'Intermediate' && "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
                course.level === 'Advanced' && "bg-red-500/10 text-red-600 border-red-500/30"
              )}>
                {course.level}
              </Badge>
              <span>•</span>
              <Clock className="h-3 w-3" />
              <span>{formatTime(totalTimeSpent)}</span>
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-2">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Course Progress</span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Certificate Motivation Banner */}
        {!hasCertificate && (
          <Card className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/20 rounded-full shrink-0">
                  <Trophy className="h-6 w-6 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">Earn Your Certificate!</h3>
                  <p className="text-xs text-muted-foreground">
                    Complete all sections, pass the exam (70%+), and submit your practical task.
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <span className={cn("flex items-center gap-1", completedSections === totalSections ? "text-green-600" : "text-muted-foreground")}>
                      {completedSections === totalSections ? <CheckCircle className="h-3 w-3" /> : <Target className="h-3 w-3" />}
                      {completedSections}/{totalSections} Sections
                    </span>
                    <span className={cn("flex items-center gap-1", examPassed ? "text-green-600" : "text-muted-foreground")}>
                      {examPassed ? <CheckCircle className="h-3 w-3" /> : <Target className="h-3 w-3" />}
                      Final Exam
                    </span>
                    <span className={cn("flex items-center gap-1", practicalApproved ? "text-green-600" : "text-muted-foreground")}>
                      {practicalApproved ? <CheckCircle className="h-3 w-3" /> : <Target className="h-3 w-3" />}
                      Practical
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {hasCertificate && (
          <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-500/20 rounded-full">
                    <Award className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Certificate Earned!</h3>
                    <p className="text-xs text-muted-foreground">Congratulations on completing this course</p>
                  </div>
                </div>
                <Button size="sm" onClick={() => navigate(`/certificate/${courseProgress?.certificate?.id}`)}>
                  View Certificate
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Video Player */}
        <Card className="overflow-hidden">
          <div className="aspect-video bg-black">
            <iframe
              src={getYouTubeEmbedUrl(currentSection?.videoUrl || course.videoUrl)}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={currentSection?.title || course.title}
            />
          </div>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{currentSection?.title || course.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{currentSection?.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {currentSection?.durationMinutes || 0} min
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {currentSection?.quizQuestions?.length || 0} quiz questions
                  </Badge>
                </div>
              </div>
              <Button onClick={handleSectionComplete} className="shrink-0 gap-2">
                <CheckCircle className="h-4 w-4" />
                Complete & Quiz
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Course Outline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Course Sections ({completedSections}/{totalSections})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {course.sections.map((section, index) => {
              const isUnlocked = isSectionUnlocked(index);
              const isCompleted = isSectionCompleted(section.id);
              const isCurrent = index === currentSectionIndex;

              return (
                <div
                  key={section.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-all",
                    isCurrent && "bg-primary/10 border-primary shadow-sm",
                    isCompleted && !isCurrent && "bg-green-500/5 border-green-500/30",
                    !isUnlocked && "opacity-50 cursor-not-allowed",
                    isUnlocked && !isCurrent && "cursor-pointer hover:bg-accent"
                  )}
                  onClick={() => isUnlocked && setCurrentSectionIndex(index)}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0",
                    isCompleted && "bg-green-500 text-white",
                    isCurrent && !isCompleted && "bg-primary text-primary-foreground",
                    !isCompleted && !isCurrent && "bg-muted"
                  )}>
                    {isCompleted ? <CheckCircle className="h-4 w-4" /> : 
                     !isUnlocked ? <Lock className="h-4 w-4" /> : index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{section.title}</p>
                    <p className="text-xs text-muted-foreground">{section.durationMinutes} min • {section.quizQuestions.length} questions</p>
                  </div>
                  {isCompleted && (
                    <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-600 shrink-0">
                      ✓ Passed
                    </Badge>
                  )}
                  {isCurrent && !isCompleted && (
                    <Badge className="text-xs shrink-0">Current</Badge>
                  )}
                </div>
              );
            })}

            {/* Final Exam */}
            <div
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all",
                completedSections === totalSections && !examPassed
                  ? "cursor-pointer hover:bg-accent border-orange-500/30 bg-orange-500/5" 
                  : examPassed 
                    ? "bg-green-500/5 border-green-500/30"
                    : "opacity-50 cursor-not-allowed"
              )}
              onClick={() => completedSections === totalSections && !examPassed && setShowExam(true)}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                examPassed ? "bg-green-500 text-white" : 
                completedSections === totalSections ? "bg-orange-500 text-white" : "bg-muted"
              )}>
                {examPassed ? <CheckCircle className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Final Exam</p>
                <p className="text-xs text-muted-foreground">Pass with 70% to continue</p>
              </div>
              {examPassed ? (
                <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-600">
                  ✓ Passed
                </Badge>
              ) : completedSections < totalSections && (
                <Badge variant="outline" className="text-xs">
                  Complete sections first
                </Badge>
              )}
            </div>

            {/* Practical Task */}
            <div
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all",
                examPassed && !practicalApproved
                  ? "cursor-pointer hover:bg-accent border-purple-500/30 bg-purple-500/5" 
                  : practicalApproved
                    ? "bg-green-500/5 border-green-500/30"
                    : "opacity-50 cursor-not-allowed"
              )}
              onClick={() => examPassed && !practicalApproved && setShowPractical(true)}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                practicalApproved ? "bg-green-500 text-white" : 
                examPassed ? "bg-purple-500 text-white" : "bg-muted"
              )}>
                {practicalApproved ? <CheckCircle className="h-4 w-4" /> : <Award className="h-4 w-4" />}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Practical Task</p>
                <p className="text-xs text-muted-foreground">{course.practicalTask.title}</p>
              </div>
              {practicalApproved ? (
                <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-600">
                  ✓ Approved
                </Badge>
              ) : practicalSubmitted ? (
                <Badge variant="secondary" className="text-xs bg-yellow-500/20 text-yellow-600">
                  Under Review
                </Badge>
              ) : !examPassed && (
                <Badge variant="outline" className="text-xs">
                  Pass exam first
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Learning Stats */}
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="p-4">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-xl font-bold text-primary">{completedSections}</p>
                <p className="text-[10px] text-muted-foreground">Sections</p>
              </div>
              <div>
                <p className="text-xl font-bold text-primary">{formatTime(totalTimeSpent)}</p>
                <p className="text-[10px] text-muted-foreground">Time</p>
              </div>
              <div>
                <p className="text-xl font-bold text-primary">{Math.round(overallProgress)}%</p>
                <p className="text-[10px] text-muted-foreground">Progress</p>
              </div>
              <div>
                <p className="text-xl font-bold text-primary">{examPassed ? '✓' : '-'}</p>
                <p className="text-[10px] text-muted-foreground">Exam</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sign up prompt for non-authenticated users */}
        {!isAuthenticated && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/20 rounded-full shrink-0">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">Save Your Progress</h3>
                  <p className="text-xs text-muted-foreground">
                    Sign up to save progress, earn certificates, and track your learning journey!
                  </p>
                </div>
                <Button size="sm" onClick={() => navigate('/signup')}>
                  Sign Up
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}