import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Shield, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

interface FeaturedExpert {
  id: string;
  user_id: string;
  full_name: string;
  skill_category: string;
  profile_picture_url?: string;
  average_rating: number;
  rating_count: number;
  is_boosted?: boolean;
  verification_status?: 'verified' | 'unverified' | 'submitted';
}

interface FeaturedExpertsProps {
  experts: FeaturedExpert[];
  onProfileClick?: (userId: string) => void;
}

export const FeaturedExperts: React.FC<FeaturedExpertsProps> = ({ experts, onProfileClick }) => {
  const navigate = useNavigate();

  // Get top verified/boosted experts
  const featuredExperts = experts
    .filter(e => e.verification_status === 'verified' || e.is_boosted || e.average_rating >= 4.5)
    .slice(0, 10);

  if (featuredExperts.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Featured Experts
        </h2>
      </div>

      <Carousel
        opts={{
          align: 'start',
          loop: featuredExperts.length > 3,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2">
          {featuredExperts.map((expert) => (
            <CarouselItem key={expert.id} className="pl-2 basis-[140px] md:basis-[160px]">
              <Card 
                className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50 overflow-hidden"
                onClick={() => onProfileClick?.(expert.user_id)}
              >
                <CardContent className="p-3 text-center">
                  {/* Boost/Verified Badge */}
                  <div className="flex justify-center gap-1 mb-2">
                    {expert.is_boosted && (
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] px-1.5 py-0">
                        <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                        Boosted
                      </Badge>
                    )}
                    {expert.verification_status === 'verified' && !expert.is_boosted && (
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px] px-1.5 py-0">
                        <Shield className="h-2.5 w-2.5 mr-0.5" />
                        Verified
                      </Badge>
                    )}
                  </div>

                  {/* Avatar */}
                  <Avatar className="h-14 w-14 mx-auto mb-2 ring-2 ring-primary/20">
                    <AvatarImage src={expert.profile_picture_url} alt={expert.full_name} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                      {expert.full_name?.[0] || 'E'}
                    </AvatarFallback>
                  </Avatar>

                  {/* Name */}
                  <h3 className="font-medium text-sm truncate">{expert.full_name}</h3>
                  
                  {/* Skill */}
                  <p className="text-xs text-muted-foreground truncate mb-1.5">
                    {expert.skill_category}
                  </p>

                  {/* Rating */}
                  <div className="flex items-center justify-center gap-1 text-xs">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{expert.average_rating.toFixed(1)}</span>
                    <span className="text-muted-foreground">({expert.rating_count})</span>
                  </div>

                  {/* Quick View Button */}
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full mt-2 h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/expert/${expert.user_id}`);
                    }}
                  >
                    View Profile
                  </Button>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        {featuredExperts.length > 3 && (
          <>
            <CarouselPrevious className="hidden md:flex -left-3 h-8 w-8" />
            <CarouselNext className="hidden md:flex -right-3 h-8 w-8" />
          </>
        )}
      </Carousel>
    </div>
  );
};

export default FeaturedExperts;
