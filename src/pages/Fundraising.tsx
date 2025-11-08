import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Search, Heart, Users, Clock, CheckCircle, TrendingUp, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

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
    category: "medical" as "medical" | "education" | "emergency" | "business" | "community" | "personal" | "other",
    beneficiary_name: "",
    beneficiary_relationship: "",
    location: "",
    detailed_story: "",
    risks_challenges: "",
    deadline: "",
    minimum_contribution: "10",
    featured_image_url: "",
    fund_usage: [{ item: "", amount: "" }],
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

      // Validate required fields
      if (!data.title || !data.goal_amount || !data.category || !data.detailed_story) {
        throw new Error("Please fill in all required fields");
      }

      const fundBreakdown = data.fund_usage
        .filter(item => item.item && item.amount)
        .map(item => ({ item: item.item, amount: parseFloat(item.amount) }));

      const { error } = await supabase.from("fundraisings").insert({
        user_id: user.id,
        title: data.title,
        description: data.description,
        goal_amount: parseFloat(data.goal_amount),
        category: data.category,
        beneficiary_name: data.beneficiary_name || null,
        beneficiary_relationship: data.beneficiary_relationship || null,
        location: data.location || null,
        detailed_story: data.detailed_story,
        risks_challenges: data.risks_challenges || null,
        deadline: data.deadline ? new Date(data.deadline).toISOString() : null,
        minimum_contribution: parseFloat(data.minimum_contribution),
        featured_image_url: data.featured_image_url || null,
        fund_usage_breakdown: fundBreakdown,
        status: "pending",
      } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Fundraising request submitted! Awaiting admin approval." });
      setCreateDialogOpen(false);
      setFormData({
        title: "",
        description: "",
        goal_amount: "",
        category: "medical",
        beneficiary_name: "",
        beneficiary_relationship: "",
        location: "",
        detailed_story: "",
        risks_challenges: "",
        deadline: "",
        minimum_contribution: "10",
        featured_image_url: "",
        fund_usage: [{ item: "", amount: "" }],
      });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to submit fundraising request", variant: "destructive" });
    },
  });

  const addFundUsageItem = () => {
    setFormData({
      ...formData,
      fund_usage: [...formData.fund_usage, { item: "", amount: "" }],
    });
  };

  const removeFundUsageItem = (index: number) => {
    setFormData({
      ...formData,
      fund_usage: formData.fund_usage.filter((_, i) => i !== index),
    });
  };

  const updateFundUsageItem = (index: number, field: "item" | "amount", value: string) => {
    const updated = [...formData.fund_usage];
    updated[index][field] = value;
    setFormData({ ...formData, fund_usage: updated });
  };

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
            <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Fundraising Campaign</DialogTitle>
                <p className="text-sm text-muted-foreground">Fill in all details to help supporters understand your cause</p>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Basic Information */}
                <div className="space-y-4 border-b pb-4">
                  <h3 className="font-semibold">Basic Information</h3>
                  
                  <div className="space-y-2">
                    <Label>Campaign Title *</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Help John recover from surgery"
                      maxLength={100}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select value={formData.category} onValueChange={(v: any) => setFormData({ ...formData, category: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="medical">Medical & Healthcare</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="emergency">Emergency Relief</SelectItem>
                        <SelectItem value="business">Business & Startup</SelectItem>
                        <SelectItem value="community">Community Project</SelectItem>
                        <SelectItem value="personal">Personal Cause</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Short Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief summary (shown in listings)"
                      rows={2}
                      maxLength={200}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="City, State or Country"
                    />
                  </div>
                </div>

                {/* Financial Details */}
                <div className="space-y-4 border-b pb-4">
                  <h3 className="font-semibold">Financial Details</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Goal Amount (₦NC) *</Label>
                      <Input
                        type="number"
                        value={formData.goal_amount}
                        onChange={(e) => setFormData({ ...formData, goal_amount: e.target.value })}
                        placeholder="0"
                        min="100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Minimum Contribution (₦NC)</Label>
                      <Input
                        type="number"
                        value={formData.minimum_contribution}
                        onChange={(e) => setFormData({ ...formData, minimum_contribution: e.target.value })}
                        placeholder="10"
                        min="1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Campaign Deadline (Optional)</Label>
                    <Input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      min={format(new Date(), "yyyy-MM-dd")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>How Will Funds Be Used?</Label>
                    {formData.fund_usage.map((item, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="Item/Purpose"
                          value={item.item}
                          onChange={(e) => updateFundUsageItem(index, "item", e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={item.amount}
                          onChange={(e) => updateFundUsageItem(index, "amount", e.target.value)}
                          className="w-32"
                        />
                        {formData.fund_usage.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFundUsageItem(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addFundUsageItem}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>
                </div>

                {/* Beneficiary Information */}
                <div className="space-y-4 border-b pb-4">
                  <h3 className="font-semibold">Beneficiary Information</h3>
                  
                  <div className="space-y-2">
                    <Label>Beneficiary Name</Label>
                    <Input
                      value={formData.beneficiary_name}
                      onChange={(e) => setFormData({ ...formData, beneficiary_name: e.target.value })}
                      placeholder="Who will benefit from this campaign?"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Your Relationship to Beneficiary</Label>
                    <Input
                      value={formData.beneficiary_relationship}
                      onChange={(e) => setFormData({ ...formData, beneficiary_relationship: e.target.value })}
                      placeholder="e.g., Parent, Friend, Family Member, Self"
                    />
                  </div>
                </div>

                {/* Campaign Story */}
                <div className="space-y-4 border-b pb-4">
                  <h3 className="font-semibold">Campaign Story</h3>
                  
                  <div className="space-y-2">
                    <Label>Detailed Story *</Label>
                    <Textarea
                      value={formData.detailed_story}
                      onChange={(e) => setFormData({ ...formData, detailed_story: e.target.value })}
                      placeholder="Tell your story in detail. Explain the situation, why you need help, and how the funds will make a difference."
                      rows={6}
                    />
                    <p className="text-xs text-muted-foreground">
                      Be honest and detailed. Include background, current situation, and impact of support.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Risks & Challenges</Label>
                    <Textarea
                      value={formData.risks_challenges}
                      onChange={(e) => setFormData({ ...formData, risks_challenges: e.target.value })}
                      placeholder="What challenges might you face? How will you handle them?"
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Being transparent about potential risks builds trust with supporters.
                    </p>
                  </div>
                </div>

                {/* Media */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Campaign Image</h3>
                  
                  <div className="space-y-2">
                    <Label>Featured Image URL</Label>
                    <Input
                      value={formData.featured_image_url}
                      onChange={(e) => setFormData({ ...formData, featured_image_url: e.target.value })}
                      placeholder="https://..."
                    />
                    <p className="text-xs text-muted-foreground">
                      A compelling image helps your campaign stand out
                    </p>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={() => createFundraisingMutation.mutate(formData)}
                  disabled={createFundraisingMutation.isPending || !formData.title || !formData.goal_amount || !formData.detailed_story}
                >
                  {createFundraisingMutation.isPending ? "Submitting..." : "Submit for Admin Approval"}
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
                <Card key={fundraising.id} className={`hover:shadow-lg transition-shadow ${fundraising.is_demo ? "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20" : ""}`}>
                  {fundraising.featured_image_url && (
                    <div className="aspect-video overflow-hidden rounded-t-lg">
                      <img 
                        src={fundraising.featured_image_url} 
                        alt={fundraising.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {fundraising.is_demo && (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/50">
                            DEMO
                          </Badge>
                        )}
                        <Badge className={`${progress >= 100 ? 'bg-green-500' : 'bg-primary'}`}>
                          {fundraising.category || 'general'}
                        </Badge>
                        {progress >= 100 && <Badge variant="outline">Funded</Badge>}
                      </div>
                      {fundraising.is_verified && (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          Verified
                        </div>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm line-clamp-2">{fundraising.title}</h3>
                    {fundraising.location && (
                      <p className="text-xs text-muted-foreground">{fundraising.location}</p>
                    )}
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{fundraising.description}</p>
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
                  <CardFooter className="p-3 pt-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigate(`/fundraising/${fundraising.id}`)}
                    >
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
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
