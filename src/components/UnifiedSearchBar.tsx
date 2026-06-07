import { useState, useEffect, useRef, useMemo, KeyboardEvent } from 'react';
import { Search, User, FileText, Briefcase, GraduationCap, Heart, Package, Hash, MapPin, ShoppingBag, AlertCircle, Video, Users, Clock, TrendingUp, ArrowRight, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUnifiedSearch } from '@/hooks/useUnifiedSearch';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const categoryIcons = {
  user: User,
  job: Briefcase,
  gig: Package,
  post: FileText,
  hashtag: Hash,
  location: MapPin,
  course: GraduationCap,
  campaign: Heart,
  product: ShoppingBag,
  emergency: AlertCircle,
  class: Video,
  expert: Users,
  business: Briefcase,
};

const categoryLabels = {
  user: '👤 People',
  job: '💼 Jobs',
  gig: '📦 Gigs',
  post: '📝 Posts',
  hashtag: '#️⃣ Hashtags',
  location: '📍 Locations',
  course: '📚 Courses',
  campaign: '❤️ Fundraising',
  product: '🛒 Digital Products',
  emergency: '🚨 Emergency Help',
  class: '🎥 Expert Classes',
  expert: '⭐ Experts',
  business: '🏢 Businesses',
};

const categoryOrder = ['user', 'expert', 'job', 'gig', 'post', 'hashtag', 'course', 'class', 'product', 'campaign', 'location', 'emergency'];

const TRENDING_SEARCHES = ['Graphic designer', 'Logo design', 'Frontend developer', 'Video editor', 'Writer', 'Virtual assistant'];

export const UnifiedSearchBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const { searchQuery, setSearchQuery, results, isLoading } = useUnifiedSearch();
  const { history, addSearch, clearHistory } = useSearchHistory();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build the linear, ordered list of items the keyboard can walk through.
  // First entry (when present) is the synthetic "See all results" action.
  const groupedResults = useMemo(() => {
    return results.reduce((acc, result) => {
      if (!acc[result.type]) acc[result.type] = [];
      acc[result.type].push(result);
      return acc;
    }, {} as Record<string, typeof results>);
  }, [results]);
  const sortedGroups = useMemo(
    () => categoryOrder.filter(cat => groupedResults[cat]),
    [groupedResults],
  );
  const flatResults = useMemo(
    () => sortedGroups.flatMap(g => groupedResults[g]),
    [sortedGroups, groupedResults],
  );

  // Reset focus whenever results / query / open-state change so arrow keys feel predictable
  useEffect(() => {
    setFocusedIndex(-1);
  }, [searchQuery, results.length, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const goToSearchPage = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    addSearch(trimmed);
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    setIsOpen(false);
  };

  const handleResultClick = (url: string) => {
    addSearch(searchQuery);
    navigate(url);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleSuggestionClick = (q: string) => {
    setSearchQuery(q);
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (e.key === 'Enter') {
      // If a specific result is focused, navigate there; otherwise jump to /search
      if (focusedIndex >= 0 && flatResults[focusedIndex]) {
        e.preventDefault();
        handleResultClick(flatResults[focusedIndex].url);
      } else {
        e.preventDefault();
        goToSearchPage(searchQuery);
      }
      return;
    }
    if (flatResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(i => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(i => Math.max(i - 1, -1));
    }
  };

  const showSuggestions = isOpen && searchQuery.length < 2;
  const showResults = isOpen && searchQuery.length >= 2;

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search NaijaLancers..."
          value={searchQuery}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="unified-search-listbox"
          aria-activedescendant={focusedIndex >= 0 ? `usr-${focusedIndex}` : undefined}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-4 rounded-full bg-muted/50 border-border focus:bg-background"
        />
      </div>

      {/* Empty / focused state: recent + trending */}
      {showSuggestions && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-lg rounded-xl border border-border">
          <div className="p-3 space-y-4">
            {history.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Recent
                  </div>
                  <button
                    type="button"
                    onClick={clearHistory}
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {history.slice(0, 6).map((h) => (
                    <button
                      key={h.query + h.timestamp}
                      onClick={() => handleSuggestionClick(h.query)}
                      className="text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-accent transition-colors flex items-center gap-1"
                    >
                      {h.query}
                      <X
                        className="h-3 w-3 text-muted-foreground/60"
                        onClick={(e) => { e.stopPropagation(); /* clearing single item not implemented; clear-all above */ }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Trending
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TRENDING_SEARCHES.map(t => (
                  <button
                    key={t}
                    onClick={() => handleSuggestionClick(t)}
                    className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Result list */}
      {showResults && (
        <Card
          id="unified-search-listbox"
          role="listbox"
          className="absolute top-full mt-2 w-full max-h-[70vh] overflow-y-auto z-50 shadow-lg rounded-xl border border-border"
        >
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center space-y-3">
              <Search className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground text-sm">No results found for "{searchQuery}"</p>
              <p className="text-xs text-muted-foreground">Try a different keyword, or browse trending:</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {TRENDING_SEARCHES.slice(0, 4).map(t => (
                  <button
                    key={t}
                    onClick={() => handleSuggestionClick(t)}
                    className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="divide-y divide-border">
                {(() => {
                  let cursor = 0;
                  return sortedGroups.map((type) => {
                    const items = groupedResults[type];
                    if (!items || items.length === 0) return null;
                    return (
                      <div key={type} className="p-2">
                        <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5 uppercase tracking-wide">
                          {categoryLabels[type as keyof typeof categoryLabels]}
                        </div>
                        {items.map((result) => {
                          const Icon = categoryIcons[result.type as keyof typeof categoryIcons] || FileText;
                          const idx = cursor++;
                          const focused = idx === focusedIndex;
                          return (
                            <button
                              id={`usr-${idx}`}
                              key={result.id}
                              role="option"
                              aria-selected={focused}
                              onMouseEnter={() => setFocusedIndex(idx)}
                              onClick={() => handleResultClick(result.url)}
                              className={`w-full text-left p-3 rounded-lg transition-colors flex items-start gap-3 ${
                                focused ? 'bg-accent' : 'hover:bg-accent'
                              }`}
                            >
                              {result.image ? (
                                <Avatar className="h-10 w-10 flex-shrink-0">
                                  <AvatarImage src={result.image} alt={result.title} />
                                  <AvatarFallback className="bg-primary/10">
                                    <Icon className="h-5 w-5 text-primary" />
                                  </AvatarFallback>
                                </Avatar>
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <Icon className="h-5 w-5 text-primary" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-foreground truncate">{result.title}</div>
                                <div className="text-xs text-muted-foreground truncate">{result.subtitle}</div>
                                {result.description && (
                                  <div className="text-xs text-muted-foreground/70 line-clamp-1 mt-0.5">
                                    {result.description}
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  });
                })()}
              </div>

              {/* See-all footer — also serves as the Enter target when nothing is highlighted */}
              <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border">
                <Button
                  variant="ghost"
                  className="w-full justify-between rounded-none h-11 text-sm"
                  onClick={() => goToSearchPage(searchQuery)}
                >
                  <span>See all results for "<span className="font-semibold">{searchQuery}</span>"</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
};
