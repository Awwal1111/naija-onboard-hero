import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  ExternalLink, 
  Clock, 
  BookOpen,
  Filter
} from 'lucide-react';
import { 
  curatedResources, 
  skillCategories, 
  getResourcesByCategory,
  searchResources,
  CuratedResource 
} from '@/lib/curatedResources';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const ResourceLibrary = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredResources = (() => {
    let resources = curatedResources;
    
    if (searchQuery) {
      resources = searchResources(searchQuery);
    }
    
    if (selectedCategory !== 'all') {
      resources = resources.filter(r => r.category === selectedCategory);
    }
    
    if (selectedLevel !== 'all') {
      resources = resources.filter(r => r.level === selectedLevel);
    }
    
    return resources;
  })();

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {skillCategories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedLevel} onValueChange={setSelectedLevel}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="Beginner">Beginner</SelectItem>
            <SelectItem value="Intermediate">Intermediate</SelectItem>
            <SelectItem value="Advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('all')}
          className="shrink-0"
        >
          All
        </Button>
        {skillCategories.map((cat) => (
          <Button
            key={cat.id}
            variant={selectedCategory === cat.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(cat.id)}
            className="shrink-0"
          >
            {cat.icon} {cat.name}
          </Button>
        ))}
      </div>

      {/* Results Count */}
      <p className="text-sm text-muted-foreground">
        <BookOpen className="h-4 w-4 inline mr-1" />
        {filteredResources.length} free courses available
      </p>

      {/* Resource Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredResources.map((resource) => (
          <ResourceCard key={resource.id} resource={resource} />
        ))}
      </div>

      {filteredResources.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            No courses found matching your criteria. Try adjusting your filters.
          </p>
        </Card>
      )}
    </div>
  );
};

const ResourceCard = ({ resource }: { resource: CuratedResource }) => {
  const category = skillCategories.find(c => c.id === resource.category);
  
  return (
    <Card className="hover:shadow-md transition-all hover:border-primary/30 group">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <span className="text-2xl">{category?.icon}</span>
            <Badge 
              variant="outline" 
              className={`text-xs ${
                resource.level === 'Beginner' 
                  ? 'text-green-600 border-green-200 bg-green-50 dark:bg-green-950' 
                  : resource.level === 'Intermediate'
                  ? 'text-yellow-600 border-yellow-200 bg-yellow-50 dark:bg-yellow-950'
                  : 'text-red-600 border-red-200 bg-red-50 dark:bg-red-950'
              }`}
            >
              {resource.level}
            </Badge>
          </div>
          
          {/* Content */}
          <div>
            <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
              {resource.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {resource.description}
            </p>
          </div>
          
          {/* Meta */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">
              {resource.platform}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {resource.duration}
            </span>
          </div>
          
          {/* Tags */}
          <div className="flex gap-1 flex-wrap">
            {resource.tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                #{tag}
              </span>
            ))}
          </div>
          
          {/* Action */}
          <Button
            size="sm"
            className="w-full"
            onClick={() => window.open(resource.url, '_blank')}
          >
            Start Learning
            <ExternalLink className="h-3 w-3 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
