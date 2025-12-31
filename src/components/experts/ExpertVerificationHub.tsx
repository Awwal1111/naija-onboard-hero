import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { 
  Shield, CheckCircle, Clock, AlertCircle, FileText, CreditCard, Mail, 
  Award, TrendingUp, Users, Star, Lock, Unlock, ChevronRight 
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface VerificationData {
  verification_status: 'unverified' | 'submitted' | 'verified';
  verification_payment_status: 'not_paid' | 'paid';
  verification_description?: string;
  verification_submitted_at?: string;
  is_expert?: boolean;
  wallet_balance?: number;
  balance_withdrawable?: number;
}

const VERIFICATION_FEE = 5000; // NC

const VERIFICATION_BENEFITS = [
  { icon: Shield, label: 'Trust Badge', description: 'Verified badge on your profile' },
  { icon: TrendingUp, label: 'Higher Visibility', description: 'Rank higher in search results' },
  { icon: Star, label: 'Priority Clients', description: 'Get matched with premium clients' },
  { icon: Award, label: 'Boost Access', description: 'Unlock profile boost feature' },
];

const UNVERIFIED_RESTRICTIONS = [
  { icon: Lock, label: 'Cannot boost profile', available: false },
  { icon: Lock, label: 'Lower search ranking', available: false },
  { icon: Lock, label: 'No verified badge', available: false },
];

export const ExpertVerificationHub: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [description, setDescription] = useState('');

  // Fetch verification data
  const { data: profile, isLoading } = useQuery({
    queryKey: ['expert-verification-hub', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('verification_status, verification_payment_status, verification_description, verification_submitted_at, is_expert, wallet_balance, balance_withdrawable')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data as VerificationData;
    },
    enabled: !!user,
  });

  // Submit documents mutation
  const submitDocsMutation = useMutation({
    mutationFn: async (desc: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          verification_status: 'submitted',
          verification_description: desc,
          verification_submitted_at: new Date().toISOString(),
        })
        .eq('user_id', user!.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expert-verification-hub'] });
      toast({
        title: 'Documents Submitted',
        description: 'Please send your documents to support@naijalancers.name.ng',
      });
      setShowSubmitDialog(false);
      setDescription('');
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to submit. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Pay verification fee mutation
  const payFeeMutation = useMutation({
    mutationFn: async () => {
      const currentBalance = profile?.balance_withdrawable || profile?.wallet_balance || 0;
      
      if (currentBalance < VERIFICATION_FEE) {
        throw new Error('Insufficient balance');
      }

      // Deduct from wallet
      const { error: walletError } = await supabase
        .from('profiles')
        .update({
          wallet_balance: (profile?.wallet_balance || 0) - VERIFICATION_FEE,
          balance_withdrawable: (profile?.balance_withdrawable || 0) - VERIFICATION_FEE,
          verification_payment_status: 'paid',
        })
        .eq('user_id', user!.id);
      
      if (walletError) throw walletError;

      // Record transaction
      await supabase
        .from('wallet_transactions')
        .insert({
          user_id: user!.id,
          kind: 'expert_verification_fee',
          amount: -VERIFICATION_FEE,
          status: 'completed',
          reference: 'Expert Verification Fee Payment',
        });

      // Record payment
      await supabase
        .from('expert_verification_payments')
        .insert({
          user_id: user!.id,
          amount: VERIFICATION_FEE,
          status: 'completed',
          payment_method: 'wallet',
          completed_at: new Date().toISOString(),
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expert-verification-hub'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({
        title: 'Payment Successful',
        description: 'Your verification fee has been paid. Await admin review.',
      });
      setShowPaymentDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Payment Failed',
        description: error.message === 'Insufficient balance' 
          ? 'Insufficient wallet balance. Please top up first.'
          : 'Payment failed. Please try again.',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8">
          <div className="animate-pulse flex items-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profile?.is_expert) {
    return null;
  }

  const isVerified = profile.verification_status === 'verified';
  const isSubmitted = profile.verification_status === 'submitted';
  const isPaid = profile.verification_payment_status === 'paid';

  // Already verified - show success state
  if (isVerified) {
    return (
      <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-emerald-500/5">
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-full">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg">Verified Expert</h3>
                <Badge className="bg-green-500 text-white">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Your expert status is verified. All premium features are unlocked.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {VERIFICATION_BENEFITS.map((benefit, i) => (
              <div key={i} className="flex items-center gap-2 text-sm p-2 bg-background rounded-lg">
                <benefit.icon className="h-4 w-4 text-green-500" />
                <span className="text-foreground">{benefit.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Expert Verification
                {isSubmitted && isPaid ? (
                  <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                    <Clock className="h-3 w-3 mr-1" />
                    Under Review
                  </Badge>
                ) : isSubmitted ? (
                  <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                    Payment Required
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Unverified
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                {isSubmitted && isPaid 
                  ? 'Your application is being reviewed by our team.'
                  : isSubmitted 
                  ? 'Complete payment to finish your verification.'
                  : 'Verify your expertise to unlock premium features.'
                }
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Steps */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
            isSubmitted ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}>
            {isSubmitted ? <CheckCircle className="h-4 w-4" /> : '1'}
          </div>
          <div className={`flex-1 h-1 rounded ${isSubmitted ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
            isPaid ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}>
            {isPaid ? <CheckCircle className="h-4 w-4" /> : '2'}
          </div>
          <div className={`flex-1 h-1 rounded ${isVerified ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
            isVerified ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
          }`}>
            {isVerified ? <CheckCircle className="h-4 w-4" /> : '3'}
          </div>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground px-2">
          <span>Submit Docs</span>
          <span>Pay Fee</span>
          <span>Verified</span>
        </div>

        {/* Benefits/Restrictions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Unlock className="h-4 w-4 text-green-500" />
              Unlock with Verification
            </h4>
            {VERIFICATION_BENEFITS.map((benefit, i) => (
              <div key={i} className="flex items-center gap-2 text-sm p-2 bg-background/50 rounded-lg">
                <benefit.icon className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">{benefit.label}</span>
              </div>
            ))}
          </div>
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Lock className="h-4 w-4 text-destructive" />
              Current Restrictions
            </h4>
            {UNVERIFIED_RESTRICTIONS.map((restriction, i) => (
              <div key={i} className="flex items-center gap-2 text-sm p-2 bg-destructive/5 rounded-lg">
                <restriction.icon className="h-4 w-4 text-destructive/70" />
                <span className="text-muted-foreground line-through">{restriction.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        {!isSubmitted && (
          <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
            <DialogTrigger asChild>
              <Button className="w-full" size="lg">
                <FileText className="h-4 w-4 mr-2" />
                Start Verification
                <ChevronRight className="h-4 w-4 ml-auto" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit Verification Documents</DialogTitle>
                <DialogDescription>
                  To verify your expert status, please email your professional documents.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-primary" />
                    <span className="font-medium">support@naijalancers.name.ng</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Include your full name and registered email in the subject line.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Required Documents:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-primary" />
                      Professional certificate or license
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-primary" />
                      Government-issued ID
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-primary" />
                      Portfolio or work samples
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-primary" />
                      Any relevant qualifications
                    </li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Describe the documents you will submit:
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="E.g., I will submit my engineering degree, professional license, and 3 project portfolios..."
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => submitDocsMutation.mutate(description)}
                  disabled={!description.trim() || submitDocsMutation.isPending}
                >
                  {submitDocsMutation.isPending ? 'Submitting...' : 'Confirm Submission'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {isSubmitted && !isPaid && (
          <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
            <DialogTrigger asChild>
              <Button className="w-full" size="lg">
                <CreditCard className="h-4 w-4 mr-2" />
                Pay Verification Fee (₦{VERIFICATION_FEE.toLocaleString()} NC)
                <ChevronRight className="h-4 w-4 ml-auto" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Pay Verification Fee</DialogTitle>
                <DialogDescription>
                  A one-time verification fee is required to complete your application.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>Verification Fee</span>
                    <span className="font-bold">₦{VERIFICATION_FEE.toLocaleString()} NC</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Your Balance</span>
                    <span>₦{(profile?.balance_withdrawable || profile?.wallet_balance || 0).toLocaleString()} NC</span>
                  </div>
                </div>

                <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    <strong>Note:</strong> Payment does not guarantee approval. Your documents will be reviewed by our admin team.
                  </p>
                </div>

                {(profile?.balance_withdrawable || profile?.wallet_balance || 0) < VERIFICATION_FEE && (
                  <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                    <p className="text-sm text-destructive">
                      Insufficient balance. Please top up your wallet first.
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => payFeeMutation.mutate()}
                  disabled={(profile?.balance_withdrawable || profile?.wallet_balance || 0) < VERIFICATION_FEE || payFeeMutation.isPending}
                >
                  {payFeeMutation.isPending ? 'Processing...' : 'Pay Now'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {isSubmitted && isPaid && (
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 text-primary mb-2">
              <Clock className="h-5 w-5" />
              <span className="font-medium">Awaiting Admin Review</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your documents and payment have been received. Our team typically reviews applications within 24-48 hours.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExpertVerificationHub;
