import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Star, Crown, MapPin, CheckCircle, Sparkles, ChevronRight } from 'lucide-react';
import { PersonalizedExpert } from '@/hooks/usePersonalizedDiscovery';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface AIExpertCarouselProps {
  experts: PersonalizedExpert[];
  userState?: string;
  userProfession?: string;
  chatKeywords?: string[];
  onProfileClick?: (userId: string) => void;
}

export const AIExpertCarousel = ({
  experts,
  userState,
  userProfession,
  chatKeywords = [],
  onProfileClick
}: AIExpertCarouselProps) => {
  const { history } = useSearchHistory();
  const navigate = useNavigate();

  // AI-powered scoring and recommendation
  const recommendedExperts = useMemo(() => {
    if (!experts.length) return [];

    const searchTerms = history.slice(0, 10).map(h => h.query.toLowerCase());
    const allKeywords = [...searchTerms, ...chatKeywords.map(k => k.toLowerCase())];

    return experts
      .map(expert => {
        let score = 0;
        const reasons: string[] = [];

        // Premium status (highest weight)
        if (expert.is_premium) {
          score += 30;
          reasons.push('Premium Expert');
        }

        // Boosted profile
        if (expert.is_boosted) {
          score += 25;
          reasons.push('Featured');
        }

        // Verified expert (based on expert_verified_at)
        if (expert.expert_verified_at) {
          score += 20;
          reasons.push('Verified');
        }

        // Location match
        if (userState && expert.state_name === userState) {
          score += 15;
          reasons.push('Near you');
        }

        // High rating
        if (expert.average_rating >= 4.5) {
          score += 15;
          reasons.push('Top rated');
        } else if (expert.average_rating >= 4.0) {
          score += 10;
        }

        // Experience
        if (expert.years_experience >= 5) {
          score += 10;
          reasons.push(`${expert.years_experience}+ years`);
        }

        // Connection count (social proof)
        if (expert.connections_count >= 50) {
          score += 8;
        }

        // Search/chat keyword relevance
        const expertText = `${expert.full_name} ${expert.profession} ${expert.skill_category} ${expert.bio}`.toLowerCase();
        allKeywords.forEach(keyword => {
          if (expertText.includes(keyword)) {
            score += 5;
          }
        });

        // Profession relevance
        if (userProfession) {
          const profLower = userProfession.toLowerCase();
          if (expert.skill_category?.toLowerCase().includes(profLower) ||
              expert.profession?.toLowerCase().includes(profLower)) {
            score += 12;
            reasons.push('Relevant skill');
          }
        }

        return { ...expert, aiScore: score, reasons: reasons.slice(0, 2) };
      })
      .sort((a, b) => b.aiScore - a.aiScore)
      .slice(0, 6);
  }, [experts, userState, userProfession, history, chatKeywords]);

  if (!recommendedExperts.length) return null;

  const handleExpertClick = (userId: string) => {
    if (onProfileClick) {
      onProfileClick(userId);
    } else {
      navigate(`/profile/${userId}`);
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-background to-primary/5 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-full">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-semibold text-sm">AI Picks for You</h3>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            Personalized
          </Badge>
        </div>

        {/* Horizontal Scroll Carousel */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
          {recommendedExperts.map((expert) => (
            <div
              key={expert.user_id}
              onClick={() => handleExpertClick(expert.user_id)}
              className={cn(
                "flex-shrink-0 w-[140px] p-3 rounded-xl cursor-pointer transition-all",
                "bg-card border border-border hover:border-primary/40 hover:shadow-md"
              )}
            >
              <div className="relative mb-2">
                <Avatar className="h-12 w-12 mx-auto">
                  <AvatarImage src={expert.profile_picture_url || ''} alt={expert.full_name || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {expert.full_name?.[0] || 'E'}
                  </AvatarFallback>
                </Avatar>
                {expert.is_premium && (
                  <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5">
                    <Crown className="h-3 w-3 text-white" />
                  </div>
                )}
                {expert.expert_verified_at && !expert.is_premium && (
                  <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5">
                    <CheckCircle className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>

              <div className="text-center">
                <p className="font-medium text-xs truncate">{expert.full_name}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {expert.skill_category || expert.profession}
                </p>

                <div className="flex items-center justify-center gap-1 mt-1">
                  {expert.average_rating > 0 && (
                    <div className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-[10px] font-medium">{expert.average_rating.toFixed(1)}</span>
                    </div>
                  )}
                  {expert.state_name && (
                    <div className="flex items-center gap-0.5 text-muted-foreground">
                      <MapPin className="h-2.5 w-2.5" />
                      <span className="text-[10px] truncate max-w-[50px]">{expert.state_name}</span>
                    </div>
                  )}
                </div>

                {expert.reasons.length > 0 && (
                  <Badge variant="secondary" className="mt-1.5 text-[9px] px-1.5 py-0">
                    {expert.reasons[0]}
                  </Badge>
                )}
              </div>
            </div>
          ))}

          {/* View All Card */}
          <div
            onClick={() => navigate('/experts')}
            className={cn(
              "flex-shrink-0 w-[100px] p-3 rounded-xl cursor-pointer transition-all",
              "bg-primary/5 border border-dashed border-primary/30 hover:border-primary/50",
              "flex flex-col items-center justify-center"
            )}
          >
            <ChevronRight className="h-6 w-6 text-primary mb-1" />
            <span className="text-xs font-medium text-primary">View All</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
