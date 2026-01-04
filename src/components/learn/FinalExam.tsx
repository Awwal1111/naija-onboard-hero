import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertTriangle, Trophy, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { LearningCourse, QuizQuestion } from '@/lib/learningCourses';
import { useLearningProgress } from '@/hooks/useLearningProgress';
import { cn } from '@/lib/utils';

interface FinalExamProps {
  course: LearningCourse;
  onComplete: (passed: boolean) => void;
  onBack: () => void;
}

const EXAM_TIME_MINUTES = 30;
const PASS_PERCENTAGE = 70;
const MAX_QUESTIONS = 25;

export function FinalExam({ course, onComplete, onBack }: FinalExamProps) {
  const { submitExamAttempt, getExamAttempts } = useLearningProgress(course.id);
  
  // Compile all quiz questions into exam questions
  const allQuestions = useMemo(() => {
    const questions: (QuizQuestion & { sectionTitle: string })[] = [];
    course.sections.forEach(section => {
      section.quizQuestions.forEach(q => {
        questions.push({ ...q, sectionTitle: section.title });
      });
    });
    // Shuffle and limit
    return questions.sort(() => Math.random() - 0.5).slice(0, MAX_QUESTIONS);
  }, [course]);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(EXAM_TIME_MINUTES * 60);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  // Get attempt count
  const examAttempts = getExamAttempts();
  const attemptCount = examAttempts.length;
  const maxAttempts = 3;
  const canRetry = attemptCount < maxAttempts && isSubmitted && score < PASS_PERCENTAGE;

  // Timer
  useEffect(() => {
    if (isSubmitted) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSubmitted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = () => {
    // Calculate score
    let correct = 0;
    allQuestions.forEach(q => {
      const userAnswer = answers[q.id];
      const correctOption = q.options.find(o => o.isCorrect);
      if (userAnswer === correctOption?.text) {
        correct++;
      }
    });

    const finalScore = Math.round((correct / allQuestions.length) * 100);
    setScore(finalScore);
    setIsSubmitted(true);

    // Submit to backend
    submitExamAttempt.mutate({
      examId: `${course.id}-final-exam`,
      answers,
      score: finalScore,
      passed: finalScore >= PASS_PERCENTAGE,
    });
  };

  const handleRetry = () => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    setTimeRemaining(EXAM_TIME_MINUTES * 60);
    setIsSubmitted(false);
    setScore(0);
  };

  const currentQuestion = allQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / allQuestions.length) * 100;
  const answeredCount = Object.keys(answers).length;

  if (isSubmitted) {
    const passed = score >= PASS_PERCENTAGE;
    
    return (
      <div className="min-h-screen bg-background p-4 pb-20">
        <div className="max-w-2xl mx-auto">
          <Card className={cn(
            "text-center",
            passed ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"
          )}>
            <CardContent className="p-8">
              <div className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6",
                passed ? "bg-green-500/20" : "bg-red-500/20"
              )}>
                {passed ? (
                  <Trophy className="h-10 w-10 text-green-600" />
                ) : (
                  <XCircle className="h-10 w-10 text-red-600" />
                )}
              </div>

              <h2 className={cn(
                "text-2xl font-bold mb-2",
                passed ? "text-green-600" : "text-red-600"
              )}>
                {passed ? '🎉 Congratulations!' : 'Not Quite There Yet'}
              </h2>
              
              <p className="text-muted-foreground mb-6">
                {passed 
                  ? 'You passed the final exam! Complete your practical task to earn your certificate.'
                  : `You scored ${score}%. You need ${PASS_PERCENTAGE}% to pass.`
                }
              </p>

              <div className="flex items-center justify-center gap-8 mb-8">
                <div className="text-center">
                  <p className={cn(
                    "text-4xl font-bold",
                    passed ? "text-green-600" : "text-red-600"
                  )}>{score}%</p>
                  <p className="text-sm text-muted-foreground">Your Score</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-muted-foreground">{PASS_PERCENTAGE}%</p>
                  <p className="text-sm text-muted-foreground">Pass Mark</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8 text-center">
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-lg font-bold text-green-600">
                    {allQuestions.filter(q => {
                      const correctOption = q.options.find(o => o.isCorrect);
                      return answers[q.id] === correctOption?.text;
                    }).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Correct</p>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-lg font-bold text-red-600">
                    {allQuestions.filter(q => {
                      const correctOption = q.options.find(o => o.isCorrect);
                      return answers[q.id] && answers[q.id] !== correctOption?.text;
                    }).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Wrong</p>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <p className="text-lg font-bold text-muted-foreground">
                    {allQuestions.length - answeredCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Skipped</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {passed ? (
                  <Button onClick={() => onComplete(true)} className="gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Continue to Practical Task
                  </Button>
                ) : canRetry ? (
                  <>
                    <Button onClick={handleRetry} variant="outline" className="gap-2">
                      <RotateCcw className="h-4 w-4" />
                      Retry ({maxAttempts - attemptCount - 1} attempts left)
                    </Button>
                    <Button onClick={onBack} variant="ghost">
                      Review Course
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={onBack} variant="outline">
                      Review Course Material
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      No more attempts. Please review the course and try again later.
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-sm font-bold">Final Exam</h1>
              <p className="text-xs text-muted-foreground">{course.title}</p>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              "gap-1 font-mono",
              timeRemaining < 300 && "border-red-500 text-red-500 animate-pulse"
            )}
          >
            <Clock className="h-3 w-3" />
            {formatTime(timeRemaining)}
          </Badge>
        </div>
        <div className="mt-2">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Question {currentQuestionIndex + 1} of {allQuestions.length}</span>
            <span>{answeredCount} answered</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Info Banner */}
        <Card className="mb-4 bg-orange-500/10 border-orange-500/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0" />
              <p className="text-orange-700">
                Pass mark: {PASS_PERCENTAGE}% • {allQuestions.length} questions • {EXAM_TIME_MINUTES} minutes
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Question Card */}
        <Card>
          <CardHeader className="pb-2">
            <Badge variant="outline" className="w-fit text-xs mb-2">
              From: {currentQuestion.sectionTitle}
            </Badge>
            <CardTitle className="text-lg leading-relaxed">
              {currentQuestion.question}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={answers[currentQuestion.id] || ''}
              onValueChange={(value) => handleAnswer(currentQuestion.id, value)}
              className="space-y-3"
            >
              {currentQuestion.options.map((option, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer",
                    answers[currentQuestion.id] === option.text
                      ? "border-primary bg-primary/10"
                      : "hover:bg-accent"
                  )}
                  onClick={() => handleAnswer(currentQuestion.id, option.text)}
                >
                  <RadioGroupItem value={option.text} id={`option-${index}`} />
                  <Label 
                    htmlFor={`option-${index}`} 
                    className="flex-1 cursor-pointer text-sm"
                  >
                    {option.text}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
            disabled={currentQuestionIndex === 0}
            className="flex-1"
          >
            Previous
          </Button>
          
          {currentQuestionIndex < allQuestions.length - 1 ? (
            <Button
              onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
              className="flex-1"
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={answeredCount < allQuestions.length * 0.5}
            >
              Submit Exam
            </Button>
          )}
        </div>

        {/* Question Navigator */}
        <Card className="mt-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Question Navigator</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {allQuestions.map((q, index) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={cn(
                    "w-8 h-8 rounded-md text-xs font-medium transition-all",
                    index === currentQuestionIndex && "ring-2 ring-primary",
                    answers[q.id] 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted hover:bg-accent"
                  )}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}