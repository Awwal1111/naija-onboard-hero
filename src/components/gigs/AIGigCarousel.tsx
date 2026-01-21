import React, { useMemo, useRef, useState } from 'react';
import { Sparkles, ChevronLeft, ChevronRight, Crown, TrendingUp, MapPin, Shield, Star, Zap, Clock, History, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { getCategoryPlaceholder, normalizeCategory } from '@/lib/gigCategories';
import { cn } from '@/lib/utils';
import { formatPriceForDisplay } from '@/components/CurrencyDisplay';
import { useUserCountry } from '@/hooks/useUserCountry';

interface GigData {
  id: string;
  title: string;
  description?: string;
  price: number;
  category: string;
  photo_urls?: string[];
  boost_amount?: number;
  seller_id?: string;
  seller_name?: string;
  seller_picture?: string;
  seller_rating?: number;
  seller_is_expert?: boolean;
  seller_state?: string;
  average_rating?: number;
  review_count?: number;
  relevance_score?: number;
  created_at?: string;
}

interface AIGigCarouselProps {
  gigs: GigData[];
  userState?: string | null;
  userProfession?: string | null;
  isPremium?: boolean;
  chatKeywords?: string[];
}

interface RecommendationReason {
  icon: React.ReactNode;
  text: string;
  priority: number;
}

export const AIGigCarousel: React.FC<AIGigCarouselProps> = ({ 
  gigs, 
  userState, 
  userProfession,
  isPremium = false,
  chatKeywords = []
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { isNigerian } = useUserCountry();
  const { getRecentCategories, getRecentQueries } = useSearchHistory();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // AI-powered recommendation scoring with search history & chat context
  const recommendedGigs = useMemo(() => {
    if (!gigs.length) return [];

    const currentUserState = userState || profile?.state_name;
    const currentUserProfession = userProfession || profile?.profession;
    const recentCategories = getRecentCategories();
    const recentQueries = getRecentQueries();

    return gigs
      .map(gig => {
        let score = gig.relevance_score || 0;
        const reasons: RecommendationReason[] = [];

        // Boost factor (highest priority)
        if ((gig.boost_amount || 0) > 0) {
          score += (gig.boost_amount || 0) * 2;
          reasons.push({
            icon: <Zap className="h-3 w-3 text-amber-500" />,
            text: 'Promoted',
            priority: 1
          });
        }

        // Search history match (new weighting)
        const gigCatLower = normalizeCategory(gig.category).toLowerCase();
        const gigTitleLower = gig.title?.toLowerCase() || '';
        
        if (recentCategories.some(cat => gigCatLower.includes(cat.toLowerCase()))) {
          score += 35;
          reasons.push({
            icon: <History className="h-3 w-3 text-purple-500" />,
            text: 'Based on your searches',
            priority: 2
          });
        }

        // Check if gig matches recent search queries
        if (recentQueries.some(query => 
          gigTitleLower.includes(query) || 
          gig.description?.toLowerCase().includes(query)
        )) {
          score += 30;
          if (!reasons.some(r => r.text.includes('search'))) {
            reasons.push({
              icon: <History className="h-3 w-3 text-purple-500" />,
              text: 'Matches your interests',
              priority: 2
            });
          }
        }

        // Chat context keywords (from AI/human chats)
        if (chatKeywords.length > 0) {
          const matchedKeywords = chatKeywords.filter(keyword =>
            gigTitleLower.includes(keyword.toLowerCase()) ||
            gigCatLower.includes(keyword.toLowerCase())
          );
          if (matchedKeywords.length > 0) {
            score += 25 * matchedKeywords.length;
            reasons.push({
              icon: <MessageCircle className="h-3 w-3 text-blue-500" />,
              text: 'From your conversations',
              priority: 3
            });
          }
        }

        // Location match
        if (currentUserState && gig.seller_state === currentUserState) {
          score += 30;
          reasons.push({
            icon: <MapPin className="h-3 w-3 text-blue-500" />,
            text: `Near you`,
            priority: 4
          });
        }

        // Expert seller trust boost
        if (gig.seller_is_expert) {
          score += 25;
          reasons.push({
            icon: <Shield className="h-3 w-3 text-green-500" />,
            text: 'Verified Expert',
            priority: 5
          });
        }

        // High rating boost
        if ((gig.average_rating || 0) >= 4.5) {
          score += 20;
          reasons.push({
            icon: <Star className="h-3 w-3 text-yellow-500" />,
            text: 'Top rated',
            priority: 6
          });
        } else if ((gig.average_rating || 0) >= 4.0) {
          score += 10;
        }

        // Review count boost (social proof)
        if ((gig.review_count || 0) >= 10) {
          score += 15;
          reasons.push({
            icon: <TrendingUp className="h-3 w-3 text-orange-500" />,
            text: 'Popular',
            priority: 7
          });
        }

        // Profession/category relevance
        if (currentUserProfession) {
          const professionLower = currentUserProfession.toLowerCase();
          
          if (gigCatLower.includes(professionLower) || gigTitleLower.includes(professionLower)) {
            score += 20;
            reasons.push({
              icon: <Sparkles className="h-3 w-3 text-primary" />,
              text: 'In your field',
              priority: 8
            });
          }
        }

        // Recency boost for fresh gigs
        if (gig.created_at) {
          const daysSinceCreation = (Date.now() - new Date(gig.created_at).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceCreation <= 3) {
            score += 10;
            reasons.push({
              icon: <Clock className="h-3 w-3 text-green-500" />,
              text: 'New',
              priority: 9
            });
          }
        }

        // Sort reasons by priority
        reasons.sort((a, b) => a.priority - b.priority);

        return {
          ...gig,
          aiScore: score,
          reasons: reasons.slice(0, 2) // Show top 2 reasons
        };
      })
      .sort((a, b) => b.aiScore - a.aiScore)
      .slice(0, 6); // Limit to 6 recommendations
  }, [gigs, userState, userProfession, profile, chatKeywords, getRecentCategories, getRecentQueries]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (!recommendedGigs.length) return null;

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold text-sm">AI Picks For You</span>
          {isPremium && (
            <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white text-[9px] gap-0.5 border-0">
              <Crown className="h-2.5 w-2.5" />
              Premium
            </Badge>
          )}
        </div>
        {!user && (
          <Badge variant="outline" className="text-[10px]">
            Sign in for personalized picks
          </Badge>
        )}
      </div>

      {/* Carousel Navigation Buttons */}
      {canScrollLeft && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full shadow-md bg-background/95"
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}
      {canScrollRight && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full shadow-md bg-background/95"
          onClick={() => scroll('right')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Carousel */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {recommendedGigs.map((gig) => (
          <div
            key={gig.id}
            className="group cursor-pointer flex-shrink-0 w-[140px] snap-start"
            onClick={() => navigate(`/gig/${gig.id}`)}
          >
            {/* Compact Card */}
            <div className="relative aspect-[4/3] rounded-lg overflow-hidden mb-2 bg-muted">
              <img
                src={gig.photo_urls?.[0] || getCategoryPlaceholder(normalizeCategory(gig.category))}
                alt={gig.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {/* Badges */}
              <div className="absolute top-1 left-1 right-1 flex justify-between">
                {(gig.boost_amount || 0) > 0 && (
                  <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white text-[8px] h-4 px-1.5 border-0">
                    <Zap className="h-2.5 w-2.5 mr-0.5 fill-white" />
                    Featured
                  </Badge>
                )}
                {gig.seller_is_expert && (
                  <Badge className="bg-green-500/90 text-white text-[8px] h-4 px-1 border-0 ml-auto">
                    <Shield className="h-2.5 w-2.5" />
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Title */}
            <h4 className="text-xs font-medium line-clamp-2 group-hover:text-primary transition-colors leading-tight">
              {gig.title}
            </h4>
            
            {/* Price & Rating */}
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs font-bold text-primary">
                {isNigerian ? `₦${gig.price?.toLocaleString()}` : `~$${((gig.price || 0) / 1600).toFixed(2)}`}
              </span>
              {(gig.average_rating || 0) > 0 && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-[10px] text-muted-foreground">{(gig.average_rating || 0).toFixed(1)}</span>
                </>
              )}
            </div>
            
            {/* AI Reason Tags */}
            {gig.reasons?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {gig.reasons.slice(0, 1).map((reason, idx) => (
                  <span key={idx} className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                    {reason.icon}
                    {reason.text}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
