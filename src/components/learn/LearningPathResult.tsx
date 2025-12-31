import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  BookOpen, 
  Target, 
  ArrowRight, 
  ExternalLink,
  RotateCcw,
  GraduationCap
} from 'lucide-react';
import { curatedResources, skillCategories } from '@/lib/curatedResources';
import { useNavigate } from 'react-router-dom';

interface AssessmentResult {
  recommendedPath: string;
  skills: string[];
  resources: string[];
  explanation: string;
}

interface Props {
  result: AssessmentResult;
  onRetake: () => void;
}

export const LearningPathResult = ({ result, onRetake }: Props) => {
  const navigate = useNavigate();
  
  const category = skillCategories.find(c => c.id === result.recommendedPath);
  const recommendedResources = curatedResources.filter(
    r => r.category === result.recommendedPath
  ).slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Main Result Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">Your Personalized Path</span>
          </div>
          <CardTitle className="text-2xl flex items-center gap-3">
            <span className="text-4xl">{category?.icon}</span>
            {category?.name || 'Custom Learning Path'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{result.explanation}</p>
          
          <div className="flex flex-wrap gap-2">
            {result.skills.map((skill, index) => (
              <Badge key={index} variant="secondary" className="px-3 py-1">
                <Target className="h-3 w-3 mr-1" />
                {skill}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommended Courses */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          Start Learning (Free Courses)
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          {recommendedResources.map((resource) => (
            <Card key={resource.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm line-clamp-2 mb-1">
                      {resource.title}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {resource.description}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {resource.platform}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {resource.duration}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          resource.level === 'Beginner' 
                            ? 'text-green-600 border-green-200' 
                            : resource.level === 'Intermediate'
                            ? 'text-yellow-600 border-yellow-200'
                            : 'text-red-600 border-red-200'
                        }`}
                      >
                        {resource.level}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => window.open(resource.url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          variant="outline" 
          onClick={onRetake}
          className="flex-1"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Retake Assessment
        </Button>
        <Button 
          onClick={() => navigate('/expert-application')}
          className="flex-1"
        >
          <GraduationCap className="h-4 w-4 mr-2" />
          Become an Expert
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};
