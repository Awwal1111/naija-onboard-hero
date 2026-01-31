import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Star, Crown, Gem, Gift, Lock, CheckCircle } from 'lucide-react';

interface ReferralTier {
  name: string;
  icon: React.ReactNode;
  minReferrals: number;
  reward: number;
  color: string;
  bgColor: string;
}

const REFERRAL_TIERS: ReferralTier[] = [
  { 
    name: 'Starter', 
    icon: <Star className="h-5 w-5" />, 
    minReferrals: 0, 
    reward: 100,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100'
  },
  { 
    name: 'Bronze', 
    icon: <Trophy className="h-5 w-5" />, 
    minReferrals: 5, 
    reward: 150,
    color: 'text-amber-700',
    bgColor: 'bg-amber-100'
  },
  { 
    name: 'Silver', 
    icon: <Trophy className="h-5 w-5" />, 
    minReferrals: 15, 
    reward: 200,
    color: 'text-slate-500',
    bgColor: 'bg-slate-100'
  },
  { 
    name: 'Gold', 
    icon: <Crown className="h-5 w-5" />, 
    minReferrals: 30, 
    reward: 300,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100'
  },
  { 
    name: 'Diamond', 
    icon: <Gem className="h-5 w-5" />, 
    minReferrals: 50, 
    reward: 500,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100'
  },
];

interface ReferralTierCardProps {
  completedReferrals: number;
}

export function ReferralTierCard({ completedReferrals }: ReferralTierCardProps) {
  // Find current tier
  const currentTierIndex = REFERRAL_TIERS.reduce((acc, tier, idx) => {
    return completedReferrals >= tier.minReferrals ? idx : acc;
  }, 0);
  
  const currentTier = REFERRAL_TIERS[currentTierIndex];
  const nextTier = REFERRAL_TIERS[currentTierIndex + 1];
  
  const progressToNext = nextTier 
    ? ((completedReferrals - currentTier.minReferrals) / (nextTier.minReferrals - currentTier.minReferrals)) * 100
    : 100;

  return (
    <Card className="border-primary/20 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="text-lg">Referral Tier</span>
          <Badge className={`${currentTier.bgColor} ${currentTier.color} gap-1`}>
            {currentTier.icon}
            {currentTier.name}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current reward rate */}
        <div className="text-center py-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">Current reward per referral</p>
          <p className="text-2xl font-bold text-primary">₦{currentTier.reward} NC</p>
        </div>

        {/* Progress to next tier */}
        {nextTier && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {completedReferrals}/{nextTier.minReferrals} to {nextTier.name}
              </span>
              <span className="font-medium text-primary">₦{nextTier.reward}/referral</span>
            </div>
            <Progress value={progressToNext} className="h-2" />
          </div>
        )}

        {/* Tier ladder */}
        <div className="space-y-2 pt-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            All Tiers
          </p>
          <div className="grid gap-2">
            {REFERRAL_TIERS.map((tier, idx) => {
              const isUnlocked = completedReferrals >= tier.minReferrals;
              const isCurrent = idx === currentTierIndex;
              
              return (
                <div 
                  key={tier.name}
                  className={`flex items-center justify-between p-2 rounded-lg transition-all ${
                    isCurrent 
                      ? 'bg-primary/10 border border-primary/30' 
                      : isUnlocked 
                        ? 'bg-muted/30' 
                        : 'opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded ${tier.bgColor} ${tier.color}`}>
                      {tier.icon}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{tier.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {tier.minReferrals}+ referrals
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">₦{tier.reward}</span>
                    {isUnlocked ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
