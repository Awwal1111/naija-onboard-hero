import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
  const [loading, setLoading] = useState(false);
  const [network, setNetwork] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [phone, setPhone] = useState<string>('');

  const handlePurchase = async () => {
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
        description: `Insufficient balance. Available: ${currentBalance} NC`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('buy-vtu-airtime', {
        body: { network, amount: amountNum, phone }
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
              Available balance: {currentBalance} NC
            </p>
          </div>

          <Button 
            onClick={handlePurchase} 
            disabled={loading || !network || !amount || !phone}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Purchase Airtime - ${amount || '0'} NC`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
