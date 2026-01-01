import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gift, Users, Trophy, Target, Crown, Sparkles } from "lucide-react";
import { ShareButtons } from "./ShareButtons";

interface ReferralProgressCardProps {
  referralCode: string;
  totalReferrals: number;
  pendingReferrals: number;
  completedReferrals: number;
  totalEarnings: number;
}

const milestones = [
  { count: 5, reward: "₦500 Bonus", icon: Gift, description: "5 quality referrals" },
  { count: 10, reward: "Premium Badge", icon: Crown, description: "10 quality referrals" },
  { count: 25, reward: "₦2,500 Bonus", icon: Trophy, description: "25 quality referrals" },
  { count: 50, reward: "VIP Status", icon: Sparkles, description: "50 quality referrals" },
];

export const ReferralProgressCard = ({
  referralCode,
  totalReferrals,
  pendingReferrals,
  completedReferrals,
  totalEarnings,
}: ReferralProgressCardProps) => {
  const nextMilestone = milestones.find((m) => m.count > completedReferrals) || milestones[milestones.length - 1];
  const previousMilestone = milestones.filter((m) => m.count <= completedReferrals).pop();
  
  const progressStart = previousMilestone?.count || 0;
  const progressEnd = nextMilestone.count;
  const progressPercent = Math.min(
    ((completedReferrals - progressStart) / (progressEnd - progressStart)) * 100,
    100
  );

  const referralLink = `${window.location.origin}/signup?ref=${referralCode}`;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          Invite Friends & Earn
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-background/50 rounded-lg">
            <p className="text-2xl font-bold text-primary">{completedReferrals}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div className="text-center p-3 bg-background/50 rounded-lg">
            <p className="text-2xl font-bold text-yellow-600">{pendingReferrals}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div className="text-center p-3 bg-background/50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">₦{totalEarnings}</p>
            <p className="text-xs text-muted-foreground">Earned</p>
          </div>
        </div>

        {/* Progress to Next Milestone */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Next milestone</span>
            <div className="flex items-center gap-1">
              <nextMilestone.icon className="h-4 w-4 text-primary" />
              <span className="font-medium">{nextMilestone.reward}</span>
            </div>
          </div>
          <Progress value={progressPercent} className="h-3" />
          <p className="text-xs text-muted-foreground text-center">
            {completedReferrals}/{nextMilestone.count} referrals to unlock
          </p>
        </div>

        {/* Milestones */}
        <div className="flex justify-between items-center pt-2">
          {milestones.map((milestone, index) => {
            const isCompleted = completedReferrals >= milestone.count;
            const Icon = milestone.icon;
            return (
              <div
                key={index}
                className={`flex flex-col items-center gap-1 ${
                  isCompleted ? "text-primary" : "text-muted-foreground/50"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isCompleted
                      ? "bg-primary/20 text-primary"
                      : "bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-xs font-medium">{milestone.count}</span>
              </div>
            );
          })}
        </div>

        {/* Quality Referral Info */}
        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-sm">
          <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">What counts as a quality referral?</p>
          <p className="text-amber-700 dark:text-amber-300 text-xs">
            Your referred user must earn at least ₦1,000 NC on the platform. This ensures genuine, active users.
          </p>
        </div>

        {/* Share Section */}
        <div className="pt-3 border-t border-border space-y-3">
          <p className="text-sm font-medium text-center">
            Share your link & earn ₦100 per quality referral!
          </p>
          
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <code className="text-sm text-primary font-mono">{referralCode}</code>
          </div>
          
          <ShareButtons
            title="Join NaijaLancers"
            text={`🚀 Join me on NaijaLancers - Nigeria's trusted freelance marketplace! Use my code: ${referralCode} and start earning today.`}
            url={`/signup?ref=${referralCode}`}
            className="justify-center"
            showLabels
          />
        </div>
      </CardContent>
    </Card>
  );
};
