import React, { useState } from 'react';
import { Star, ShieldCheck, Crown, Zap, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface BadgeData {
  isExpert?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  faceVerified?: boolean;
  averageRating?: number;
  ratingCount?: number;
  avgResponseTimeSeconds?: number;
}

interface UserBadgesProps {
  badges: BadgeData;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  className?: string;
}

interface BadgeInfo {
  key: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  label: string;
  description: string;
  details: string;
}

const sizeClasses = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5'
};

const containerSizeClasses = {
  sm: 'gap-0.5',
  md: 'gap-1',
  lg: 'gap-1.5'
};

export const UserBadges: React.FC<UserBadgesProps> = ({ 
  badges, 
  size = 'sm',
  showLabels = false,
  className 
}) => {
  const [selectedBadge, setSelectedBadge] = useState<BadgeInfo | null>(null);

  const isVerified = badges.emailVerified && badges.phoneVerified && badges.faceVerified;
  const isPartiallyVerified = badges.emailVerified || badges.phoneVerified || badges.faceVerified;
  const isTopRated = (badges.averageRating ?? 0) >= 4.5 && (badges.ratingCount ?? 0) >= 5;
  const isFastResponder = (badges.avgResponseTimeSeconds ?? Infinity) < 180;

  const badgeItems: BadgeInfo[] = [];

  // Expert Badge - Gold star
  if (badges.isExpert) {
    badgeItems.push({
      key: 'expert',
      icon: Star,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      label: 'Expert',
      description: 'Verified Expert',
      details: 'This user is a verified expert in their professional category. They have demonstrated skills and experience in their field.'
    });
  }

  // Verified Badge - Blue checkmark (full verification)
  if (isVerified) {
    badgeItems.push({
      key: 'verified',
      icon: ShieldCheck,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      label: 'Verified',
      description: 'Fully Verified',
      details: 'This user has completed full verification: Email confirmed, Phone verified via Telegram, and Identity verified through face recognition.'
    });
  } else if (isPartiallyVerified) {
    const verifiedParts = [];
    if (badges.emailVerified) verifiedParts.push('Email');
    if (badges.phoneVerified) verifiedParts.push('Phone');
    if (badges.faceVerified) verifiedParts.push('Identity');
    
    badgeItems.push({
      key: 'partial-verified',
      icon: ShieldCheck,
      color: 'text-blue-400/70',
      bgColor: 'bg-blue-400/5',
      label: 'Partially Verified',
      description: `Verified: ${verifiedParts.join(', ')}`,
      details: `This user has partially verified their account. Completed: ${verifiedParts.join(', ')}. Full verification requires email, phone, and face verification.`
    });
  }

  // Top Rated Badge - Crown
  if (isTopRated) {
    badgeItems.push({
      key: 'top-rated',
      icon: Crown,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      label: 'Top Rated',
      description: `${badges.averageRating?.toFixed(1)}★ Rating`,
      details: `This user has an excellent rating of ${badges.averageRating?.toFixed(1)} stars from ${badges.ratingCount} reviews. Top Rated status is earned with 4.5+ stars and at least 5 reviews.`
    });
  }

  // Fast Responder Badge - Lightning
  if (isFastResponder) {
    const minutes = Math.round((badges.avgResponseTimeSeconds ?? 0) / 60);
    badgeItems.push({
      key: 'fast-responder',
      icon: Zap,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      label: 'Fast Responder',
      description: `~${minutes} min response`,
      details: `This user typically responds within ${minutes} minutes on average. Fast Responder status is earned by maintaining an average response time under 3 minutes.`
    });
  }

  if (badgeItems.length === 0) return null;

  return (
    <>
      <div className={cn('flex items-center', containerSizeClasses[size], className)}>
        {badgeItems.map((badge) => {
          const Icon = badge.icon;
          return (
            <button
              key={badge.key}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedBadge(badge);
              }}
              className={cn(
                'flex items-center rounded-full p-0.5 transition-transform hover:scale-110 active:scale-95',
                badge.bgColor
              )}
            >
              <Icon className={cn(sizeClasses[size], badge.color, 'fill-current')} />
              {showLabels && (
                <span className={cn('ml-1 text-xs font-medium', badge.color)}>
                  {badge.label}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Badge Info Dialog */}
      <Dialog open={!!selectedBadge} onOpenChange={() => setSelectedBadge(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedBadge && (
                <>
                  <div className={cn('p-2 rounded-full', selectedBadge.bgColor)}>
                    <selectedBadge.icon className={cn('h-6 w-6', selectedBadge.color, 'fill-current')} />
                  </div>
                  <div>
                    <div className="font-semibold">{selectedBadge.label}</div>
                    <div className="text-sm font-normal text-muted-foreground">{selectedBadge.description}</div>
                  </div>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground leading-relaxed">
            {selectedBadge?.details}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Single badge component for inline use
interface SingleBadgeProps {
  type: 'expert' | 'verified' | 'top-rated' | 'fast-responder';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const SingleBadge: React.FC<SingleBadgeProps> = ({ type, size = 'sm', showLabel = false }) => {
  const [showInfo, setShowInfo] = useState(false);

  const badgeConfig = {
    expert: {
      icon: Star,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      label: 'Expert',
      description: 'Verified Expert',
      details: 'This user is a verified expert in their professional category.'
    },
    verified: {
      icon: ShieldCheck,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      label: 'Verified',
      description: 'Fully Verified',
      details: 'This user has completed full verification including email, phone, and identity.'
    },
    'top-rated': {
      icon: Crown,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      label: 'Top Rated',
      description: 'Excellent Rating',
      details: 'This user has earned an excellent rating from multiple reviews.'
    },
    'fast-responder': {
      icon: Zap,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      label: 'Fast Responder',
      description: 'Quick Responses',
      details: 'This user typically responds quickly to messages.'
    }
  };

  const config = badgeConfig[type];
  const Icon = config.icon;

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowInfo(true);
        }}
        className={cn('flex items-center rounded-full p-0.5 transition-transform hover:scale-110', config.bgColor)}
      >
        <Icon className={cn(sizeClasses[size], config.color, 'fill-current')} />
        {showLabel && (
          <span className={cn('ml-1 text-xs font-medium', config.color)}>
            {config.label}
          </span>
        )}
      </button>

      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className={cn('p-2 rounded-full', config.bgColor)}>
                <Icon className={cn('h-6 w-6', config.color, 'fill-current')} />
              </div>
              <div>
                <div className="font-semibold">{config.label}</div>
                <div className="text-sm font-normal text-muted-foreground">{config.description}</div>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground leading-relaxed">
            {config.details}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserBadges;