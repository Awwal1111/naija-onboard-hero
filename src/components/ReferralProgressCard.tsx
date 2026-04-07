import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Gift, Users, Copy } from "lucide-react";
import { ShareButtons } from "./ShareButtons";
import { toast } from "sonner";

interface ReferralProgressCardProps {
  referralCode: string;
  totalReferrals: number;
  pendingReferrals: number;
  completedReferrals: number;
  totalEarnings: number;
}

export const ReferralProgressCard = ({
  referralCode,
  totalReferrals,
  pendingReferrals,
  completedReferrals,
  totalEarnings,
}: ReferralProgressCardProps) => {
  const referralLink = `${window.location.origin}/signup?ref=${referralCode}`;
  
  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Referral link copied!');
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          Invite Friends & Earn ₦50 Each
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
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

        {/* Info */}
        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-sm">
          <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">How rewards work</p>
          <p className="text-amber-700 dark:text-amber-300 text-xs">
            You and your friend each earn ₦50 NC when they complete their profile (name, location, phone). Referrals from the same IP are blocked.
          </p>
        </div>

        {/* Share */}
        <div className="pt-2 border-t border-border space-y-3">
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
            <code className="flex-1 text-sm text-primary font-mono truncate">{referralCode}</code>
            <button onClick={copyLink} className="p-1.5 hover:bg-background rounded transition-colors">
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <ShareButtons
            title="Join NaijaLancers"
            text={`🚀 Join NaijaLancers & earn ₦50! Use my code: ${referralCode}`}
            url={`/signup?ref=${referralCode}`}
            className="justify-center"
            showLabels
          />
        </div>
      </CardContent>
    </Card>
  );
};
