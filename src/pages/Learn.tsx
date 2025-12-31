import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import ResponsiveLayout from '@/components/ResponsiveLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  GraduationCap, 
  Sparkles, 
  BookOpen, 
  Target,
  TrendingUp,
  Users,
  ArrowRight
} from 'lucide-react';
import { SkillAssessmentQuiz } from '@/components/learn/SkillAssessmentQuiz';
import { LearningPathResult } from '@/components/learn/LearningPathResult';
import { ResourceLibrary } from '@/components/learn/ResourceLibrary';
import { skillCategories } from '@/lib/curatedResources';
import { useNavigate } from 'react-router-dom';

interface AssessmentResult {
  recommendedPath: string;
  skills: string[];
  resources: string[];
  explanation: string;
}

const Learn = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('discover');
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState<AssessmentResult | null>(null);

  const handleQuizComplete = (result: AssessmentResult) => {
    setQuizResult(result);
    setShowQuiz(false);
  };

  const handleRetakeQuiz = () => {
    setQuizResult(null);
    setShowQuiz(true);
  };

  return (
    <>
      <Helmet>
        <title>Learn Hub - Free Skills Training | NaijaLancers</title>
        <meta 
          name="description" 
          content="Master in-demand digital skills with free courses. AI-powered skill assessment, personalized learning paths, and curated resources for Nigerian freelancers." 
        />
        <meta name="keywords" content="free courses, digital skills, freelance training, Nigeria, learn online" />
      </Helmet>
      
      <ResponsiveLayout>
        <div className="space-y-6 pb-20">
          {/* Hero Section */}
          <Card className="bg-gradient-to-br from-primary/10 via-background to-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/20 rounded-xl">
                  <GraduationCap className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold mb-2">Learn Hub</h1>
                  <p className="text-muted-foreground mb-4">
                    Master in-demand skills with free courses. Get personalized recommendations 
                    powered by AI.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <Sparkles className="h-3 w-3" />
                      AI-Powered
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <BookOpen className="h-3 w-3" />
                      100% Free
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Target className="h-3 w-3" />
                      Nigerian Focus
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">25+</p>
              <p className="text-xs text-muted-foreground">Free Courses</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">8</p>
              <p className="text-xs text-muted-foreground">Skill Paths</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">AI</p>
              <p className="text-xs text-muted-foreground">Guided</p>
            </Card>
          </div>

          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="discover" className="text-xs sm:text-sm">
                <BookOpen className="h-4 w-4 mr-1 sm:mr-2" />
                Discover
              </TabsTrigger>
              <TabsTrigger value="assessment" className="text-xs sm:text-sm">
                <Sparkles className="h-4 w-4 mr-1 sm:mr-2" />
                AI Path
              </TabsTrigger>
              <TabsTrigger value="paths" className="text-xs sm:text-sm">
                <Target className="h-4 w-4 mr-1 sm:mr-2" />
                Categories
              </TabsTrigger>
            </TabsList>

            {/* Discover Tab */}
            <TabsContent value="discover" className="mt-4">
              <ResourceLibrary />
            </TabsContent>

            {/* AI Assessment Tab */}
            <TabsContent value="assessment" className="mt-4">
              {quizResult ? (
                <LearningPathResult result={quizResult} onRetake={handleRetakeQuiz} />
              ) : showQuiz ? (
                <SkillAssessmentQuiz onComplete={handleQuizComplete} />
              ) : (
                <Card className="text-center py-12">
                  <CardContent className="space-y-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                      <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold">AI Skill Assessment</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Answer 5 quick questions and our AI will create a personalized 
                      learning path based on your goals and experience.
                    </p>
                    <Button onClick={() => setShowQuiz(true)} size="lg">
                      Start Assessment
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Skill Categories Tab */}
            <TabsContent value="paths" className="mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                {skillCategories.map((category) => (
                  <Card 
                    key={category.id} 
                    className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
                    onClick={() => {
                      setActiveTab('discover');
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <span className="text-3xl">{category.icon}</span>
                        <div className="flex-1">
                          <h3 className="font-semibold">{category.name}</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            {category.description}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {category.subcategories.slice(0, 3).map((sub, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {sub}
                              </Badge>
                            ))}
                            {category.subcategories.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{category.subcategories.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Graduate to Expert CTA */}
          <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary-foreground/20 rounded-xl">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Ready to Earn?</h3>
                  <p className="text-sm opacity-90">
                    Become a verified expert and start getting paid clients.
                  </p>
                </div>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => navigate('/expert-application')}
                >
                  Apply
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ResponsiveLayout>
    </>
  );
};

export default Learn;
