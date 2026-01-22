import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, MessageCircle, Shield, CheckCircle, TrendingUp, Clock, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BookmarkButton } from '@/components/BookmarkButton';
import { HireExpertDialog } from '@/components/HireExpertDialog';
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
    is_boosted?: boolean;
    profiles?: {
      full_name: string;
      bio: string;
      profession: string;
      profile_picture_url: string;
      average_rating: number;
      rating_count: number;
      verification_status?: 'unverified' | 'submitted' | 'verified';
      avg_response_time_seconds?: number;
    } | null;
    verification_status?: 'unverified' | 'submitted' | 'verified';
    relevance_score?: number;
  };
  viewMode: 'grid' | 'list';
  onProfileClick?: (userId: string) => void;
}

export const ExpertCard: React.FC<ExpertCardProps> = ({ expert, viewMode, onProfileClick }) => {
  const navigate = useNavigate();
  const [showHireDialog, setShowHireDialog] = useState(false);
  
  const name = expert.profiles?.full_name || expert.full_name;
  const profilePic = expert.profiles?.profile_picture_url || '';
  const rating = expert.profiles?.average_rating || 0;
  const reviewCount = expert.profiles?.rating_count || 0;
  const verificationStatus = expert.profiles?.verification_status || expert.verification_status || 'unverified';
  const isVerified = verificationStatus === 'verified';
  const isSubmitted = verificationStatus === 'submitted';
  const isBoosted = expert.is_boosted;
  
  // Format response time
  const responseTime = expert.profiles?.avg_response_time_seconds;
  const getResponseLabel = () => {
    if (!responseTime) return null;
    if (responseTime < 3600) return 'Replies in < 1hr';
    if (responseTime < 86400) return 'Replies in < 24hrs';
    return null;
  };

  // Get verification badge
  const getVerificationBadge = () => {
    if (isVerified) {
      return (
        <Badge className="bg-green-500/90 text-white text-[10px] px-1.5 py-0">
          <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
          Verified
        </Badge>
      );
    }
    if (isSubmitted) {
      return (
        <Badge className="bg-yellow-500/80 text-white text-[10px] px-1.5 py-0">
          <Clock className="h-2.5 w-2.5 mr-0.5" />
          Pending
        </Badge>
      );
    }
    return null;
  };

  if (viewMode === 'grid') {
    return (
      <>
        <Card className={`group overflow-hidden hover:shadow-lg transition-all duration-300 ${isBoosted ? 'ring-2 ring-amber-400/50 border-amber-400/30' : 'hover:border-primary/50'}`}>
          <CardContent className="p-0">
            {/* Header with gradient */}
            <div className={`h-16 relative ${
              isVerified 
                ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/10' 
                : isBoosted 
                ? 'bg-gradient-to-br from-amber-500/30 to-orange-500/20' 
                : 'bg-gradient-to-br from-primary/20 to-primary/5'
            }`}>
              <div className="absolute top-2 right-2 flex gap-1">
                {isBoosted && (
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] px-1.5 py-0">
                    <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                    Boosted
                  </Badge>
                )}
                {getVerificationBadge()}
              </div>
            </div>
            
            {/* Avatar */}
            <div className="px-4 -mt-8 relative z-10">
              <Avatar 
                className={`h-16 w-16 ring-4 ${isBoosted ? 'ring-amber-400/30' : 'ring-background'} cursor-pointer hover:ring-primary/50 transition-all`}
                onClick={() => onProfileClick?.(expert.user_id)}
              >
                <AvatarImage src={profilePic} alt={name} />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                  {name?.[0] || 'E'}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Content */}
            <div className="p-4 pt-2 space-y-2">
              <div>
                <h3 
                  className="font-semibold text-foreground truncate cursor-pointer hover:text-primary transition-colors flex items-center gap-1"
                  onClick={() => onProfileClick?.(expert.user_id)}
                >
                  {name}
                  {isVerified && <Shield className="h-3.5 w-3.5 text-green-500 fill-green-500/20" />}
                </h3>
                <p className="text-sm text-primary font-medium truncate">{expert.skill_category}</p>
              </div>

              {/* Rating & Response Time */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium text-sm">{rating.toFixed(1)}</span>
                  <span className="text-muted-foreground text-xs">({reviewCount})</span>
                </div>
                {getResponseLabel() && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span className="truncate">{getResponseLabel()}</span>
                  </div>
                )}
              </div>

              {/* Location & Experience */}
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{expert.location_state}</span>
                </div>
                <span>•</span>
                <span>{expert.years_experience} yrs</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button 
                  size="sm" 
                  className="flex-1 h-8"
                  onClick={() => navigate(`/chat/${expert.user_id}`)}
                >
                  <MessageCircle className="h-3.5 w-3.5 mr-1" />
                  Chat
                </Button>
                <Button 
                  size="sm"
                  variant="outline"
                  className="flex-1 h-8"
                  onClick={() => setShowHireDialog(true)}
                >
                  <Briefcase className="h-3.5 w-3.5 mr-1" />
                  Hire
                </Button>
              </div>
              <div className="flex justify-center pt-1">
                <BookmarkButton type="expert" itemId={expert.user_id} />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <HireExpertDialog
          open={showHireDialog}
          onOpenChange={setShowHireDialog}
          expertId={expert.user_id}
          expertName={name}
        />
      </>
    );
  }

  // List View
  return (
    <>
      <Card className={`hover:shadow-md transition-all duration-200 ${isBoosted ? 'ring-1 ring-amber-400/50 border-amber-400/30' : 'hover:border-primary/30'}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Profile Picture */}
            <div className="relative">
              <Avatar 
                className={`h-14 w-14 shrink-0 cursor-pointer hover:ring-2 hover:ring-primary transition-all ${isBoosted ? 'ring-2 ring-amber-400/50' : ''}`}
                onClick={() => onProfileClick?.(expert.user_id)}
              >
                <AvatarImage src={profilePic} alt={name} />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                  {name?.[0] || 'E'}
                </AvatarFallback>
              </Avatar>
              {isBoosted && (
                <div className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full p-0.5">
                  <TrendingUp className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 
                  className="font-semibold text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                  onClick={() => onProfileClick?.(expert.user_id)}
                >
                  {name}
                </h3>
                {isVerified ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs shrink-0">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                ) : isSubmitted ? (
                  <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs shrink-0">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                ) : null}
                {isBoosted && (
                  <Badge className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs shrink-0">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Featured
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
                {getResponseLabel() && (
                  <div className="flex items-center gap-1 text-primary">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{getResponseLabel()}</span>
                  </div>
                )}
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
                  onClick={() => setShowHireDialog(true)}
                >
                  <Briefcase className="h-3.5 w-3.5 mr-1" />
                  Hire Now
                </Button>
                <Button 
                  size="sm"
                  variant="ghost"
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
      
      <HireExpertDialog
        open={showHireDialog}
        onOpenChange={setShowHireDialog}
        expertId={expert.user_id}
        expertName={name}
      />
    </>
  );
};

export default ExpertCard;
