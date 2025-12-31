import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Crown, MessageSquare, Phone, Mail, Video, CheckCircle, Sparkles } from "lucide-react";

interface PremiumSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalance: number;
  isPremium: boolean;
  premiumExpiresAt?: string | null;
  onSuccess: () => void;
}

const MONTHLY_COST = 2000;

const premiumFeatures = [
  { icon: Phone, label: "SMS notifications when you receive messages" },
  { icon: Mail, label: "Email notifications for new messages" },
  { icon: MessageSquare, label: "WhatsApp button on your profile" },
  { icon: Video, label: "Google Meet link on your profile" },
  { icon: Sparkles, label: "Premium badge on your profile" },
];

export const PremiumSubscriptionDialog = ({
  open,
  onOpenChange,
  currentBalance,
  isPremium,
  premiumExpiresAt,
  onSuccess,
}: PremiumSubscriptionDialogProps) => {
  const { toast } = useToast();
  const [months, setMonths] = useState(1);
  const [loading, setLoading] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [googleMeetLink, setGoogleMeetLink] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");

  const totalCost = months * MONTHLY_COST;
  const canAfford = currentBalance >= totalCost;

  const handleSubscribe = async () => {
    if (!canAfford) {
      toast({
        title: "Insufficient Balance",
        description: `You need ₦${totalCost.toLocaleString()} NC. Current balance: ₦${currentBalance.toLocaleString()} NC`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Subscribe to premium
      const { data, error } = await supabase.rpc('subscribe_premium', {
        p_user_id: user.id,
        p_months: months,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; expires_at?: string };
      
      if (!result.success) {
        throw new Error(result.error || "Subscription failed");
      }

      // Update contact info if provided
      const updates: Record<string, string> = {};
      if (whatsappNumber) updates.whatsapp_number = whatsappNumber;
      if (googleMeetLink) updates.google_meet_link = googleMeetLink;
      if (facebookUrl) updates.facebook_url = facebookUrl;

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('profiles')
          .update(updates)
          .eq('user_id', user.id);
      }

      toast({
        title: "🎉 Premium Activated!",
        description: `Your premium subscription is active until ${new Date(result.expires_at!).toLocaleDateString()}`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Subscription error:", error);
      toast({
        title: "Subscription Failed",
        description: error.message || "Failed to activate premium",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Crown className="h-6 w-6 text-yellow-500" />
            Premium Profile
          </DialogTitle>
          <DialogDescription>
            Get notified instantly when clients message you
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Status */}
          {isPremium && premiumExpiresAt && (
            <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">Premium Active</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Expires: {new Date(premiumExpiresAt).toLocaleDateString()}
              </p>
            </div>
          )}

          {/* Features List */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Premium Features:</h4>
            {premiumFeatures.map((feature, index) => (
              <div key={index} className="flex items-center gap-3 text-sm">
                <feature.icon className="h-4 w-4 text-primary" />
                <span>{feature.label}</span>
              </div>
            ))}
          </div>

          {/* Duration Selector */}
          <div className="space-y-2">
            <Label>Subscription Duration</Label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 3, 6].map((m) => (
                <Button
                  key={m}
                  variant={months === m ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMonths(m)}
                  className="flex flex-col h-auto py-2"
                >
                  <span className="font-bold">{m} Month{m > 1 ? 's' : ''}</span>
                  <span className="text-xs opacity-70">₦{(m * MONTHLY_COST).toLocaleString()}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Contact Info (Optional) */}
          <div className="space-y-3 pt-2 border-t">
            <h4 className="font-medium text-sm">Add Contact Links (Optional)</h4>
            
            <div className="space-y-2">
              <Label htmlFor="whatsapp" className="text-xs">WhatsApp Number</Label>
              <Input
                id="whatsapp"
                placeholder="08012345678"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meet" className="text-xs">Google Meet Link</Label>
              <Input
                id="meet"
                placeholder="https://meet.google.com/..."
                value={googleMeetLink}
                onChange={(e) => setGoogleMeetLink(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="facebook" className="text-xs">Facebook Profile URL</Label>
              <Input
                id="facebook"
                placeholder="https://facebook.com/..."
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
              />
            </div>
          </div>

          {/* Balance & Subscribe */}
          <div className="pt-3 border-t space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Your Balance:</span>
              <span className={canAfford ? "text-green-600" : "text-red-500"}>
                ₦{currentBalance.toLocaleString()} NC
              </span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Total Cost:</span>
              <span>₦{totalCost.toLocaleString()} NC</span>
            </div>

            <Button
              onClick={handleSubscribe}
              disabled={loading || !canAfford}
              className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black font-medium"
            >
              {loading ? "Processing..." : isPremium ? "Extend Premium" : "Subscribe Now"}
            </Button>

            {!canAfford && (
              <p className="text-xs text-center text-red-500">
                Insufficient balance. Please deposit more funds.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
