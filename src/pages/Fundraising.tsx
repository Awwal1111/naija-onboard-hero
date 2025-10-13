import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Search, Heart, Users, Clock, CheckCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function Fundraising() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [contributeDialogOpen, setContributeDialogOpen] = useState(false);
  const [selectedFundraising, setSelectedFundraising] = useState<any>(null);
  const [contributeAmount, setContributeAmount] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    goal_amount: "",
  });

  const { data: fundraisings = [], isLoading } = useQuery({
    queryKey: ["fundraisings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fundraisings")
        .select(`
          *,
          profiles!fundraisings_user_id_fkey(full_name, profile_picture_url)
        `)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const createFundraisingMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("fundraisings").insert({
        user_id: user.id,
        title: data.title,
        description: data.description,
        goal_amount: parseFloat(data.goal_amount),
        status: "pending",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Fundraising request submitted! Awaiting admin approval." });
      setCreateDialogOpen(false);
      setFormData({ title: "", description: "", goal_amount: "" });
    },
    onError: () => {
      toast({ title: "Failed to submit fundraising request", variant: "destructive" });
    },
  });

  const contributeMutation = useMutation({
    mutationFn: async ({ fundraisingId, amount }: { fundraisingId: string; amount: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("wallet_balance")
        .eq("user_id", user.id)
        .single();

      if (!profile || profile.wallet_balance < amount) {
        throw new Error("Insufficient balance");
      }

      await supabase
        .from("profiles")
        .update({ wallet_balance: profile.wallet_balance - amount })
        .eq("user_id", user.id);

      await supabase.from("fundraising_contributions").insert({
        fundraising_id: fundraisingId,
        contributor_id: user.id,
        amount,
      });

      const { data: fundraising } = await supabase
        .from("fundraisings")
        .select("raised_amount")
        .eq("id", fundraisingId)
        .single();

      if (fundraising) {
        await supabase
          .from("fundraisings")
          .update({ raised_amount: fundraising.raised_amount + amount })
          .eq("id", fundraisingId);
      }
    },
    onSuccess: () => {
      toast({ title: "Contribution successful! Thank you for your support." });
      queryClient.invalidateQueries({ queryKey: ["fundraisings"] });
      setContributeDialogOpen(false);
      setContributeAmount("");
    },
    onError: (error: any) => {
      toast({ title: error.message || "Contribution failed", variant: "destructive" });
    },
  });

  const filteredFundraisings = fundraisings.filter(f =>
    f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-bold">Fundraising</h1>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Create
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Fundraising Campaign</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Campaign title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your fundraising campaign"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Goal Amount (₦NC)</Label>
                  <Input
                    type="number"
                    value={formData.goal_amount}
                    onChange={(e) => setFormData({ ...formData, goal_amount: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => createFundraisingMutation.mutate(formData)}
                  disabled={createFundraisingMutation.isPending}
                >
                  Submit for Approval
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="p-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : filteredFundraisings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No fundraising campaigns found</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredFundraisings.map((fundraising: any) => {
              const progress = (fundraising.raised_amount / fundraising.goal_amount) * 100;
              const daysLeft = fundraising.deadline 
                ? Math.ceil((new Date(fundraising.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                : null;
              
              return (
                <Card key={fundraising.id}>
                  <CardHeader className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={`w-fit ${progress >= 100 ? 'bg-green-500' : 'bg-primary'}`}>
                        {progress >= 100 ? 'Funded' : 'Active'}
                      </Badge>
                      {fundraising.is_verified && (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          Verified
                        </div>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm">{fundraising.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{fundraising.description}</p>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-2">
                    <Progress value={Math.min(progress, 100)} className="h-2" />
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-primary">₦{fundraising.raised_amount.toLocaleString()}NC</span>
                      <span className="text-muted-foreground">of ₦{fundraising.goal_amount.toLocaleString()}NC</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{fundraising.backer_count || 0} backers</span>
                      </div>
                      {daysLeft !== null && daysLeft > 0 && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{daysLeft} days left</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="p-3 pt-0">
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setSelectedFundraising(fundraising);
                        setContributeDialogOpen(true);
                      }}
                      disabled={progress >= 100}
                    >
                      <Heart className="h-4 w-4 mr-1" />
                      {progress >= 100 ? 'Goal Reached' : 'Contribute'}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={contributeDialogOpen} onOpenChange={setContributeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contribute to {selectedFundraising?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Amount (₦NC)</Label>
              <Input
                type="number"
                value={contributeAmount}
                onChange={(e) => setContributeAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
            <Button
              className="w-full"
              onClick={() =>
                contributeMutation.mutate({
                  fundraisingId: selectedFundraising?.id,
                  amount: parseFloat(contributeAmount),
                })
              }
              disabled={contributeMutation.isPending || !contributeAmount}
            >
              Contribute
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
