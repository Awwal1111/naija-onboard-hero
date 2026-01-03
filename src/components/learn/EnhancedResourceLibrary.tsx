import { useState, useMemo } from 'react';
import { Search, Filter, SlidersHorizontal, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { learningCourses, learningCategories, LearningCourse } from '@/lib/learningCourses';
import { LearningCourseCard } from './LearningCourseCard';
import { useLearningProgress } from '@/hooks/useLearningProgress';
import { cn } from '@/lib/utils';

export function EnhancedResourceLibrary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('popular');
  const { learningStats } = useLearningProgress();

  const filteredCourses = useMemo(() => {
    let courses = [...learningCourses];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      courses = courses.filter(c => 
        c.title.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        c.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      courses = courses.filter(c => c.category === selectedCategory);
    }

    // Filter by level
    if (selectedLevel !== 'all') {
      courses = courses.filter(c => c.level === selectedLevel);
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        // Assume order in array is newest first
        break;
      case 'duration':
        courses.sort((a, b) => a.durationMinutes - b.durationMinutes);
        break;
      case 'popular':
      default:
        // Featured courses first
        courses.sort((a, b) => {
          const aFeatured = ['chatgpt-mastery-beginner', 'lovable-basics', 'html-css-beginner'].includes(a.id);
          const bFeatured = ['chatgpt-mastery-beginner', 'lovable-basics', 'html-css-beginner'].includes(b.id);
          return (bFeatured ? 1 : 0) - (aFeatured ? 1 : 0);
        });
    }

    return courses;
  }, [searchQuery, selectedCategory, selectedLevel, sortBy]);

  const coursesByLevel = {
    beginner: filteredCourses.filter(c => c.level === 'Beginner'),
    intermediate: filteredCourses.filter(c => c.level === 'Intermediate'),
    advanced: filteredCourses.filter(c => c.level === 'Advanced'),
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses, skills, topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filter Courses</SheetTitle>
            </SheetHeader>
            <div className="space-y-6 mt-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {learningCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Level</label>
                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Sort By</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="duration">Shortest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedLevel('all');
                  setSortBy('popular');
                }}
              >
                Reset Filters
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        <Badge
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          className="cursor-pointer shrink-0"
          onClick={() => setSelectedCategory('all')}
        >
          All
        </Badge>
        {learningCategories.slice(0, 6).map(cat => (
          <Badge
            key={cat.id}
            variant={selectedCategory === cat.id ? 'default' : 'outline'}
            className="cursor-pointer shrink-0 gap-1"
            onClick={() => setSelectedCategory(cat.id)}
          >
            <span>{cat.icon}</span>
            <span className="hidden sm:inline">{cat.name}</span>
          </Badge>
        ))}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredCourses.length} courses found
        </p>
        {selectedCategory !== 'all' && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setSelectedCategory('all')}
          >
            Clear filter
          </Button>
        )}
      </div>

      {/* Courses by Level */}
      {selectedLevel === 'all' ? (
        <div className="space-y-6">
          {/* Beginner */}
          {coursesByLevel.beginner.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                  Beginner
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {coursesByLevel.beginner.length} courses
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {coursesByLevel.beginner.map(course => (
                  <LearningCourseCard key={course.id} course={course} />
                ))}
              </div>
            </div>
          )}

          {/* Intermediate */}
          {coursesByLevel.intermediate.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                  Intermediate
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {coursesByLevel.intermediate.length} courses
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {coursesByLevel.intermediate.map(course => (
                  <LearningCourseCard key={course.id} course={course} />
                ))}
              </div>
            </div>
          )}

          {/* Advanced */}
          {coursesByLevel.advanced.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-red-500/10 text-red-600 border-red-500/30">
                  Advanced
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {coursesByLevel.advanced.length} courses
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {coursesByLevel.advanced.map(course => (
                  <LearningCourseCard key={course.id} course={course} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredCourses.map(course => (
            <LearningCourseCard key={course.id} course={course} />
          ))}
        </div>
      )}

      {filteredCourses.length === 0 && (
        <div className="text-center py-12">
          <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold mb-2">No courses found</h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your filters or search query
          </p>
        </div>
      )}
    </div>
  );
}
