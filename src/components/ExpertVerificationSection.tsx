import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Shield, CheckCircle, Clock, AlertCircle, FileText, CreditCard, Mail, ExternalLink } from 'lucide-react';
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
}

const VERIFICATION_FEE = 5000; // NC

export const ExpertVerificationSection: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [description, setDescription] = useState('');

  // Fetch verification data
  const { data: profile, isLoading } = useQuery({
    queryKey: ['expert-verification', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('verification_status, verification_payment_status, verification_description, verification_submitted_at, is_expert, wallet_balance')
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
      queryClient.invalidateQueries({ queryKey: ['expert-verification'] });
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
      // Check balance
      if ((profile?.wallet_balance || 0) < VERIFICATION_FEE) {
        throw new Error('Insufficient balance');
      }

      // Deduct from wallet
      const { error: walletError } = await supabase
        .from('profiles')
        .update({
          wallet_balance: (profile?.wallet_balance || 0) - VERIFICATION_FEE,
          verification_payment_status: 'paid',
        })
        .eq('user_id', user!.id);
      
      if (walletError) throw walletError;

      // Create transaction record
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: user!.id,
          amount: VERIFICATION_FEE,
          balance_type: 'nc',
          type: 'expert_verification_fee',
          status: 'completed',
          description: 'Expert Verification Fee',
        });

      if (txError) console.error('Transaction record error:', txError);

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
      queryClient.invalidateQueries({ queryKey: ['expert-verification'] });
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
      <Card>
        <CardContent className="py-8">
          <div className="animate-pulse flex items-center gap-3">
            <div className="w-8 h-8 bg-muted rounded-full" />
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
    return null; // Only show for experts
  }

  const getStatusInfo = () => {
    switch (profile.verification_status) {
      case 'verified':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          badge: <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Verified</Badge>,
          title: 'Verified Expert',
          description: 'Your expert status has been verified. You have access to all expert benefits.',
          color: 'border-green-500/30 bg-green-500/5',
        };
      case 'submitted':
        return {
          icon: <Clock className="h-5 w-5 text-yellow-500" />,
          badge: <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Under Review</Badge>,
          title: 'Verification Pending',
          description: profile.verification_payment_status === 'paid' 
            ? 'Your documents and payment are being reviewed by our team.'
            : 'Documents submitted. Please pay the verification fee to complete your application.',
          color: 'border-yellow-500/30 bg-yellow-500/5',
        };
      default:
        return {
          icon: <AlertCircle className="h-5 w-5 text-muted-foreground" />,
          badge: <Badge variant="secondary">Unverified</Badge>,
          title: 'Unverified Expert',
          description: 'Complete verification to unlock trust badge and higher visibility.',
          color: 'border-border',
        };
    }
  };

  const status = getStatusInfo();

  return (
    <Card className={`${status.color}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Expert Verification
                {status.badge}
              </CardTitle>
              <CardDescription className="mt-1">{status.description}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Timeline */}
        <div className="flex items-center gap-2 text-sm">
          <div className={`flex items-center gap-1 ${profile.verification_status !== 'unverified' ? 'text-primary' : 'text-muted-foreground'}`}>
            <FileText className="h-4 w-4" />
            <span>Documents</span>
          </div>
          <div className="flex-1 h-px bg-border" />
          <div className={`flex items-center gap-1 ${profile.verification_payment_status === 'paid' ? 'text-primary' : 'text-muted-foreground'}`}>
            <CreditCard className="h-4 w-4" />
            <span>Payment</span>
          </div>
          <div className="flex-1 h-px bg-border" />
          <div className={`flex items-center gap-1 ${profile.verification_status === 'verified' ? 'text-primary' : 'text-muted-foreground'}`}>
            <CheckCircle className="h-4 w-4" />
            <span>Verified</span>
          </div>
        </div>

        {/* Actions based on status */}
        {profile.verification_status === 'unverified' && (
          <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                Submit Verification Documents
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit Verification Documents</DialogTitle>
                <DialogDescription>
                  To verify your expert status, please email your professional documents to:
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-primary" />
                    <span className="font-medium">support@naijalancers.name.ng</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Include your full name and registered email in the subject line.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Documents to include:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Professional certificate or license</li>
                    <li>Government-issued ID</li>
                    <li>Portfolio or work samples</li>
                    <li>Any relevant qualifications</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Briefly describe the documents you will submit:
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

        {profile.verification_status === 'submitted' && profile.verification_payment_status === 'not_paid' && (
          <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <CreditCard className="h-4 w-4 mr-2" />
                Pay Verification Fee (NC {VERIFICATION_FEE.toLocaleString()})
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Pay Verification Fee</DialogTitle>
                <DialogDescription>
                  A one-time verification fee is required to complete your expert verification.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>Verification Fee</span>
                    <span className="font-bold">NC {VERIFICATION_FEE.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Your Balance</span>
                    <span>NC {(profile.wallet_balance || 0).toLocaleString()}</span>
                  </div>
                </div>

                <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    <strong>Note:</strong> Payment does not guarantee approval. Your documents will be reviewed by our admin team.
                  </p>
                </div>

                {(profile.wallet_balance || 0) < VERIFICATION_FEE && (
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
                  disabled={(profile.wallet_balance || 0) < VERIFICATION_FEE || payFeeMutation.isPending}
                >
                  {payFeeMutation.isPending ? 'Processing...' : 'Pay Now'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {profile.verification_status === 'submitted' && profile.verification_payment_status === 'paid' && (
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
            <div className="flex items-center gap-2 text-primary mb-2">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Awaiting Admin Review</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your documents and payment have been received. Our team is reviewing your application.
            </p>
          </div>
        )}

        {profile.verification_status === 'verified' && (
          <div className="p-4 bg-green-500/5 rounded-lg border border-green-500/20">
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">Benefits Unlocked</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✓ Trust badge on your profile</li>
              <li>✓ Higher visibility in search</li>
              <li>✓ Priority client engagement</li>
              <li>✓ Enhanced profile features</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExpertVerificationSection;
