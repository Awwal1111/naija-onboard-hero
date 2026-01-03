import { useNavigate } from 'react-router-dom';
import { Clock, Play, Award, CheckCircle, Lock } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { LearningCourse } from '@/lib/learningCourses';
import { cn } from '@/lib/utils';

interface LearningCourseCardProps {
  course: LearningCourse;
  progress?: number;
  isEnrolled?: boolean;
  certificateEarned?: boolean;
}

export function LearningCourseCard({ 
  course, 
  progress = 0, 
  isEnrolled = false,
  certificateEarned = false 
}: LearningCourseCardProps) {
  const navigate = useNavigate();

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Beginner': return 'bg-green-500/10 text-green-600 border-green-500/30';
      case 'Intermediate': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30';
      case 'Advanced': return 'bg-red-500/10 text-red-600 border-red-500/30';
      default: return '';
    }
  };

  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all hover:shadow-lg cursor-pointer group",
        certificateEarned && "border-green-500/50"
      )}
      onClick={() => navigate(`/learn/course/${course.id}`)}
    >
      {/* Thumbnail */}
      <div className="relative h-32 bg-muted overflow-hidden">
        <img
          src={course.thumbnail}
          alt={course.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=200&fit=crop';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center">
            <Play className="h-5 w-5 text-primary-foreground ml-1" />
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          <Badge className={cn("text-xs", getLevelColor(course.level))}>
            {course.level}
          </Badge>
          {course.isFree && (
            <Badge variant="secondary" className="text-xs bg-primary text-primary-foreground">
              FREE
            </Badge>
          )}
        </div>

        {/* Certificate badge */}
        {certificateEarned && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-green-500 text-white gap-1">
              <Award className="h-3 w-3" />
              Certified
            </Badge>
          </div>
        )}

        {/* Duration */}
        <div className="absolute bottom-2 right-2">
          <Badge variant="secondary" className="text-xs bg-black/60 text-white border-0 gap-1">
            <Clock className="h-3 w-3" />
            {course.duration}
          </Badge>
        </div>
      </div>

      <CardContent className="p-3">
        <h3 className="font-semibold text-sm line-clamp-2 mb-1">{course.title}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {course.description}
        </p>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{course.instructor}</span>
          <span>{course.sections.length} sections</span>
        </div>
      </CardContent>

      {/* Progress bar for enrolled courses */}
      {isEnrolled && (
        <CardFooter className="p-3 pt-0">
          <div className="w-full">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
            {progress === 100 && !certificateEarned && (
              <p className="text-xs text-primary mt-1">Complete practical task for certificate!</p>
            )}
          </div>
        </CardFooter>
      )}

      {/* Start learning button for new courses */}
      {!isEnrolled && (
        <CardFooter className="p-3 pt-0">
          <Button size="sm" className="w-full gap-1">
            <Play className="h-3 w-3" />
            Start Learning
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
