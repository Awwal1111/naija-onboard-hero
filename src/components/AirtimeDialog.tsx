import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Phone } from 'lucide-react';

interface AirtimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalance: number;
  onSuccess?: () => void;
}

const networks = [
  { value: '01', label: 'MTN', color: 'text-yellow-600' },
  { value: '02', label: 'GLO', color: 'text-green-600' },
  { value: '03', label: '9mobile', color: 'text-emerald-600' },
  { value: '04', label: 'Airtel', color: 'text-red-600' },
];

const bonusOptions = [
  { value: '', label: 'Regular Airtime' },
  { value: '01', label: 'MTN Awuf (400% bonus)' },
  { value: '02', label: 'MTN Garabasa (1000% bonus)' },
];

export const AirtimeDialog = ({ open, onOpenChange, currentBalance, onSuccess }: AirtimeDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [network, setNetwork] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [bonusType, setBonusType] = useState<string>('');

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
    if (amountNum < 50 || amountNum > 200000) {
      toast({
        title: "Error",
        description: "Amount must be between ₦50 and ₦200,000",
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
      const { data, error } = await supabase.functions.invoke('buy-airtime', {
        body: {
          network,
          amount: amountNum,
          phone,
          ...(bonusType && network === '01' ? { bonusType } : {})
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
        setBonusType('');
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

          {network === '01' && (
            <div className="space-y-2">
              <Label htmlFor="bonus">Bonus Type</Label>
              <Select value={bonusType} onValueChange={setBonusType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bonus type" />
                </SelectTrigger>
                <SelectContent>
                  {bonusOptions.map((bonus) => (
                    <SelectItem key={bonus.value} value={bonus.value}>
                      {bonus.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
              placeholder="Min: 50, Max: 200,000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={50}
              max={200000}
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
