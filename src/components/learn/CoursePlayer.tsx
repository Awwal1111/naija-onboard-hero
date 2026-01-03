import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, CheckCircle, Lock, Clock, Award, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { learningCourses, LearningCourse, CourseSection } from '@/lib/learningCourses';
import { useLearningProgress } from '@/hooks/useLearningProgress';
import { SectionQuiz } from './SectionQuiz';
import { PracticalTaskSubmission } from './PracticalTaskSubmission';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export function CoursePlayer() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showPractical, setShowPractical] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [timeSpent, setTimeSpent] = useState(0);
  const timerRef = useRef<NodeJS.Timeout>();

  const course = learningCourses.find(c => c.id === courseId);
  const { courseProgress, updateSectionProgress, isLoading } = useLearningProgress(courseId);

  useEffect(() => {
    // Start timer when component mounts
    timerRef.current = setInterval(() => {
      setTimeSpent(prev => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Save progress when leaving section
  useEffect(() => {
    return () => {
      if (course && timeSpent > 0) {
        updateSectionProgress.mutate({
          sectionId: course.sections[currentSectionIndex]?.id || '',
          timeSpent,
          completed: false,
        });
      }
    };
  }, [currentSectionIndex]);

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
  
  // Calculate progress
  const sectionProgressData = courseProgress?.sectionProgress || [];
  const completedSections = sectionProgressData.filter(s => s.quiz_passed).length;
  const overallProgress = (completedSections / totalSections) * 100;

  const isSectionUnlocked = (index: number) => {
    if (index === 0) return true;
    const prevSection = course.sections[index - 1];
    const prevProgress = sectionProgressData.find(s => s.section_id === prevSection?.id);
    return prevProgress?.quiz_passed || false;
  };

  const isSectionCompleted = (sectionId: string) => {
    return sectionProgressData.find(s => s.section_id === sectionId)?.quiz_passed || false;
  };

  const handleSectionComplete = () => {
    setShowQuiz(true);
  };

  const handleQuizComplete = (passed: boolean) => {
    setShowQuiz(false);
    if (passed && currentSectionIndex < totalSections - 1) {
      // Move to next section
      setCurrentSectionIndex(prev => prev + 1);
      setTimeSpent(0);
    } else if (passed && currentSectionIndex === totalSections - 1) {
      // All sections complete - show practical task
      setShowPractical(true);
    }
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (match) {
      const videoId = match[1];
      const timeMatch = url.match(/[&?]t=(\d+)s?/);
      const startTime = timeMatch ? `&start=${timeMatch[1]}` : '';
      return `https://www.youtube.com/embed/${videoId}?rel=0${startTime}`;
    }
    return url;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
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
              <Badge variant="outline" className="text-xs">{course.level}</Badge>
              <span>•</span>
              <Clock className="h-3 w-3" />
              <span>{formatTime(timeSpent)}</span>
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-2">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Progress</span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Video Player */}
        <Card className="overflow-hidden">
          <div className="aspect-video bg-black">
            <iframe
              src={getYouTubeEmbedUrl(currentSection?.videoUrl || course.videoUrl)}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{currentSection?.title || course.title}</h2>
                <p className="text-sm text-muted-foreground">{currentSection?.description}</p>
              </div>
              <Button onClick={handleSectionComplete} className="shrink-0">
                Complete & Take Quiz
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
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                    isCurrent && "bg-primary/10 border-primary",
                    isCompleted && "bg-green-500/10 border-green-500/30",
                    !isUnlocked && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => isUnlocked && setCurrentSectionIndex(index)}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                    isCompleted && "bg-green-500 text-white",
                    isCurrent && !isCompleted && "bg-primary text-primary-foreground",
                    !isCompleted && !isCurrent && "bg-muted"
                  )}>
                    {isCompleted ? <CheckCircle className="h-4 w-4" /> : 
                     !isUnlocked ? <Lock className="h-4 w-4" /> : index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{section.title}</p>
                    <p className="text-xs text-muted-foreground">{section.durationMinutes} min</p>
                  </div>
                  {isCompleted && (
                    <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-600">
                      Passed
                    </Badge>
                  )}
                </div>
              );
            })}

            {/* Practical Task */}
            <div
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                completedSections === totalSections 
                  ? "cursor-pointer hover:bg-accent" 
                  : "opacity-50 cursor-not-allowed"
              )}
              onClick={() => completedSections === totalSections && setShowPractical(true)}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                completedSections === totalSections ? "bg-orange-500 text-white" : "bg-muted"
              )}>
                <Award className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Practical Task</p>
                <p className="text-xs text-muted-foreground">{course.practicalTask.title}</p>
              </div>
              {completedSections < totalSections && (
                <Badge variant="outline" className="text-xs">
                  Complete all sections first
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Learning Stats */}
        {user && (
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{completedSections}</p>
                  <p className="text-xs text-muted-foreground">Sections Done</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{formatTime(timeSpent)}</p>
                  <p className="text-xs text-muted-foreground">Time Today</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{Math.round(overallProgress)}%</p>
                  <p className="text-xs text-muted-foreground">Complete</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
