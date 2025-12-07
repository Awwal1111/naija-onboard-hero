import React from 'react';
import { Star, ShieldCheck, Crown, Zap } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

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
  const isVerified = badges.emailVerified && badges.phoneVerified && badges.faceVerified;
  const isPartiallyVerified = badges.emailVerified || badges.phoneVerified || badges.faceVerified;
  const isTopRated = (badges.averageRating ?? 0) >= 4.5 && (badges.ratingCount ?? 0) >= 5;
  const isFastResponder = (badges.avgResponseTimeSeconds ?? Infinity) < 180;

  const badgeItems = [];

  // Expert Badge - Gold star
  if (badges.isExpert) {
    badgeItems.push({
      key: 'expert',
      icon: Star,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      label: 'Expert',
      tooltip: 'Verified Expert - Skilled professional in their category'
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
      tooltip: 'Fully Verified - Email, Phone & Identity confirmed'
    });
  } else if (isPartiallyVerified) {
    // Partial verification indicator
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
      tooltip: `Verified: ${verifiedParts.join(', ')}`
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
      tooltip: `Top Rated - ${badges.averageRating?.toFixed(1)}★ from ${badges.ratingCount} reviews`
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
      tooltip: `Fast Responder - Replies in ~${minutes} min on average`
    });
  }

  if (badgeItems.length === 0) return null;

  return (
    <TooltipProvider>
      <div className={cn('flex items-center', containerSizeClasses[size], className)}>
        {badgeItems.map(({ key, icon: Icon, color, bgColor, label, tooltip }) => (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <div 
                className={cn(
                  'flex items-center rounded-full p-0.5',
                  bgColor
                )}
              >
                <Icon className={cn(sizeClasses[size], color, 'fill-current')} />
                {showLabels && (
                  <span className={cn('ml-1 text-xs font-medium', color)}>
                    {label}
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};

// Single badge component for inline use
interface SingleBadgeProps {
  type: 'expert' | 'verified' | 'top-rated' | 'fast-responder';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const SingleBadge: React.FC<SingleBadgeProps> = ({ type, size = 'sm', showLabel = false }) => {
  const badgeConfig = {
    expert: {
      icon: Star,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      label: 'Expert',
      tooltip: 'Verified Expert'
    },
    verified: {
      icon: ShieldCheck,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      label: 'Verified',
      tooltip: 'Fully Verified'
    },
    'top-rated': {
      icon: Crown,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      label: 'Top Rated',
      tooltip: 'Top Rated Professional'
    },
    'fast-responder': {
      icon: Zap,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      label: 'Fast Responder',
      tooltip: 'Responds Quickly'
    }
  };

  const config = badgeConfig[type];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center rounded-full p-0.5', config.bgColor)}>
            <Icon className={cn(sizeClasses[size], config.color, 'fill-current')} />
            {showLabel && (
              <span className={cn('ml-1 text-xs font-medium', config.color)}>
                {config.label}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {config.tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default UserBadges;
