import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Sparkles, Briefcase, Users, Wallet, MessageCircle, 
  Award, CheckCircle, ArrowRight, X, Bot, Target, Shield,
  PlusCircle, Search, BarChart3
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { detectMiniPaySync } from '@/lib/minipay';
import { useUserMode } from '@/hooks/useUserMode';

// SYNC detection at module load
const isMiniPayEnv = detectMiniPaySync().isMiniPay;

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: string;
  path?: string;
}

// Role-specific onboarding steps
const freelancerSteps: OnboardingStep[] = [
  {
    title: "Welcome Freelancer! 🎉",
    description: "Let's set you up to find great opportunities and grow your career.",
    icon: <Sparkles className="h-12 w-12 text-primary" />
  },
  {
    title: "Find Jobs & Gigs",
    description: "Browse thousands of job opportunities posted by clients looking for your skills.",
    icon: <Briefcase className="h-12 w-12 text-blue-500" />,
    action: "Browse Jobs",
    path: "/jobs"
  },
  {
    title: "Create Your Gigs",
    description: "Showcase your services with professional gig listings that attract clients.",
    icon: <PlusCircle className="h-12 w-12 text-emerald-500" />,
    action: "Create Gig",
    path: "/my-gigs"
  },
  {
    title: "Your Wallet & Earnings",
    description: "Track earnings, withdraw funds, and manage your finances securely.",
    icon: <Wallet className="h-12 w-12 text-amber-500" />,
    action: "View Wallet",
    path: "/earn"
  },
  {
    title: "Get Verified",
    description: "Earn trust badges by verifying your skills and identity to stand out.",
    icon: <Award className="h-12 w-12 text-purple-500" />,
    action: "Start Verification",
    path: "/expert-verification"
  },
  {
    title: "You're Ready! 🚀",
    description: "Complete your profile to get discovered by clients worldwide.",
    icon: <CheckCircle className="h-12 w-12 text-green-500" />,
    action: "Complete Profile",
    path: "/profile"
  }
];

const clientSteps: OnboardingStep[] = [
  {
    title: "Welcome Client! 🎉",
    description: "Let's help you find the perfect talent for your projects.",
    icon: <Sparkles className="h-12 w-12 text-primary" />
  },
  {
    title: "Find Expert Talent",
    description: "Browse verified professionals across hundreds of skill categories.",
    icon: <Users className="h-12 w-12 text-blue-500" />,
    action: "Find Experts",
    path: "/experts"
  },
  {
    title: "Post a Job",
    description: "Describe your project and receive proposals from qualified freelancers.",
    icon: <Briefcase className="h-12 w-12 text-emerald-500" />,
    action: "Post Job",
    path: "/post-job"
  },
  {
    title: "AI Hiring Assistant",
    description: "Let our AI match you with the perfect freelancer for your needs.",
    icon: <Bot className="h-12 w-12 text-purple-500" />,
    action: "Try AI Hire",
    path: "/ai-hire"
  },
  {
    title: "Your Hiring Hub",
    description: "Track spending, manage projects, and review applications in one place.",
    icon: <Target className="h-12 w-12 text-amber-500" />,
    action: "View Hub",
    path: "/client-dashboard"
  },
  {
    title: "Secure Payments",
    description: "SafePay escrow protects your money until work is delivered.",
    icon: <Shield className="h-12 w-12 text-green-500" />,
    action: "Get Started",
    path: "/profile"
  }
];

const bothSteps: OnboardingStep[] = [
  {
    title: "Welcome to NaijaLancers! 🎉",
    description: "Nigeria's premier platform for freelancers and businesses. Let's show you around!",
    icon: <Sparkles className="h-12 w-12 text-primary" />
  },
  {
    title: "Find Jobs & Experts",
    description: "Browse jobs as a freelancer or find talent as a client - you can do both!",
    icon: <Briefcase className="h-12 w-12 text-blue-500" />,
    action: "Explore",
    path: "/jobs"
  },
  {
    title: "Create & Hire",
    description: "Offer your services through gigs or post jobs to hire others.",
    icon: <Users className="h-12 w-12 text-emerald-500" />,
    action: "Get Started",
    path: "/my-gigs"
  },
  {
    title: "Your Wallet",
    description: "Deposit, withdraw, and transfer funds securely. All transactions are protected.",
    icon: <Wallet className="h-12 w-12 text-amber-500" />,
    action: "View Wallet",
    path: "/earn"
  },
  {
    title: "Chat & Connect",
    description: "Message users, join groups, and get help from our AI assistant!",
    icon: <MessageCircle className="h-12 w-12 text-purple-500" />,
    action: "Start Chatting",
    path: "/chat"
  },
  {
    title: "You're All Set! 🚀",
    description: "Complete your profile to get discovered and start your journey.",
    icon: <CheckCircle className="h-12 w-12 text-green-500" />,
    action: "Complete Profile",
    path: "/profile"
  }
];

export const OnboardingTour = () => {
  // CRITICAL: Disable in MiniPay to prevent re-renders
  if (isMiniPayEnv) {
    return null;
  }

  return <OnboardingTourInternal />;
};

const OnboardingTourInternal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { mode } = useUserMode();

  // Get role-specific steps
  const steps = useMemo(() => {
    switch (mode) {
      case 'freelancer':
        return freelancerSteps;
      case 'client':
        return clientSteps;
      default:
        return bothSteps;
    }
  }, [mode]);

  useEffect(() => {
    // Check if user has completed onboarding
    if (user) {
      const hasCompletedOnboarding = localStorage.getItem(`onboarding_${user.id}`);
      if (!hasCompletedOnboarding) {
        // Show onboarding after a short delay
        const timer = setTimeout(() => setIsOpen(true), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    if (user) {
      localStorage.setItem(`onboarding_${user.id}`, 'true');
    }
    setIsOpen(false);
  };

  const handleAction = () => {
    const step = steps[currentStep];
    if (step.path) {
      handleComplete();
      navigate(step.path);
    } else {
      handleNext();
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;
  const step = steps[currentStep];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <button 
          onClick={handleSkip}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="text-center space-y-6 py-4">
          {/* Progress */}
          <div className="space-y-2">
            <Progress value={progress} className="h-1" />
            <p className="text-xs text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </p>
          </div>

          {/* Icon */}
          <div className="flex justify-center">
            <div className="p-4 bg-muted rounded-full">
              {step.icon}
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <h2 className="text-xl font-bold">{step.title}</h2>
            <p className="text-muted-foreground">{step.description}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button 
                variant="outline" 
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex-1"
              >
                Back
              </Button>
            )}
            {currentStep === 0 && (
              <Button 
                variant="outline" 
                onClick={handleSkip}
                className="flex-1"
              >
                Skip Tour
              </Button>
            )}
            <Button 
              onClick={handleAction}
              className="flex-1"
            >
              {step.action || (currentStep === steps.length - 1 ? "Get Started" : "Next")}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {/* Step indicators */}
          <div className="flex justify-center gap-1">
            {steps.map((_, index) => (
              <div 
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingTour;
