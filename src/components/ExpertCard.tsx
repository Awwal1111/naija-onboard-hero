import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, MessageCircle, Shield, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BookmarkButton } from '@/components/BookmarkButton';

interface ExpertCardProps {
  expert: {
    id: string;
    user_id: string;
    full_name: string;
    skill_category: string;
    years_experience: number;
    location_state: string;
    location_lga?: string;
    location_area?: string;
    profiles?: {
      full_name: string;
      bio: string;
      profession: string;
      profile_picture_url: string;
      average_rating: number;
      rating_count: number;
      verification_status?: 'unverified' | 'submitted' | 'verified';
    } | null;
    verification_status?: 'unverified' | 'submitted' | 'verified';
    relevance_score?: number;
  };
  viewMode: 'grid' | 'list';
  onProfileClick?: (userId: string) => void;
}

export const ExpertCard: React.FC<ExpertCardProps> = ({ expert, viewMode, onProfileClick }) => {
  const navigate = useNavigate();
  
  const name = expert.profiles?.full_name || expert.full_name;
  const profilePic = expert.profiles?.profile_picture_url || '';
  const rating = expert.profiles?.average_rating || 0;
  const reviewCount = expert.profiles?.rating_count || 0;
  const verificationStatus = expert.profiles?.verification_status || expert.verification_status || 'unverified';
  const isVerified = verificationStatus === 'verified';

  const handleProfileClick = () => {
    if (onProfileClick) {
      onProfileClick(expert.user_id);
    }
  };

  if (viewMode === 'grid') {
    return (
      <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-primary/50">
        <CardContent className="p-0">
          {/* Header with gradient */}
          <div className="h-16 bg-gradient-to-br from-primary/20 to-primary/5 relative">
            {isVerified && (
              <Badge className="absolute top-2 right-2 bg-green-500/90 text-white text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>
          
          {/* Avatar */}
          <div className="px-4 -mt-8 relative z-10">
            <Avatar 
              className="h-16 w-16 ring-4 ring-background cursor-pointer hover:ring-primary/50 transition-all"
              onClick={handleProfileClick}
            >
              <AvatarImage src={profilePic} alt={name} />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                {name?.[0] || 'E'}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Content */}
          <div className="p-4 pt-2 space-y-3">
            <div>
              <h3 
                className="font-semibold text-foreground truncate cursor-pointer hover:text-primary transition-colors flex items-center gap-1"
                onClick={handleProfileClick}
              >
                {name}
                {isVerified && <Shield className="h-3.5 w-3.5 text-green-500 fill-green-500/20" />}
              </h3>
              <p className="text-sm text-primary font-medium truncate">{expert.skill_category}</p>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{rating.toFixed(1)}</span>
              <span className="text-muted-foreground text-sm">({reviewCount})</span>
            </div>

            {/* Location */}
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{expert.location_state}</span>
            </div>

            {/* Experience */}
            <p className="text-xs text-muted-foreground">
              {expert.years_experience} years experience
            </p>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button 
                size="sm" 
                className="flex-1"
                onClick={() => navigate(`/chat/${expert.user_id}`)}
              >
                <MessageCircle className="h-3.5 w-3.5 mr-1" />
                Chat
              </Button>
              <Button 
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => navigate(`/expert/${expert.user_id}`)}
              >
                Profile
              </Button>
            </div>
            <div className="flex justify-center pt-1">
              <BookmarkButton type="expert" itemId={expert.user_id} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // List View
  return (
    <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/30">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Profile Picture */}
          <Avatar 
            className="h-14 w-14 shrink-0 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
            onClick={handleProfileClick}
          >
            <AvatarImage src={profilePic} alt={name} />
            <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
              {name?.[0] || 'E'}
            </AvatarFallback>
          </Avatar>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 
                className="font-semibold text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                onClick={handleProfileClick}
              >
                {name}
              </h3>
              {isVerified ? (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs shrink-0">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs shrink-0">
                  Unverified
                </Badge>
              )}
            </div>
            
            <p className="text-sm text-primary font-medium mb-2">{expert.skill_category}</p>
            
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                <span>{rating.toFixed(1)} ({reviewCount})</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                <span>{expert.location_area ? `${expert.location_area}, ` : ''}{expert.location_state}</span>
              </div>
              <span>{expert.years_experience} yrs exp</span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={() => navigate(`/chat/${expert.user_id}`)}
              >
                <MessageCircle className="h-3.5 w-3.5 mr-1" />
                Chat
              </Button>
              <Button 
                size="sm"
                variant="outline"
                onClick={() => navigate(`/expert/${expert.user_id}`)}
              >
                View Profile
              </Button>
              <BookmarkButton type="expert" itemId={expert.user_id} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpertCard;
