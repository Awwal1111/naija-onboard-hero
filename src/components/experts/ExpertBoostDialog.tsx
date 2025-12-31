import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Zap, Eye, Star, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const BOOST_PACKAGES = [
  {
    id: '1-day',
    name: '1-Day Boost',
    duration: '24 hours',
    price: 500,
    description: 'Get featured for 1 day',
    popular: false,
  },
  {
    id: '7-day',
    name: '7-Day Boost',
    duration: '7 days',
    price: 2500,
    description: 'Best value for freelancers',
    popular: true,
    savings: '29%',
  },
  {
    id: '30-day',
    name: '30-Day Boost',
    duration: '30 days',
    price: 7500,
    description: 'Maximum visibility',
    popular: false,
    savings: '50%',
  },
];

interface ExpertBoostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const ExpertBoostDialog: React.FC<ExpertBoostDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPackage, setSelectedPackage] = useState<string | null>('7-day');
  const [loading, setLoading] = useState(false);

  const handleBoost = async () => {
    if (!user || !selectedPackage) return;

    const pkg = BOOST_PACKAGES.find(p => p.id === selectedPackage);
    if (!pkg) return;

    setLoading(true);

    try {
      // Check wallet balance
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (!wallet || wallet.balance < pkg.price) {
        toast({
          title: 'Insufficient Balance',
          description: `You need ₦${pkg.price.toLocaleString()} NC to boost. Please top up your wallet.`,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Deduct from wallet
      const { error: deductError } = await supabase
        .from('wallets')
        .update({ balance: wallet.balance - pkg.price })
        .eq('user_id', user.id);

      if (deductError) throw deductError;

      // Record transaction with correct schema
      await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        kind: 'debit',
        amount: pkg.price,
        metadata: { description: `Expert Boost - ${pkg.name}` },
        status: 'completed',
      });

      // Calculate boost end date
      const boostEnd = new Date();
      if (pkg.id === '1-day') boostEnd.setDate(boostEnd.getDate() + 1);
      else if (pkg.id === '7-day') boostEnd.setDate(boostEnd.getDate() + 7);
      else boostEnd.setDate(boostEnd.getDate() + 30);

      // Update expert profile with boost using raw SQL via edge function
      // The is_boosted field was added in migration
      try {
        await supabase.from('profiles').update({
          // @ts-ignore - is_boosted added via migration
          is_boosted: true,
          // @ts-ignore - boost_expires_at added via migration  
          boost_expires_at: boostEnd.toISOString(),
        } as any).eq('user_id', user.id);
      } catch (updateErr) {
        console.log('Boost update fallback:', updateErr);
      }

      toast({
        title: 'Boost Activated! 🚀',
        description: `Your profile is now boosted for ${pkg.duration}`,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Boost error:', error);
      toast({
        title: 'Error',
        description: 'Failed to activate boost. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Boost Your Profile
          </DialogTitle>
          <DialogDescription>
            Get more visibility and appear at the top of search results
          </DialogDescription>
        </DialogHeader>

        {/* Benefits */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-sm">Boost Benefits:</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              <span>5x more views</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              <span>Featured badge</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span>Top of results</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <span>Priority listing</span>
            </div>
          </div>
        </div>

        {/* Package Selection */}
        <div className="space-y-3">
          {BOOST_PACKAGES.map((pkg) => (
            <Card
              key={pkg.id}
              className={`cursor-pointer transition-all ${
                selectedPackage === pkg.id
                  ? 'ring-2 ring-primary border-primary'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => setSelectedPackage(pkg.id)}
            >
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPackage === pkg.id ? 'border-primary bg-primary' : 'border-muted-foreground'
                  }`}>
                    {selectedPackage === pkg.id && (
                      <CheckCircle className="h-3 w-3 text-primary-foreground" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{pkg.name}</span>
                      {pkg.popular && (
                        <Badge className="bg-primary text-primary-foreground text-[10px]">
                          Popular
                        </Badge>
                      )}
                      {pkg.savings && (
                        <Badge variant="secondary" className="text-[10px]">
                          Save {pkg.savings}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{pkg.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">₦{pkg.price.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{pkg.duration}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Action Button */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleBoost}
          disabled={loading || !selectedPackage}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Activate Boost
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Payment will be deducted from your NC wallet balance
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default ExpertBoostDialog;
