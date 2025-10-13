import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Gift, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

export default function Donations() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");

  const { data: adminWallet } = useQuery({
    queryKey: ["admin-wallet"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_wallet")
        .select("balance")
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const donateMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const donationAmount = parseFloat(amount);
      if (donationAmount <= 0) throw new Error("Invalid amount");

      const { data: profile } = await supabase
        .from("profiles")
        .select("wallet_balance")
        .eq("user_id", user.id)
        .single();

      if (!profile || profile.wallet_balance < donationAmount) {
        throw new Error("Insufficient balance");
      }

      // Deduct from user wallet
      await supabase
        .from("profiles")
        .update({ wallet_balance: profile.wallet_balance - donationAmount })
        .eq("user_id", user.id);

      // Add to admin wallet
      const { data: adminWalletData } = await supabase
        .from("admin_wallet")
        .select("balance")
        .single();

      if (adminWalletData) {
        await supabase
          .from("admin_wallet")
          .update({ balance: adminWalletData.balance + donationAmount })
          .eq("id", 1);
      }

      // Record donation
      await supabase.from("donations").insert({
        user_id: user.id,
        amount: donationAmount,
        message: message || null,
      });

      // Create transaction record
      await supabase.from("wallet_transactions").insert({
        user_id: user.id,
        kind: "donation",
        amount: -donationAmount,
        status: "completed",
        reference: "Donation to platform",
      });
    },
    onSuccess: () => {
      toast({ title: "Thank you for your donation! Your support means a lot." });
      queryClient.invalidateQueries({ queryKey: ["admin-wallet"] });
      setAmount("");
      setMessage("");
    },
    onError: (error: any) => {
      toast({ title: error.message || "Donation failed", variant: "destructive" });
    },
  });

  const quickAmounts = [100, 500, 1000, 5000];

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-bold">Make a Donation</h1>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2 py-6">
          <div className="flex justify-center">
            <div className="bg-pink-100 dark:bg-pink-900/20 p-6 rounded-full">
              <Gift className="h-16 w-16 text-pink-600 dark:text-pink-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold">Support Our Platform</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Your generous donations help us maintain and improve our services for everyone in the community.
          </p>
        </div>

        {adminWallet && (
          <Card className="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 border-pink-200 dark:border-pink-800">
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">Total Donations Received</p>
              <p className="text-3xl font-bold text-pink-600 dark:text-pink-400">
                ₦{adminWallet.balance.toLocaleString()}NC
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-pink-600" />
              Make Your Donation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Quick Select Amount (₦NC)</Label>
              <div className="grid grid-cols-4 gap-2">
                {quickAmounts.map((amt) => (
                  <Button
                    key={amt}
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(amt.toString())}
                    className={amount === amt.toString() ? "border-pink-600 bg-pink-50 dark:bg-pink-900/20" : ""}
                  >
                    ₦{amt}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Custom Amount (₦NC)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>

            <div className="space-y-2">
              <Label>Message (Optional)</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Leave a message of support..."
                rows={3}
              />
            </div>

            <Button
              className="w-full bg-pink-600 hover:bg-pink-700"
              onClick={() => donateMutation.mutate()}
              disabled={donateMutation.isPending || !amount || parseFloat(amount) <= 0}
            >
              <Gift className="h-4 w-4 mr-2" />
              Donate ₦{amount || 0}NC
            </Button>
          </CardContent>
        </Card>

        <div className="bg-muted p-4 rounded-lg">
          <h3 className="font-semibold text-sm mb-2">How Your Donation Helps</h3>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>• Maintaining server infrastructure</li>
            <li>• Developing new features</li>
            <li>• Supporting community programs</li>
            <li>• Providing customer support</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
