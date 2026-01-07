import { useState, useEffect, useRef } from 'react';
import { Search, TrendingUp, Clock, Sparkles, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUnifiedSearch } from '@/hooks/useUnifiedSearch';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const categoryIcons: Record<string, React.ElementType> = {
  user: () => <span>👤</span>,
  job: () => <span>💼</span>,
  gig: () => <span>📦</span>,
  post: () => <span>📝</span>,
  hashtag: () => <span>#️⃣</span>,
  location: () => <span>📍</span>,
  course: () => <span>📚</span>,
  campaign: () => <span>❤️</span>,
  product: () => <span>🛒</span>,
  emergency: () => <span>🚨</span>,
  class: () => <span>🎥</span>,
  expert: () => <span>⭐</span>,
  business: () => <span>🏢</span>,
};

const TRENDING_SEARCHES = [
  'Web Design',
  'Content Writing',
  'Logo Design',
  'Video Editing',
  'Social Media',
  'Virtual Assistant',
];

const POPULAR_CATEGORIES = [
  { label: 'Graphic Design', icon: '🎨' },
  { label: 'Digital Marketing', icon: '📱' },
  { label: 'Writing', icon: '✍️' },
  { label: 'Video & Animation', icon: '🎬' },
  { label: 'Programming', icon: '💻' },
  { label: 'Music & Audio', icon: '🎵' },
];

export const EnhancedSearchBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const { searchQuery, setSearchQuery, results, isLoading } = useUnifiedSearch();
  const { history, addSearch, clearHistory } = useSearchHistory();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = (url: string, title: string, type?: string) => {
    addSearch(searchQuery || title, type);
    navigate(url);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleSearchSubmit = (query: string) => {
    if (query.trim()) {
      addSearch(query);
      navigate(`/search?q=${encodeURIComponent(query)}`);
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  const handleTrendingClick = (term: string) => {
    setSearchQuery(term);
    addSearch(term);
    navigate(`/search?q=${encodeURIComponent(term)}`);
    setIsOpen(false);
  };

  const handleCategoryClick = (category: string) => {
    addSearch(category, category);
    navigate(`/jobs?category=${encodeURIComponent(category)}`);
    setIsOpen(false);
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = [];
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, typeof results>);

  const showSuggestions = isFocused && searchQuery.length < 2;
  const showResults = isOpen && searchQuery.length >= 2;

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search services, experts, jobs..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsFocused(true);
            setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearchSubmit(searchQuery);
            }
          }}
          className="pl-10 pr-4 rounded-full bg-muted/50 border-border focus:bg-background h-11"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={() => setSearchQuery('')}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Suggestions Panel (when no query) */}
      {showSuggestions && (
        <Card className="absolute top-full mt-2 w-full max-h-[70vh] overflow-y-auto z-50 shadow-lg rounded-xl border border-border p-4">
          {/* Recent Searches */}
          {history.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  RECENT SEARCHES
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] text-muted-foreground hover:text-destructive"
                  onClick={clearHistory}
                >
                  Clear
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {history.slice(0, 5).map((item, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => handleTrendingClick(item.query)}
                  >
                    {item.query}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Trending Searches */}
          <div className="mb-4">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
              <TrendingUp className="h-3 w-3" />
              TRENDING NOW
            </span>
            <div className="flex flex-wrap gap-2">
              {TRENDING_SEARCHES.map((term) => (
                <Badge
                  key={term}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => handleTrendingClick(term)}
                >
                  {term}
                </Badge>
              ))}
            </div>
          </div>

          {/* Popular Categories */}
          <div>
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
              <Sparkles className="h-3 w-3" />
              BROWSE CATEGORIES
            </span>
            <div className="grid grid-cols-2 gap-2">
              {POPULAR_CATEGORIES.map((cat) => (
                <button
                  key={cat.label}
                  onClick={() => handleCategoryClick(cat.label)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors text-left"
                >
                  <span className="text-lg">{cat.icon}</span>
                  <span className="text-sm font-medium">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Search Results */}
      {showResults && (
        <Card className="absolute top-full mt-2 w-full max-h-[70vh] overflow-y-auto z-50 shadow-lg rounded-xl border border-border">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center">
              <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
              <p className="text-xs text-muted-foreground mt-1">Try searching for services, experts, or jobs</p>
              <div className="mt-4">
                <p className="text-xs text-muted-foreground mb-2">Popular searches:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {TRENDING_SEARCHES.slice(0, 3).map((term) => (
                    <Badge
                      key={term}
                      variant="outline"
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => handleTrendingClick(term)}
                    >
                      {term}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {Object.entries(groupedResults).map(([type, items]) => {
                const IconComponent = categoryIcons[type] || (() => <span>📄</span>);
                return (
                  <div key={type} className="p-2">
                    <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5 uppercase tracking-wide flex items-center gap-1">
                      <IconComponent />
                      {type === 'gig' ? 'Services' : type.charAt(0).toUpperCase() + type.slice(1)}s
                    </div>
                    {items.slice(0, 4).map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result.url, result.title, result.type)}
                        className="w-full text-left p-3 hover:bg-accent rounded-lg transition-colors flex items-start gap-3"
                      >
                        {result.image ? (
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarImage src={result.image} alt={result.title} />
                            <AvatarFallback className="bg-primary/10">
                              <IconComponent />
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <IconComponent />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-foreground truncate flex items-center gap-1.5">
                            {result.title}
                            {result.is_premium && (
                              <Badge className="bg-amber-500/10 text-amber-600 text-[9px] px-1 py-0">PRO</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{result.subtitle}</div>
                          {/* Show basic info preview */}
                          {result.description && (
                            <div className="text-[10px] text-muted-foreground/70 truncate mt-0.5">
                              {result.description.substring(0, 60)}...
                            </div>
                          )}
                          {/* Show metadata for specific types */}
                          {result.metadata?.price && (
                            <div className="text-[10px] font-medium text-primary mt-0.5">
                              ₦{result.metadata.price.toLocaleString()}
                            </div>
                          )}
                          {result.metadata?.rating && (
                            <div className="text-[10px] text-amber-500 flex items-center gap-0.5 mt-0.5">
                              ⭐ {result.metadata.rating.toFixed(1)}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })}
              {/* View All Results Link */}
              <div className="p-2">
                <button
                  onClick={() => handleSearchSubmit(searchQuery)}
                  className="w-full text-center p-3 text-primary hover:bg-accent rounded-lg transition-colors text-sm font-medium"
                >
                  View all results for "{searchQuery}" →
                </button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
