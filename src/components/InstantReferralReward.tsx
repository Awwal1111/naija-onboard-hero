import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Gift, Copy, Sparkles, Users, CheckCircle, Loader2, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ShareButtons } from './ShareButtons';

interface InstantReferralRewardProps {
  onFirstReferralClaimed?: () => void;
}

export const InstantReferralReward = ({ onFirstReferralClaimed }: InstantReferralRewardProps) => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [referralCode, setReferralCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasClaimedInstant, setHasClaimedInstant] = useState(false);

  const referralLink = profile?.referral_code 
    ? `${window.location.origin}/signup?ref=${profile.referral_code}` 
    : '';

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Referral link copied!');
  };

  const submitReferralCode = async () => {
    if (!user || !referralCode.trim()) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-referral', {
        body: { referral_code: referralCode.trim() }
      });

      if (error) {
        toast.error('Failed to process referral');
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success(data?.message || 'Referral applied!');
      setReferralCode('');
      setHasClaimedInstant(true);
      onFirstReferralClaimed?.();
    } catch (error) {
      console.error('Referral error:', error);
      toast.error('Failed to apply referral code');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user || !profile) return null;

  return (
    <div className="space-y-4">
      {/* Reward Banner */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-accent/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gift className="h-5 w-5 text-primary" />
            Earn ₦50 Per Referral
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Both you and your friend earn ₦50 NC when they complete their profile.
          </p>
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
            <Shield className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
            <span>IP-verified to prevent abuse. Same-network referrals are blocked.</span>
          </div>
        </CardContent>
      </Card>

      {/* Apply Referral Code */}
      {!hasClaimedInstant && (
        <Card className="border-accent/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-primary" />
              Have a Referral Code?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Enter code (e.g., ABC123)"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="flex-1"
                maxLength={10}
              />
              <Button
                onClick={submitReferralCode}
                disabled={!referralCode.trim() || isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Share Your Code */}
      <Card className="border-accent/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-primary" />
            Invite Friends
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 p-2.5 bg-muted rounded-lg">
            <code className="flex-1 text-sm font-mono text-primary truncate">
              {profile.referral_code}
            </code>
            <button onClick={copyLink} className="p-2 hover:bg-background rounded-lg transition-colors">
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <ShareButtons
            title="Join NaijaLancers"
            text={`🚀 Join NaijaLancers & earn ₦50! Use my code: ${profile.referral_code}`}
            url={`/signup?ref=${profile.referral_code}`}
            className="justify-center"
            showLabels
          />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span>Both earn ₦50 when your friend completes their profile</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
