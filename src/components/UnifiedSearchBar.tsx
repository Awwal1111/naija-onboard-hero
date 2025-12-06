import { useState, useEffect, useRef } from 'react';
import { Search, Users, Briefcase, GraduationCap, Heart, Package, FileText, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useUnifiedSearch } from '@/hooks/useUnifiedSearch';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const categoryIcons = {
  user: User,
  post: FileText,
  expert: Users,
  gig: Package,
  job: Briefcase,
  course: GraduationCap,
  campaign: Heart,
};

const categoryLabels = {
  user: '👤 People',
  post: '📝 Posts',
  expert: '👥 Experts',
  gig: '💼 Gigs',
  job: '📋 Jobs',
  course: '📚 Courses',
  campaign: '❤️ Campaigns',
};

export const UnifiedSearchBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { searchQuery, setSearchQuery, results, isLoading } = useUnifiedSearch();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = (url: string) => {
    navigate(url);
    setIsOpen(false);
    setSearchQuery('');
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = [];
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, typeof results>);

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search experts, gigs, jobs, courses, campaigns..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => searchQuery.length >= 2 && setIsOpen(true)}
          className="pl-10 pr-4"
        />
      </div>

      {isOpen && searchQuery.length >= 2 && (
        <Card className="absolute top-full mt-2 w-full max-h-[70vh] overflow-y-auto z-50 shadow-lg">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No results found for "{searchQuery}"
            </div>
          ) : (
            <div className="divide-y">
              {Object.entries(groupedResults).map(([type, items]) => (
                <div key={type} className="p-2">
                  <div className="text-xs font-semibold text-muted-foreground px-2 py-1">
                    {categoryLabels[type as keyof typeof categoryLabels]}
                  </div>
                  {items.map((result) => {
                    const Icon = categoryIcons[result.type];
                    return (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result.url)}
                        className="w-full text-left p-3 hover:bg-accent rounded-md transition-colors flex items-start gap-3"
                      >
                        {result.image ? (
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarImage src={result.image} alt={result.title} />
                            <AvatarFallback>
                              <Icon className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{result.title}</div>
                          <div className="text-xs text-muted-foreground truncate">{result.subtitle}</div>
                          {result.description && (
                            <div className="text-xs text-muted-foreground line-clamp-1 mt-1">
                              {result.description}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
