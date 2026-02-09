import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { useUserSecrets } from '@/hooks/useUserSecrets';
import { Loader2, Phone } from 'lucide-react';

interface VTUAirtimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalance: number;
  onSuccess?: () => void;
}

const networks = [
  { value: 'MTN', label: 'MTN', color: 'text-yellow-600' },
  { value: 'Glo', label: 'GLO', color: 'text-green-600' },
  { value: '9mobile', label: '9mobile', color: 'text-emerald-600' },
  { value: 'Airtel', label: 'Airtel', color: 'text-red-600' },
];

export const VTUAirtimeDialog = ({ open, onOpenChange, currentBalance, onSuccess }: VTUAirtimeDialogProps) => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const [loading, setLoading] = useState(false);
  const [network, setNetwork] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [showPinInput, setShowPinInput] = useState(false);
  
  const { hasPin } = useUserSecrets();

  const handleContinue = () => {
    if (!network || !amount || !phone) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const amountNum = parseFloat(amount);
    const minAmount = network === 'MTN' ? 10 : 50;
    
    if (amountNum < minAmount || amountNum > 50000) {
      toast({
        title: "Error",
        description: `Amount must be between ₦${minAmount} and ₦50,000`,
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

  const handlePurchase = async () => {
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
      const { data, error } = await supabase.functions.invoke('buy-vtu-airtime', {
        body: { 
          network, 
          amount: parseFloat(amount), 
          phone,
          pin
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Success",
          description: data.message || "Airtime purchased successfully",
        });
        setNetwork('');
        setAmount('');
        setPhone('');
        setPin('');
        setShowPinInput(false);
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        throw new Error(data?.error || "Purchase failed");
      }
    } catch (error: any) {
      console.error('Airtime purchase error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to purchase airtime",
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
            <Phone className="h-5 w-5" />
            Buy Airtime
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="network">Network Provider</Label>
            <Select value={network} onValueChange={setNetwork}>
              <SelectTrigger>
                <SelectValue placeholder="Select network" />
              </SelectTrigger>
              <SelectContent>
                {networks.map((net) => (
                  <SelectItem key={net.value} value={net.value}>
                    <span className={net.color}>{net.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="08012345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={11}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (NC)</Label>
            <Input
              id="amount"
              type="number"
              placeholder={network === 'MTN' ? "Min: 10, Max: 50,000" : "Min: 50, Max: 50,000"}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={network === 'MTN' ? 10 : 50}
              max={50000}
            />
            <p className="text-xs text-muted-foreground">
              Available withdrawable balance: {currentBalance} NC
            </p>
          </div>

          {!showPinInput ? (
            <Button 
              onClick={handleContinue} 
              disabled={!network || !amount || !phone}
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
                {!hasPin ? (
                  <p className="text-xs text-destructive">
                    No PIN set. <Link to="/settings" className="underline text-primary">Set up in Settings</Link>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Enter your PIN to confirm purchase
                  </p>
                )}
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
                  onClick={handlePurchase} 
                  disabled={loading || pin.length !== 4}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Purchase ₦${amount || '0'}`
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
