import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandButton } from '@/components/ui/brand-button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Gift, Copy, Share2, Sparkles, Users, CheckCircle, Loader2 } from 'lucide-react';
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
      // Find the referrer
      const { data: referrerData, error: referrerError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('referral_code', referralCode.trim().toUpperCase())
        .single();

      if (referrerError || !referrerData) {
        toast.error('Invalid referral code');
        setIsSubmitting(false);
        return;
      }

      if (referrerData.user_id === user.id) {
        toast.error('You cannot refer yourself');
        setIsSubmitting(false);
        return;
      }

      // Check if already referred
      const { data: existingRef } = await supabase
        .from('referrals')
        .select('id')
        .eq('referee_id', user.id)
        .maybeSingle();

      if (existingRef) {
        toast.error('You have already been referred');
        setIsSubmitting(false);
        return;
      }

      // Create referral with instant reward for BOTH parties
      const { error: referralError } = await supabase
        .from('referrals')
        .insert([{
          referrer_id: referrerData.user_id,
          referee_id: user.id,
          status: 'pending',
          points_earned: 0 // Main reward comes after ₦1000 NC
        }]);

      if (referralError) {
        throw referralError;
      }

      // Give instant small reward (₦25 to both)
      const instantReward = 25;
      
      // Credit referee (current user)
      await supabase.rpc('increment_wallet_balance', { 
        target_user_id: user.id, 
        amount_to_add: instantReward 
      });

      // Credit referrer
      await supabase.rpc('increment_wallet_balance', { 
        target_user_id: referrerData.user_id, 
        amount_to_add: instantReward 
      });

      // Create transaction records
      await supabase.from('transactions').insert([
        {
          user_id: user.id,
          type: 'referral_bonus',
          amount: instantReward,
          balance_type: 'non_withdrawable',
          description: `Welcome bonus - referred by ${referrerData.full_name || 'a friend'}`,
          status: 'completed'
        },
        {
          user_id: referrerData.user_id,
          type: 'referral_bonus',
          amount: instantReward,
          balance_type: 'non_withdrawable',
          description: `Instant referral bonus - new user joined`,
          status: 'completed'
        }
      ]);

      // Notify referrer
      await supabase.from('notifications').insert({
        user_id: referrerData.user_id,
        title: '🎉 New Referral!',
        message: `Someone joined using your code! You earned NC ${instantReward}. Help them earn ₦1,000 to unlock ₦100 bonus!`,
        type: 'referral'
      });

      toast.success(`Welcome bonus: NC ${instantReward} credited! Earn ₦1,000 to unlock full rewards.`);
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
      {/* Instant Reward Banner */}
      <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Earn Instantly!
            </CardTitle>
            <Badge className="bg-amber-500">NEW</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 bg-background/50 rounded-lg">
              <p className="text-2xl font-bold text-amber-600">NC 25</p>
              <p className="text-xs text-muted-foreground">Instant when you join</p>
            </div>
            <div className="p-3 bg-background/50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">NC 100</p>
              <p className="text-xs text-muted-foreground">After earning ₦1,000</p>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground text-center">
            Both you AND your referrer earn NC 25 instantly! Full NC 100 bonus unlocks when you reach ₦1,000 earnings.
          </div>
        </CardContent>
      </Card>

      {/* Apply Referral Code */}
      {!hasClaimedInstant && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Gift className="h-5 w-5 text-primary" />
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
              <BrandButton 
                onClick={submitReferralCode}
                disabled={!referralCode.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Apply'
                )}
              </BrandButton>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Share Your Code */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-primary" />
            Invite Friends
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <code className="flex-1 text-sm font-mono text-primary truncate">
              {profile.referral_code}
            </code>
            <button 
              onClick={copyLink}
              className="p-2 hover:bg-background rounded-lg transition-colors"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>

          <ShareButtons
            title="Join NaijaLancers"
            text={`🚀 Join me on NaijaLancers! Get NC 25 instantly when you sign up with my code: ${profile.referral_code}`}
            url={`/signup?ref=${profile.referral_code}`}
            className="justify-center"
            showLabels
          />

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span>Both you and your friend earn NC 25 instantly!</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
