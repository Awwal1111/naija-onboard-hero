import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, TrendingUp } from 'lucide-react';

interface BettingFundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalance: number;
  onSuccess?: () => void;
}

const bettingProviders = [
  { value: 'Bet9ja', label: 'Bet9ja' },
  { value: 'BetKing', label: 'BetKing' },
  { value: 'BetWay', label: 'BetWay' },
  { value: '1xBet', label: '1xBet' },
  { value: 'NairaBet', label: 'NairaBet' },
  { value: 'MerryBet', label: 'MerryBet' },
  { value: 'SupaBet', label: 'SupaBet' },
  { value: 'BangBet', label: 'BangBet' },
];

export const BettingFundDialog = ({ open, onOpenChange, currentBalance, onSuccess }: BettingFundDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<string>('');
  const [customerId, setCustomerId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [showPinInput, setShowPinInput] = useState(false);

  const handleContinue = () => {
    if (!provider || !customerId || !amount) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const amountNum = parseFloat(amount);
    
    if (amountNum < 100 || amountNum > 100000) {
      toast({
        title: "Error",
        description: "Amount must be between ₦100 and ₦100,000",
        variant: "destructive",
      });
      return;
    }

    if (amountNum > currentBalance) {
      toast({
        title: "Error",
        description: `Insufficient withdrawable balance. Available: ${currentBalance} NC`,
        variant: "destructive",
      });
      return;
    }

    setShowPinInput(true);
  };

  const handleFund = async () => {
    if (pin.length !== 4) {
      toast({
        title: "Error",
        description: "Please enter your 4-digit PIN",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('fund-betting', {
        body: { 
          provider, 
          customerId, 
          amount: parseFloat(amount),
          pin
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Success",
          description: data.message || "Betting account funded successfully",
        });
        setProvider('');
        setCustomerId('');
        setAmount('');
        setPin('');
        setShowPinInput(false);
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        throw new Error(data?.error || "Funding failed");
      }
    } catch (error: any) {
      console.error('Betting funding error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fund betting account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Fund Betting Account
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="provider">Betting Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {bettingProviders.map((prov) => (
                  <SelectItem key={prov.value} value={prov.value}>
                    {prov.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerId">Customer/User ID</Label>
            <Input
              id="customerId"
              type="text"
              placeholder="Enter your betting account ID"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (NC)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Min: 100, Max: 100,000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={100}
              max={100000}
            />
            <p className="text-xs text-muted-foreground">
              Available withdrawable balance: {currentBalance} NC
            </p>
          </div>

          {!showPinInput ? (
            <Button 
              onClick={handleContinue} 
              disabled={!provider || !customerId || !amount}
              className="w-full"
            >
              Continue to PIN
            </Button>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="pin">Transaction PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  placeholder="Enter 4-digit PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                />
                <p className="text-xs text-muted-foreground">
                  Enter your PIN to confirm funding
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowPinInput(false);
                    setPin('');
                  }}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleFund} 
                  disabled={loading || pin.length !== 4}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Fund ${amount || '0'} NC`
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
