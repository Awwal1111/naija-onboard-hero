import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Star, Crown, Gem, Lock, CheckCircle } from 'lucide-react';

interface ReferralTier {
  name: string;
  icon: React.ReactNode;
  minReferrals: number;
  reward: number;
  color: string;
  bgColor: string;
}

const REFERRAL_TIERS: ReferralTier[] = [
  { name: 'Starter', icon: <Star className="h-4 w-4" />, minReferrals: 0, reward: 50, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  { name: 'Bronze', icon: <Trophy className="h-4 w-4" />, minReferrals: 5, reward: 50, color: 'text-amber-700', bgColor: 'bg-amber-100' },
  { name: 'Silver', icon: <Trophy className="h-4 w-4" />, minReferrals: 15, reward: 50, color: 'text-slate-500', bgColor: 'bg-slate-100' },
  { name: 'Gold', icon: <Crown className="h-4 w-4" />, minReferrals: 30, reward: 50, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  { name: 'Diamond', icon: <Gem className="h-4 w-4" />, minReferrals: 50, reward: 50, color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
];

interface ReferralTierCardProps {
  completedReferrals: number;
}

export function ReferralTierCard({ completedReferrals }: ReferralTierCardProps) {
  const currentTierIndex = REFERRAL_TIERS.reduce((acc, tier, idx) => {
    return completedReferrals >= tier.minReferrals ? idx : acc;
  }, 0);
  
  const currentTier = REFERRAL_TIERS[currentTierIndex];
  const nextTier = REFERRAL_TIERS[currentTierIndex + 1];
  
  const progressToNext = nextTier 
    ? ((completedReferrals - currentTier.minReferrals) / (nextTier.minReferrals - currentTier.minReferrals)) * 100
    : 100;

  return (
    <Card className="border-accent/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span>Referral Tier</span>
          <Badge className={`${currentTier.bgColor} ${currentTier.color} gap-1`}>
            {currentTier.icon}
            {currentTier.name}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-center py-2 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">Reward per referral</p>
          <p className="text-xl font-bold text-primary">₦50 NC</p>
        </div>

        {nextTier && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{completedReferrals}/{nextTier.minReferrals} to {nextTier.name}</span>
            </div>
            <Progress value={progressToNext} className="h-2" />
          </div>
        )}

        <div className="grid gap-1.5">
          {REFERRAL_TIERS.map((tier, idx) => {
            const isUnlocked = completedReferrals >= tier.minReferrals;
            const isCurrent = idx === currentTierIndex;
            return (
              <div key={tier.name} className={`flex items-center justify-between p-2 rounded-lg ${isCurrent ? 'bg-primary/10 border border-primary/30' : isUnlocked ? 'bg-muted/30' : 'opacity-40'}`}>
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded ${tier.bgColor} ${tier.color}`}>{tier.icon}</div>
                  <span className="font-medium text-sm">{tier.name}</span>
                  <span className="text-xs text-muted-foreground">{tier.minReferrals}+</span>
                </div>
                {isUnlocked ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
