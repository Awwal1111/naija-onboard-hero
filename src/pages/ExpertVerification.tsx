import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { 
  Shield, CheckCircle, Clock, AlertCircle, FileText, CreditCard, Mail, 
  Award, TrendingUp, Users, Star, Lock, Unlock, ChevronRight, ArrowLeft,
  Briefcase, BadgeCheck
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
  full_name?: string;
  profession?: string;
}

const VERIFICATION_FEE = 5000;

const VERIFICATION_BENEFITS = [
  { icon: Shield, label: 'Trust Badge', description: 'Verified badge visible on your profile and in search results' },
  { icon: TrendingUp, label: 'Higher Visibility', description: 'Rank higher in expert search and discovery' },
  { icon: Star, label: 'Priority Matching', description: 'Get matched with premium clients first' },
  { icon: Award, label: 'Boost Access', description: 'Unlock the ability to boost your profile' },
  { icon: Users, label: 'ExpertClass', description: 'Create and host live classes for students' },
  { icon: Briefcase, label: 'More Orders', description: 'Verified experts get 3x more job invites' },
];

export default function ExpertVerification() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [description, setDescription] = useState('');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['expert-verification-page', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('verification_status, verification_payment_status, verification_description, verification_submitted_at, is_expert, wallet_balance, balance_withdrawable, full_name, profession')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data as VerificationData;
    },
    enabled: !!user,
  });

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
      queryClient.invalidateQueries({ queryKey: ['expert-verification-page'] });
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

  const payFeeMutation = useMutation({
    mutationFn: async () => {
      const currentBalance = profile?.balance_withdrawable || profile?.wallet_balance || 0;
      
      if (currentBalance < VERIFICATION_FEE) {
        throw new Error('Insufficient balance');
      }

      const { error: walletError } = await supabase
        .from('profiles')
        .update({
          wallet_balance: (profile?.wallet_balance || 0) - VERIFICATION_FEE,
          balance_withdrawable: (profile?.balance_withdrawable || 0) - VERIFICATION_FEE,
          verification_payment_status: 'paid',
        })
        .eq('user_id', user!.id);
      
      if (walletError) throw walletError;

      await supabase.from('wallet_transactions').insert({
        user_id: user!.id,
        kind: 'expert_verification_fee',
        amount: -VERIFICATION_FEE,
        status: 'completed',
        reference: 'Expert Verification Fee Payment',
      });

      await supabase.from('expert_verification_payments').insert({
        user_id: user!.id,
        amount: VERIFICATION_FEE,
        status: 'completed',
        payment_method: 'wallet',
        completed_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expert-verification-page'] });
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

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-8 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Sign in Required</h2>
            <p className="text-muted-foreground mb-4">Please sign in to access expert verification.</p>
            <Button onClick={() => navigate('/login')}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const isVerified = profile?.verification_status === 'verified';
  const isSubmitted = profile?.verification_status === 'submitted';
  const isPaid = profile?.verification_payment_status === 'paid';

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-background border-b border-border px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Expert Verification</h1>
        </div>
      </header>

      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Status Banner */}
        <Card className={isVerified 
          ? "border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/5"
          : isSubmitted && isPaid 
          ? "border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-amber-500/5"
          : "border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5"
        }>
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-full ${
                isVerified ? 'bg-green-500/10' : isSubmitted && isPaid ? 'bg-yellow-500/10' : 'bg-primary/10'
              }`}>
                {isVerified ? (
                  <BadgeCheck className="h-10 w-10 text-green-500" />
                ) : isSubmitted && isPaid ? (
                  <Clock className="h-10 w-10 text-yellow-600" />
                ) : (
                  <Shield className="h-10 w-10 text-primary" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold">
                    {isVerified ? 'You\'re Verified!' : isSubmitted && isPaid ? 'Under Review' : 'Get Verified'}
                  </h2>
                  {isVerified && (
                    <Badge className="bg-green-500 text-white">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">
                  {isVerified 
                    ? 'Your expert status is verified. Enjoy all premium features!'
                    : isSubmitted && isPaid 
                    ? 'Your application is being reviewed. This usually takes 24-48 hours.'
                    : 'Verify your expertise to unlock premium features and build trust.'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Steps */}
        {!isVerified && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Verification Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium ${
                  isSubmitted ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {isSubmitted ? <CheckCircle className="h-5 w-5" /> : '1'}
                </div>
                <div className={`flex-1 h-1.5 rounded ${isSubmitted ? 'bg-primary' : 'bg-muted'}`} />
                <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium ${
                  isPaid ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {isPaid ? <CheckCircle className="h-5 w-5" /> : '2'}
                </div>
                <div className={`flex-1 h-1.5 rounded ${isVerified ? 'bg-green-500' : 'bg-muted'}`} />
                <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium ${
                  isVerified ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  {isVerified ? <CheckCircle className="h-5 w-5" /> : '3'}
                </div>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground mt-2 px-2">
                <span className={isSubmitted ? 'text-primary font-medium' : ''}>Submit Docs</span>
                <span className={isPaid ? 'text-primary font-medium' : ''}>Pay Fee</span>
                <span className={isVerified ? 'text-green-500 font-medium' : ''}>Verified</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Benefits */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Unlock className="h-5 w-5 text-primary" />
              {isVerified ? 'Your Benefits' : 'What You Unlock'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {VERIFICATION_BENEFITS.map((benefit, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className={`p-2 rounded-full ${isVerified ? 'bg-green-500/10' : 'bg-primary/10'}`}>
                    <benefit.icon className={`h-4 w-4 ${isVerified ? 'text-green-500' : 'text-primary'}`} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{benefit.label}</p>
                    <p className="text-xs text-muted-foreground">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Section */}
        {!isVerified && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Next Steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                        </ul>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Describe the documents you will submit:
                        </label>
                        <Textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="E.g., I will submit my degree, professional license, and 3 project portfolios..."
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

                      {(profile?.balance_withdrawable || profile?.wallet_balance || 0) < VERIFICATION_FEE && (
                        <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                          <p className="text-sm text-destructive">
                            Insufficient balance. Please{' '}
                            <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/wallet')}>
                              top up your wallet
                            </Button>{' '}
                            first.
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
                <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20 text-center">
                  <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <p className="font-medium">Application Under Review</p>
                  <p className="text-sm text-muted-foreground">
                    Our team is reviewing your documents. You'll be notified once approved.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Not an Expert CTA */}
        {!profile?.is_expert && (
          <Card className="border-dashed">
            <CardContent className="py-6 text-center">
              <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Not an Expert Yet?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Apply to become a verified expert and offer your services.
              </p>
              <Button onClick={() => navigate('/expert-application')}>
                Apply as Expert
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
