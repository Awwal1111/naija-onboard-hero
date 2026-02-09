import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Wifi } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { useUserSecrets } from '@/hooks/useUserSecrets';

interface VTUDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalance: number;
  onSuccess?: () => void;
}

interface DataPlan {
  variation_id: string;
  service_name: string;
  service_id: string;
  data_plan: string;
  price: string;
  availability: string;
}

const networks = [
  { value: 'mtn', label: 'MTN' },
  { value: 'glo', label: 'GLO' },
  { value: '9mobile', label: '9mobile' },
  { value: 'airtel', label: 'Airtel' },
];

export const VTUDataDialog = ({ open, onOpenChange, currentBalance, onSuccess }: VTUDataDialogProps) => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [network, setNetwork] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [dataPlans, setDataPlans] = useState<DataPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<DataPlan | null>(null);
  const [pin, setPin] = useState<string>('');
  const [showPinInput, setShowPinInput] = useState(false);
  
  const { hasPin } = useUserSecrets();

  useEffect(() => {
    if (network && open) {
      fetchDataPlans();
    }
  }, [network, open]);

  const fetchDataPlans = async () => {
    setLoadingPlans(true);
    try {
      const response = await fetch(`https://vtu.ng/wp-json/api/v2/variations/data?service_id=${network}`);
      const data = await response.json();
      
      if (data.code === 'success' && data.data) {
        // Filter only available plans
        const availablePlans = data.data.filter((plan: DataPlan) => plan.availability === 'Available');
        setDataPlans(availablePlans);
      } else {
        toast({
          title: "Error",
          description: "Failed to load data plans",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching data plans:', error);
      toast({
        title: "Error",
        description: "Failed to load data plans",
        variant: "destructive",
      });
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleContinue = () => {
    if (!network || !phone || !selectedPlan) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const price = parseFloat(selectedPlan.price);

    if (price > currentBalance) {
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
      const { data, error } = await supabase.functions.invoke('buy-vtu-data', {
        body: {
          network: selectedPlan!.service_name,
          phone,
          variationId: selectedPlan!.variation_id,
          dataPlan: selectedPlan!.data_plan,
          price: parseFloat(selectedPlan!.price),
          pin
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Success",
          description: data.message || "Data purchased successfully",
        });
        setNetwork('');
        setPhone('');
        setSelectedPlan(null);
        setDataPlans([]);
        setPin('');
        setShowPinInput(false);
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        throw new Error(data?.error || "Purchase failed");
      }
    } catch (error: any) {
      console.error('Data purchase error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to purchase data",
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
            <Wifi className="h-5 w-5" />
            Buy Data
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="network">Network Provider</Label>
            <Select value={network} onValueChange={(value) => {
              setNetwork(value);
              setSelectedPlan(null);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select network" />
              </SelectTrigger>
              <SelectContent>
                {networks.map((net) => (
                  <SelectItem key={net.value} value={net.value}>
                    {net.label}
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

          {network && (
            <div className="space-y-2">
              <Label htmlFor="plan">Data Plan</Label>
              {loadingPlans ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Select 
                  value={selectedPlan?.variation_id} 
                  onValueChange={(value) => {
                    const plan = dataPlans.find(p => p.variation_id === value);
                    setSelectedPlan(plan || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select data plan" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {dataPlans.map((plan) => (
                      <SelectItem key={plan.variation_id} value={plan.variation_id}>
                        {plan.data_plan} - ₦{plan.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedPlan && (
                <p className="text-sm text-muted-foreground">
                  Price: ₦{selectedPlan.price}
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Available withdrawable balance: {currentBalance} NC
          </p>

          {!showPinInput ? (
            <Button 
              onClick={handleContinue} 
              disabled={!network || !phone || !selectedPlan}
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
                    `Purchase ₦${selectedPlan?.price}`
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
