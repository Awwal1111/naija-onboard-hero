import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CourseSection, QuizQuestion } from '@/lib/learningCourses';
import { useLearningProgress } from '@/hooks/useLearningProgress';
import { cn } from '@/lib/utils';

interface SectionQuizProps {
  courseId: string;
  section: CourseSection;
  onComplete: (passed: boolean) => void;
  onBack: () => void;
}

export function SectionQuiz({ courseId, section, onComplete, onBack }: SectionQuizProps) {
  const { submitQuizAttempt } = useLearningProgress(courseId);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [timeLeft, setTimeLeft] = useState(section.quizQuestions.length * 60); // 1 min per question
  const [shuffledQuestions, setShuffledQuestions] = useState<QuizQuestion[]>([]);

  useEffect(() => {
    // Shuffle questions on mount
    const shuffled = [...section.quizQuestions].sort(() => Math.random() - 0.5);
    setShuffledQuestions(shuffled);
  }, [section.quizQuestions]);

  useEffect(() => {
    if (showResults || timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showResults, timeLeft]);

  const currentQuestion = shuffledQuestions[currentQuestionIndex];
  const totalQuestions = shuffledQuestions.length;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (optionText: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: optionText
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    // Calculate score
    let correctCount = 0;
    shuffledQuestions.forEach(q => {
      const userAnswer = answers[q.id];
      const correctOption = q.options.find(o => o.isCorrect);
      if (userAnswer === correctOption?.text) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = score >= 60;

    // Submit to database
    submitQuizAttempt.mutate({
      quizId: section.id,
      sectionId: section.id,
      answers,
      score,
      passed,
    });

    setShowResults(true);
  };

  if (showResults) {
    let correctCount = 0;
    shuffledQuestions.forEach(q => {
      const userAnswer = answers[q.id];
      const correctOption = q.options.find(o => o.isCorrect);
      if (userAnswer === correctOption?.text) {
        correctCount++;
      }
    });
    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = score >= 60;

    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-bold">Quiz Results</h1>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8">
          <Card className={cn(
            "text-center p-8",
            passed ? "border-green-500/50 bg-green-500/10" : "border-red-500/50 bg-red-500/10"
          )}>
            <div className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4",
              passed ? "bg-green-500" : "bg-red-500"
            )}>
              {passed ? (
                <CheckCircle className="h-10 w-10 text-white" />
              ) : (
                <XCircle className="h-10 w-10 text-white" />
              )}
            </div>
            
            <h2 className="text-2xl font-bold mb-2">
              {passed ? "🎉 Quiz Passed!" : "Quiz Not Passed"}
            </h2>
            
            <p className="text-4xl font-bold mb-2">{score}%</p>
            <p className="text-muted-foreground mb-6">
              {correctCount} out of {totalQuestions} correct
              {!passed && " • You need 60% to pass"}
            </p>

            <div className="space-y-4">
              {shuffledQuestions.map((q, i) => {
                const userAnswer = answers[q.id];
                const correctOption = q.options.find(o => o.isCorrect);
                const isCorrect = userAnswer === correctOption?.text;

                return (
                  <div 
                    key={q.id} 
                    className={cn(
                      "text-left p-4 rounded-lg border",
                      isCorrect ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{q.question}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {isCorrect ? 'Correct!' : `Your answer: ${userAnswer || 'No answer'}`}
                        </p>
                        {!isCorrect && (
                          <p className="text-xs text-green-600 mt-1">
                            Correct answer: {correctOption?.text}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          {q.explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex gap-3 justify-center">
              {passed ? (
                <Button onClick={() => onComplete(true)} size="lg">
                  Continue to Next Section
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={onBack}>
                    Review Content
                  </Button>
                  <Button onClick={() => {
                    setShowResults(false);
                    setCurrentQuestionIndex(0);
                    setAnswers({});
                    setTimeLeft(section.quizQuestions.length * 60);
                    setShuffledQuestions([...section.quizQuestions].sort(() => Math.random() - 0.5));
                  }}>
                    Try Again
                  </Button>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return <div>Loading...</div>;
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
              <h1 className="text-sm font-bold">Section Quiz</h1>
              <p className="text-xs text-muted-foreground">{section.title}</p>
            </div>
          </div>
          <Badge 
            variant={timeLeft < 60 ? "destructive" : "secondary"}
            className="gap-1"
          >
            <Clock className="h-3 w-3" />
            {formatTime(timeLeft)}
          </Badge>
        </div>
        <Progress value={progress} className="mt-2 h-1" />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <Badge variant="outline">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </Badge>
              <Badge variant="secondary">
                {currentQuestion.type === 'true_false' ? 'True/False' : 'Multiple Choice'}
              </Badge>
            </div>
            <CardTitle className="text-lg mt-4">{currentQuestion.question}</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={answers[currentQuestion.id] || ''}
              onValueChange={handleAnswer}
              className="space-y-3"
            >
              {currentQuestion.options.map((option, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors",
                    answers[currentQuestion.id] === option.text 
                      ? "border-primary bg-primary/10" 
                      : "hover:bg-accent"
                  )}
                  onClick={() => handleAnswer(option.text)}
                >
                  <RadioGroupItem value={option.text} id={`option-${i}`} />
                  <Label htmlFor={`option-${i}`} className="flex-1 cursor-pointer">
                    {option.text}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="mt-6 flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                disabled={currentQuestionIndex === 0}
              >
                Previous
              </Button>
              <Button
                onClick={handleNext}
                disabled={!answers[currentQuestion.id]}
              >
                {currentQuestionIndex === totalQuestions - 1 ? 'Submit Quiz' : 'Next'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pass requirement notice */}
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <span>You need 60% to pass and unlock the next section</span>
        </div>
      </div>
    </div>
  );
}
