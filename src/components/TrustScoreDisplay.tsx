import React from 'react';
import { Shield, ShieldCheck, ShieldAlert, Crown, Info } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { TrustScoreData } from '@/hooks/useTrustScore';

interface TrustScoreBadgeProps {
  score: number;
  level: TrustScoreData['level'];
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
  className?: string;
}

const levelConfig = {
  unverified: {
    icon: ShieldAlert,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    progressColor: 'bg-muted-foreground',
  },
  basic: {
    icon: Shield,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    progressColor: 'bg-blue-500',
  },
  trusted: {
    icon: ShieldCheck,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    progressColor: 'bg-green-500',
  },
  highly_trusted: {
    icon: Crown,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    progressColor: 'bg-amber-500',
  },
};

const sizeConfig = {
  sm: { icon: 'h-3.5 w-3.5', text: 'text-xs', padding: 'p-0.5 px-1.5' },
  md: { icon: 'h-4 w-4', text: 'text-sm', padding: 'p-1 px-2' },
  lg: { icon: 'h-5 w-5', text: 'text-base', padding: 'p-1.5 px-2.5' },
};

export const TrustScoreBadge: React.FC<TrustScoreBadgeProps> = ({
  score,
  level,
  size = 'sm',
  showScore = true,
  className,
}) => {
  const config = levelConfig[level];
  const sizes = sizeConfig[size];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-1 rounded-full font-medium',
              config.bgColor,
              config.color,
              sizes.padding,
              className
            )}
          >
            <Icon className={cn(sizes.icon, 'fill-current')} />
            {showScore && <span className={sizes.text}>{score}%</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Trust Score: {score}% ({level.replace('_', ' ')})
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

interface TrustScoreCardProps {
  trustScore: TrustScoreData;
  showBreakdown?: boolean;
  className?: string;
}

export const TrustScoreCard: React.FC<TrustScoreCardProps> = ({
  trustScore,
  showBreakdown = true,
  className,
}) => {
  const config = levelConfig[trustScore.level];
  const Icon = config.icon;

  const breakdownItems = [
    { label: 'Verification', value: trustScore.breakdown.verification, max: 40, color: 'bg-blue-500' },
    { label: 'Reputation', value: trustScore.breakdown.reputation, max: 30, color: 'bg-purple-500' },
    { label: 'Activity', value: trustScore.breakdown.activity, max: 20, color: 'bg-green-500' },
    { label: 'Community', value: trustScore.breakdown.community, max: 10, color: 'bg-orange-500' },
  ];

  return (
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={cn('p-2 rounded-full', config.bgColor)}>
            <Icon className={cn('h-5 w-5', config.color)} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Trust Score</h3>
            <p className={cn('text-sm font-medium', config.color)}>{trustScore.levelLabel}</p>
          </div>
        </div>
        <div className={cn('text-3xl font-bold', config.color)}>
          {trustScore.score}%
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <Progress value={trustScore.score} className="h-2" />
      </div>

      {/* Breakdown */}
      {showBreakdown && (
        <div className="space-y-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Info className="h-3 w-3" />
            <span>Score Breakdown</span>
          </div>
          {breakdownItems.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium text-foreground">{item.value}/{item.max}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', item.color)}
                  style={{ width: `${(item.value / item.max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tips */}
      {trustScore.score < 75 && (
        <div className="mt-4 pt-3 border-t">
          <p className="text-xs text-muted-foreground mb-2">Improve your score:</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            {!trustScore.details.faceVerified && (
              <li className="flex items-center gap-1">
                <span className="w-1 h-1 bg-blue-500 rounded-full" />
                Complete face verification (+20 pts)
              </li>
            )}
            {!trustScore.details.phoneVerified && (
              <li className="flex items-center gap-1">
                <span className="w-1 h-1 bg-blue-500 rounded-full" />
                Verify your phone number (+10 pts)
              </li>
            )}
            {trustScore.details.ratingCount < 5 && (
              <li className="flex items-center gap-1">
                <span className="w-1 h-1 bg-purple-500 rounded-full" />
                Get more ratings from clients
              </li>
            )}
            {trustScore.details.connectionsCount < 10 && (
              <li className="flex items-center gap-1">
                <span className="w-1 h-1 bg-orange-500 rounded-full" />
                Grow your network connections
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

// Inline mini badge for feed/cards
interface TrustScoreMiniProps {
  score: number;
  level: TrustScoreData['level'];
  className?: string;
}

export const TrustScoreMini: React.FC<TrustScoreMiniProps> = ({ score, level, className }) => {
  const config = levelConfig[level];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-0.5', className)}>
            <Icon className={cn('h-3 w-3', config.color)} />
            <span className={cn('text-[10px] font-medium', config.color)}>{score}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Trust Score: {score}%
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default TrustScoreCard;
