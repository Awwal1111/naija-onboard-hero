import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalLink, Search, Star, Sparkles } from 'lucide-react';
import { learningTools, toolCategories, getToolsByCategory, searchTools, type ToolCategory } from '@/lib/learningTools';

export function ToolsLibrary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<ToolCategory | 'all'>('all');

  const filteredTools = searchQuery 
    ? searchTools(searchQuery)
    : activeCategory === 'all' 
      ? learningTools 
      : getToolsByCategory(activeCategory);

  const handleOpenTool = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Tools & Resources
        </h2>
        <p className="text-muted-foreground">
          Essential tools for practicing and building your skills
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tools..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category Tabs */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-2 min-w-max px-1">
          <Button
            variant={activeCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory('all')}
            className="whitespace-nowrap"
          >
            🔥 All Tools
          </Button>
          {toolCategories.map((category) => (
            <Button
              key={category.id}
              variant={activeCategory === category.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveCategory(category.id)}
              className="whitespace-nowrap"
            >
              {category.icon} {category.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTools.map((tool) => (
          <Card 
            key={tool.id} 
            className="hover:shadow-md transition-shadow cursor-pointer group"
            onClick={() => handleOpenTool(tool.url)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{tool.icon}</span>
                  <div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {tool.name}
                    </CardTitle>
                    {tool.isPremium && (
                      <Badge variant="secondary" className="mt-1">
                        <Star className="h-3 w-3 mr-1" />
                        Premium
                      </Badge>
                    )}
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-3">
                {tool.description}
              </CardDescription>
              <div className="flex flex-wrap gap-1">
                {tool.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTools.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No tools found matching your search.</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        <Card className="text-center p-4">
          <div className="text-2xl font-bold text-primary">{learningTools.length}</div>
          <div className="text-sm text-muted-foreground">Total Tools</div>
        </Card>
        <Card className="text-center p-4">
          <div className="text-2xl font-bold text-green-500">
            {learningTools.filter(t => !t.isPremium).length}
          </div>
          <div className="text-sm text-muted-foreground">Free Tools</div>
        </Card>
        <Card className="text-center p-4">
          <div className="text-2xl font-bold text-amber-500">
            {learningTools.filter(t => t.isPremium).length}
          </div>
          <div className="text-sm text-muted-foreground">Premium Tools</div>
        </Card>
        <Card className="text-center p-4">
          <div className="text-2xl font-bold text-blue-500">
            {toolCategories.length}
          </div>
          <div className="text-sm text-muted-foreground">Categories</div>
        </Card>
      </div>
    </div>
  );
}
