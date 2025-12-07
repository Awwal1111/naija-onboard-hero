import { useState, useEffect, useRef } from 'react';
import { Search, User, FileText, Briefcase, GraduationCap, Heart, Package, Hash, MapPin, ShoppingBag, AlertCircle, Video, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useUnifiedSearch } from '@/hooks/useUnifiedSearch';
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

  // Sort groups by category order
  const sortedGroups = categoryOrder.filter(cat => groupedResults[cat]);

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search NaijaLancers..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => searchQuery.length >= 2 && setIsOpen(true)}
          className="pl-10 pr-4 rounded-full bg-muted/50 border-border focus:bg-background"
        />
      </div>

      {isOpen && searchQuery.length >= 2 && (
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
              <p className="text-xs text-muted-foreground mt-1">Try searching for users, jobs, courses, or hashtags</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sortedGroups.map((type) => {
                const items = groupedResults[type];
                if (!items || items.length === 0) return null;
                
                return (
                  <div key={type} className="p-2">
                    <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5 uppercase tracking-wide">
                      {categoryLabels[type as keyof typeof categoryLabels]}
                    </div>
                    {items.map((result) => {
                      const Icon = categoryIcons[result.type as keyof typeof categoryIcons] || FileText;
                      return (
                        <button
                          key={result.id}
                          onClick={() => handleResultClick(result.url)}
                          className="w-full text-left p-3 hover:bg-accent rounded-lg transition-colors flex items-start gap-3"
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
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
