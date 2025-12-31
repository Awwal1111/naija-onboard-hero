import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface AssessmentResult {
  recommendedPath: string;
  skills: string[];
  resources: string[];
  explanation: string;
}

const questions = [
  {
    id: 1,
    question: "What's your current experience level with digital skills?",
    options: [
      { value: 'none', label: "I'm completely new to this" },
      { value: 'basic', label: "I know the basics but want to improve" },
      { value: 'intermediate', label: "I have some experience and want to specialize" },
      { value: 'advanced', label: "I'm skilled but want to expand my services" }
    ]
  },
  {
    id: 2,
    question: "What type of work interests you most?",
    options: [
      { value: 'creative', label: "Creative work (design, videos, content)" },
      { value: 'technical', label: "Technical work (coding, websites, apps)" },
      { value: 'marketing', label: "Marketing & business growth" },
      { value: 'support', label: "Administrative & support services" }
    ]
  },
  {
    id: 3,
    question: "How much time can you dedicate to learning weekly?",
    options: [
      { value: '5', label: "1-5 hours per week" },
      { value: '10', label: "5-10 hours per week" },
      { value: '20', label: "10-20 hours per week" },
      { value: '30', label: "More than 20 hours per week" }
    ]
  },
  {
    id: 4,
    question: "What's your primary goal?",
    options: [
      { value: 'side-income', label: "Earn extra income on the side" },
      { value: 'full-time', label: "Build a full-time freelance career" },
      { value: 'business', label: "Improve skills for my business" },
      { value: 'job', label: "Get a better job" }
    ]
  },
  {
    id: 5,
    question: "Which tools do you already have access to?",
    options: [
      { value: 'phone', label: "Just my smartphone" },
      { value: 'laptop', label: "Laptop/computer with internet" },
      { value: 'software', label: "Computer with design/editing software" },
      { value: 'full', label: "Full professional setup" }
    ]
  }
];

interface Props {
  onComplete: (result: AssessmentResult) => void;
}

export const SkillAssessmentQuiz = ({ onComplete }: Props) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const handleAnswer = (value: string) => {
    setAnswers(prev => ({ ...prev, [questions[currentQuestion].id]: value }));
  };

  const handleNext = async () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      // Submit to AI for analysis
      await generateLearningPath();
    }
  };

  const generateLearningPath = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('learn-assessment', {
        body: { answers }
      });

      if (error) throw error;

      onComplete(data);
    } catch (error) {
      console.error('Assessment error:', error);
      // Fallback to static recommendation
      const fallbackResult = generateFallbackRecommendation();
      onComplete(fallbackResult);
      toast({
        title: "Using smart recommendations",
        description: "We've generated a learning path based on your answers.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateFallbackRecommendation = (): AssessmentResult => {
    const workType = answers[2];
    const experience = answers[1];
    
    const pathMap: Record<string, { path: string; skills: string[]; resources: string[] }> = {
      'creative': {
        path: 'graphic-design',
        skills: ['Canva', 'UI/UX Design', 'Video Editing'],
        resources: ['Canva Design Masterclass', 'Figma UI/UX Design Tutorial', 'CapCut Video Editing']
      },
      'technical': {
        path: 'web-development',
        skills: ['HTML/CSS', 'JavaScript', 'React'],
        resources: ['HTML & CSS Full Course', 'JavaScript Full Course', 'React JS Full Course']
      },
      'marketing': {
        path: 'digital-marketing',
        skills: ['Social Media Marketing', 'SEO', 'Content Marketing'],
        resources: ['Social Media Marketing Full Course', 'SEO Full Course', 'Google Ads Tutorial']
      },
      'support': {
        path: 'virtual-assistant',
        skills: ['Admin Tasks', 'Project Management', 'Excel'],
        resources: ['Virtual Assistant Complete Guide', 'Project Management Fundamentals', 'Excel Full Course']
      }
    };

    const selected = pathMap[workType] || pathMap['technical'];
    
    return {
      recommendedPath: selected.path,
      skills: selected.skills,
      resources: selected.resources,
      explanation: `Based on your interest in ${workType === 'creative' ? 'creative work' : workType === 'technical' ? 'technical work' : workType === 'marketing' ? 'marketing' : 'support services'} and ${experience === 'none' ? 'being new to digital skills' : 'your current experience'}, we recommend starting with ${selected.skills[0]}.`
    };
  };

  const currentQ = questions[currentQuestion];
  const selectedAnswer = answers[currentQ.id];

  if (isLoading) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="py-16 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Analyzing Your Answers...</h3>
          <p className="text-muted-foreground">
            Our AI is creating your personalized learning path
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-primary">AI Skill Assessment</span>
        </div>
        <Progress value={progress} className="h-2 mb-4" />
        <p className="text-sm text-muted-foreground">
          Question {currentQuestion + 1} of {questions.length}
        </p>
        <CardTitle className="text-xl">{currentQ.question}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {currentQ.options.map((option) => (
          <button
            key={option.value}
            onClick={() => handleAnswer(option.value)}
            className={`w-full p-4 rounded-lg border text-left transition-all ${
              selectedAnswer === option.value
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedAnswer === option.value ? 'border-primary bg-primary' : 'border-muted-foreground'
              }`}>
                {selectedAnswer === option.value && (
                  <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                )}
              </div>
              <span className="font-medium">{option.label}</span>
            </div>
          </button>
        ))}
        
        <Button 
          onClick={handleNext} 
          disabled={!selectedAnswer}
          className="w-full mt-6"
        >
          {currentQuestion === questions.length - 1 ? (
            <>
              Get My Learning Path
              <Sparkles className="h-4 w-4 ml-2" />
            </>
          ) : (
            <>
              Next Question
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
