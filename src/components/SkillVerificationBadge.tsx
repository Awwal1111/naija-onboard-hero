import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Award, Play, Loader2, Trophy, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface SkillVerificationBadgeProps {
  skill: string;
  isVerified?: boolean;
  score?: number;
  isOwner?: boolean;
  onVerified?: () => void;
}

interface Question {
  question: string;
  options: string[];
  correct: number;
}

export function SkillVerificationBadge({ 
  skill, 
  isVerified = false, 
  score = 0,
  isOwner = false,
  onVerified 
}: SkillVerificationBadgeProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [testComplete, setTestComplete] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  const startAssessment = async () => {
    if (!user) return;
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('skill-assessment', {
        body: { skill, userId: user.id }
      });

      if (error) throw error;
      
      setQuestions(data.questions);
      setCurrentQuestion(0);
      setAnswers([]);
      setTestComplete(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start assessment",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (answerIndex: number) => {
    const newAnswers = [...answers, answerIndex];
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Calculate score
      const correctAnswers = questions.reduce((count, q, idx) => {
        return count + (q.correct === newAnswers[idx] ? 1 : 0);
      }, 0);
      const percentage = Math.round((correctAnswers / questions.length) * 100);
      setFinalScore(percentage);
      setTestComplete(true);
      
      // Save result if passed (70%+)
      if (percentage >= 70) {
        saveVerification(percentage);
      }
    }
  };

  const saveVerification = async (percentage: number) => {
    if (!user) return;
    
    try {
      // Use raw insert since table may not be in generated types yet
      const { error } = await (supabase as any)
        .from('skill_verifications')
        .upsert({
          user_id: user.id,
          skill_name: skill,
          score: percentage,
          verified_at: new Date().toISOString(),
          is_verified: true
        }, {
          onConflict: 'user_id,skill_name'
        });

      if (error) throw error;
      
      toast({
        title: "Skill Verified! 🎉",
        description: `You scored ${percentage}% on ${skill}`
      });
      
      onVerified?.();
    } catch (error: any) {
      console.error('Error saving verification:', error);
    }
  };

  const getScoreBadgeVariant = () => {
    if (score >= 90) return 'default';
    if (score >= 80) return 'secondary';
    return 'outline';
  };

  const getScoreIcon = () => {
    if (score >= 90) return <Trophy className="h-3 w-3" />;
    if (score >= 80) return <Star className="h-3 w-3" />;
    return <CheckCircle className="h-3 w-3" />;
  };

  if (isVerified) {
    return (
      <Badge variant={getScoreBadgeVariant()} className="gap-1">
        {getScoreIcon()}
        {skill}
        <span className="text-[10px] opacity-75">({score}%)</span>
      </Badge>
    );
  }

  if (!isOwner) {
    return (
      <Badge variant="outline" className="gap-1 opacity-60">
        {skill}
      </Badge>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Badge 
          variant="outline" 
          className="gap-1 cursor-pointer hover:bg-primary/10 transition-colors"
          onClick={() => {
            setIsOpen(true);
            if (questions.length === 0) startAssessment();
          }}
        >
          <Award className="h-3 w-3" />
          {skill}
          <span className="text-[10px] text-primary">Verify</span>
        </Badge>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            {skill} Assessment
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">Generating assessment questions...</p>
          </div>
        ) : testComplete ? (
          <div className="py-8 text-center space-y-4">
            {finalScore >= 70 ? (
              <>
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Trophy className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-green-600">Congratulations!</h3>
                <p className="text-muted-foreground">
                  You scored <strong>{finalScore}%</strong> and earned the {skill} badge!
                </p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                  <Award className="h-10 w-10 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold text-orange-600">Keep Practicing!</h3>
                <p className="text-muted-foreground">
                  You scored <strong>{finalScore}%</strong>. You need 70% to earn the badge.
                </p>
              </>
            )}
            <Button 
              onClick={() => {
                setIsOpen(false);
                setQuestions([]);
              }}
              className="mt-4"
            >
              {finalScore >= 70 ? 'Done' : 'Try Again Later'}
            </Button>
          </div>
        ) : questions.length > 0 ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Question {currentQuestion + 1} of {questions.length}</span>
                <span>{Math.round(((currentQuestion) / questions.length) * 100)}%</span>
              </div>
              <Progress value={(currentQuestion / questions.length) * 100} />
            </div>

            <div className="space-y-4">
              <p className="font-medium">{questions[currentQuestion].question}</p>
              
              <div className="space-y-2">
                {questions[currentQuestion].options.map((option, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-3 px-4"
                    onClick={() => handleAnswer(idx)}
                  >
                    <span className="mr-2 font-bold text-primary">{String.fromCharCode(65 + idx)}.</span>
                    {option}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center space-y-4">
            <Award className="h-12 w-12 text-primary mx-auto" />
            <p className="text-muted-foreground">
              Take a quick 5-question assessment to verify your {skill} skills and earn a badge!
            </p>
            <Button onClick={startAssessment} className="gap-2">
              <Play className="h-4 w-4" />
              Start Assessment
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
