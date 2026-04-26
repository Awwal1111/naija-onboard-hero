import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Rocket, TrendingUp, Zap, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface GigBoostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gigId: string;
  gigTitle: string;
  currentBoost: number;
  onSuccess?: () => void;
}

const MIN_BOOST = 200;
const MAX_BOOST = 1000000;

export const GigBoostDialog: React.FC<GigBoostDialogProps> = ({
  open,
  onOpenChange,
  gigId,
  gigTitle,
  currentBoost = 0,
  onSuccess
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState('500');
  const [loading, setLoading] = useState(false);

  const parsedAmount = parseFloat(amount) || 0;
  const isValidAmount = parsedAmount >= MIN_BOOST && parsedAmount <= MAX_BOOST;
  const newTotalBoost = currentBoost + parsedAmount;

  const quickAmounts = [200, 500, 1000, 2000, 5000];

  const handleBoost = async () => {
    if (!user || !isValidAmount) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('boost_gig' as any, {
        p_gig_id: gigId,
        p_amount: parsedAmount,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; new_total_boost?: number };
      if (!result?.success) {
        toast({
          title: 'Boost Failed',
          description: result?.error || 'Failed to boost your gig',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Gig Boosted! 🚀',
        description: `Your gig is now boosted with ₦${(result.new_total_boost ?? newTotalBoost).toLocaleString()} total`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Boost error:', error);
      toast({
        title: 'Boost Failed',
        description: error.message || 'Failed to boost your gig',
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
            <Rocket className="h-5 w-5 text-primary" />
            Boost This Gig
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Gig Info */}
          <Card className="p-3 bg-muted/50">
            <p className="text-sm font-medium line-clamp-2">{gigTitle}</p>
            {currentBoost > 0 && (
              <Badge variant="secondary" className="mt-2 gap-1">
                <Zap className="h-3 w-3" />
                Current: ₦{currentBoost.toLocaleString()}
              </Badge>
            )}
          </Card>

          {/* Amount Input */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Boost Amount (₦)</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              min={MIN_BOOST}
              max={MAX_BOOST}
              className="text-lg font-semibold"
            />
            <div className="flex flex-wrap gap-2">
              {quickAmounts.map((amt) => (
                <Button
                  key={amt}
                  type="button"
                  variant={parsedAmount === amt ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setAmount(String(amt))}
                >
                  ₦{amt.toLocaleString()}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Minimum ₦{MIN_BOOST.toLocaleString()} — No expiration
            </p>
          </div>

          {/* How it works */}
          <Card className="p-4 bg-primary/5 border-primary/20">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-primary" />
              How ranking works
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                Higher boost = higher position in your category
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                No expiry — your boost stays forever
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-yellow-500 mt-0.5 flex-shrink-0" />
                You may drop if others boost higher
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                You can boost again anytime
              </li>
            </ul>
          </Card>

          {/* Summary */}
          {isValidAmount && (
            <div className="flex items-center justify-between py-3 border-t">
              <div>
                <p className="text-xs text-muted-foreground">New total boost</p>
                <p className="text-lg font-bold text-primary">₦{newTotalBoost.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Payment</p>
                <p className="text-lg font-bold">₦{parsedAmount.toLocaleString()}</p>
              </div>
            </div>
          )}

          <Button
            onClick={handleBoost}
            disabled={!isValidAmount || loading}
            className="w-full gap-2"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4" />
                Pay & Boost
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
