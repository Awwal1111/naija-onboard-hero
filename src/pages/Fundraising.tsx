import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Search, Heart, Users, Clock, CheckCircle, TrendingUp, Upload, X, Target, Wallet, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { usePersonalizedFundraisings } from "@/hooks/usePersonalizedDiscovery";

export default function Fundraising() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("discover");
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

  // Use personalized fundraising algorithm for discover
  const { fundraisings, loading: isLoading } = usePersonalizedFundraisings(50);

  // Fetch user's own campaigns
  const { data: myCampaigns = [] } = useQuery({
    queryKey: ['my-campaigns', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('fundraisings')
        .select('id, title, description, goal_amount, raised_amount, category, featured_image_url, deadline, backer_count, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user
  });

  // Fetch user's contributions
  const { data: myContributions = [] } = useQuery({
    queryKey: ['my-contributions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('fundraising_contributions')
        .select(`
          *,
          fundraising:fundraising_id(id, title, goal_amount, raised_amount, status, featured_image_url)
        `)
        .eq('contributor_id', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user
  });

  // Calculate stats
  const stats = {
    totalCampaigns: myCampaigns.length,
    activeCampaigns: myCampaigns.filter(c => c.status === 'approved').length,
    totalRaised: myCampaigns.reduce((sum, c) => sum + (c.raised_amount || 0), 0),
    totalContributed: myContributions.reduce((sum, c) => sum + c.amount, 0)
  };

  const createFundraisingMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user) throw new Error("Not authenticated");

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
      toast({ title: "Campaign submitted for approval!" });
      setCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['my-campaigns'] });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to create campaign", variant: "destructive" });
    },
  });

  const resetForm = () => {
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
  };

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
          .update({ raised_amount: (fundraising.raised_amount || 0) + amount })
          .eq("id", fundraisingId);
      }
    },
    onSuccess: () => {
      toast({ title: "Thank you for your contribution!" });
      queryClient.invalidateQueries({ queryKey: ["fundraisings"] });
      queryClient.invalidateQueries({ queryKey: ["my-contributions"] });
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

  const FundraisingCard = ({ campaign, showContribute = true }: { campaign: any; showContribute?: boolean }) => {
    const progress = campaign.goal_amount > 0 ? ((campaign.raised_amount || 0) / campaign.goal_amount) * 100 : 0;
    
    return (
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        {campaign.featured_image_url && (
          <div className="aspect-video bg-muted">
            <img 
              src={campaign.featured_image_url} 
              alt={campaign.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-base line-clamp-2">{campaign.title}</h3>
          <Badge variant={campaign.status === 'approved' ? 'default' : 'secondary'} className="shrink-0">
              {campaign.status}
            </Badge>
          </div>
          {campaign.category && (
            <Badge variant="outline" className="w-fit capitalize">{campaign.category}</Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground line-clamp-2">{campaign.description}</p>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Raised</span>
              <span className="font-semibold text-primary">
                ₦{(campaign.raised_amount || 0).toLocaleString()} / ₦{campaign.goal_amount.toLocaleString()}
              </span>
            </div>
            <Progress value={Math.min(progress, 100)} className="h-2" />
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {campaign.backer_count || 0} backers
            </span>
            {campaign.deadline && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(campaign.deadline), 'MMM d, yyyy')}
              </span>
            )}
          </div>
        </CardContent>
        <CardFooter className="gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => navigate(`/fundraising/${campaign.id}`)}
          >
            View Details
          </Button>
          {showContribute && campaign.status === 'approved' && (
            <Button 
              size="sm" 
              className="flex-1"
              onClick={() => {
                setSelectedFundraising(campaign);
                setContributeDialogOpen(true);
              }}
            >
              <Heart className="h-4 w-4 mr-1" />
              Support
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Fundraising</h1>
          </div>
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
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category *</Label>
                      <Select value={formData.category} onValueChange={(v: any) => setFormData({ ...formData, category: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border">
                          <SelectItem value="medical">Medical</SelectItem>
                          <SelectItem value="education">Education</SelectItem>
                          <SelectItem value="emergency">Emergency</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="community">Community</SelectItem>
                          <SelectItem value="personal">Personal</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="City, State"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Short Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief summary"
                      rows={2}
                    />
                  </div>
                </div>

                {/* Financial Details */}
                <div className="space-y-4 border-b pb-4">
                  <h3 className="font-semibold">Financial Details</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Goal Amount (NC) *</Label>
                      <Input
                        type="number"
                        value={formData.goal_amount}
                        onChange={(e) => setFormData({ ...formData, goal_amount: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Min. Contribution</Label>
                      <Input
                        type="number"
                        value={formData.minimum_contribution}
                        onChange={(e) => setFormData({ ...formData, minimum_contribution: e.target.value })}
                        placeholder="10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Deadline (Optional)</Label>
                    <Input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    />
                  </div>
                </div>

                {/* Story */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Your Story</h3>
                  
                  <div className="space-y-2">
                    <Label>Detailed Story *</Label>
                    <Textarea
                      value={formData.detailed_story}
                      onChange={(e) => setFormData({ ...formData, detailed_story: e.target.value })}
                      placeholder="Tell your story..."
                      rows={5}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Featured Image URL</Label>
                    <Input
                      value={formData.featured_image_url}
                      onChange={(e) => setFormData({ ...formData, featured_image_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={() => createFundraisingMutation.mutate(formData)}
                  disabled={createFundraisingMutation.isPending}
                >
                  {createFundraisingMutation.isPending ? "Submitting..." : "Submit Campaign"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">My Campaigns</p>
                <p className="text-lg font-bold">{stats.totalCampaigns}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-lg font-bold">{stats.activeCampaigns}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Raised</p>
                <p className="text-lg font-bold">₦{stats.totalRaised.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-pink-500/10 rounded-lg">
                <Heart className="h-4 w-4 text-pink-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Contributed</p>
                <p className="text-lg font-bold">₦{stats.totalContributed.toLocaleString()}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="my-campaigns">My Campaigns</TabsTrigger>
            <TabsTrigger value="contributions">Contributions</TabsTrigger>
          </TabsList>

          {/* Discover Tab */}
          <TabsContent value="discover" className="mt-4 space-y-4">
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
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p className="text-muted-foreground mt-2">Loading campaigns...</p>
              </div>
            ) : filteredFundraisings.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold">No campaigns found</h3>
                <p className="text-sm text-muted-foreground">Be the first to create one!</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredFundraisings.map((campaign) => (
                  <FundraisingCard key={campaign.id} campaign={campaign} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* My Campaigns Tab */}
          <TabsContent value="my-campaigns" className="mt-4">
            {myCampaigns.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold">No campaigns yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Start your first fundraising campaign</p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {myCampaigns.map((campaign) => (
                  <FundraisingCard key={campaign.id} campaign={campaign} showContribute={false} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Contributions Tab */}
          <TabsContent value="contributions" className="mt-4">
            {myContributions.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold">No contributions yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Support a campaign to help others</p>
                <Button onClick={() => setActiveTab('discover')}>
                  Browse Campaigns
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {myContributions.map((contribution: any) => (
                  <Card key={contribution.id} className="p-4">
                    <div className="flex items-center gap-4">
                      {contribution.fundraising?.featured_image_url && (
                        <img 
                          src={contribution.fundraising.featured_image_url}
                          alt=""
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{contribution.fundraising?.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(contribution.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">₦{contribution.amount.toLocaleString()}</p>
                        <Badge variant="outline" className="text-xs">Contributed</Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Contribute Dialog */}
      <Dialog open={contributeDialogOpen} onOpenChange={setContributeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Support This Campaign</DialogTitle>
          </DialogHeader>
          {selectedFundraising && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium">{selectedFundraising.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  ₦{(selectedFundraising.raised_amount || 0).toLocaleString()} raised of ₦{selectedFundraising.goal_amount.toLocaleString()}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Amount (NC)</Label>
                <Input
                  type="number"
                  value={contributeAmount}
                  onChange={(e) => setContributeAmount(e.target.value)}
                  placeholder={`Min: ${selectedFundraising.minimum_contribution || 10}`}
                  min={selectedFundraising.minimum_contribution || 10}
                />
              </div>

              <Button
                className="w-full"
                onClick={() => contributeMutation.mutate({ 
                  fundraisingId: selectedFundraising.id, 
                  amount: parseFloat(contributeAmount) 
                })}
                disabled={!contributeAmount || parseFloat(contributeAmount) < (selectedFundraising.minimum_contribution || 10) || contributeMutation.isPending}
              >
                <Heart className="h-4 w-4 mr-2" />
                {contributeMutation.isPending ? "Processing..." : `Contribute ₦${contributeAmount || 0}`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
