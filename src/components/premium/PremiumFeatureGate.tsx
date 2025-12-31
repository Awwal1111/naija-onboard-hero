import { useState, ReactNode } from "react";
import { Crown, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface PremiumFeatureGateProps {
  children: ReactNode;
  isPremium: boolean;
  featureName: string;
  featureDescription?: string;
  showLockIcon?: boolean;
  className?: string;
}

const premiumBenefits = [
  "Professional contact buttons (WhatsApp, Call, Email)",
  "Video introduction on your profile",
  "Portfolio video showcase (up to 5 videos)",
  "Crown badge for visibility",
  "Priority ranking in search results",
  "Direct SMS & Email notifications",
];

export const PremiumFeatureGate = ({
  children,
  isPremium,
  featureName,
  featureDescription,
  showLockIcon = true,
  className = "",
}: PremiumFeatureGateProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const navigate = useNavigate();

  if (isPremium) {
    return <>{children}</>;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDialog(true);
  };

  return (
    <>
      <div 
        onClick={handleClick} 
        className={`relative cursor-pointer group ${className}`}
      >
        {children}
        {showLockIcon && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span>Premium</span>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Upgrade to Premium
            </DialogTitle>
            <DialogDescription>
              {featureDescription || `"${featureName}" is a premium feature. Upgrade to unlock all premium benefits!`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg p-4 border border-yellow-500/20">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Crown className="h-4 w-4 text-yellow-500" />
                Premium Benefits (₦2,000/month)
              </h4>
              <ul className="space-y-2">
                {premiumBenefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-yellow-500 mt-0.5">✓</span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDialog(false)}
              >
                Maybe Later
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
                onClick={() => {
                  setShowDialog(false);
                  navigate("/profile?upgrade=true");
                }}
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade Now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
